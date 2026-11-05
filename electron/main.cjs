'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

let mainWindow;
let database = { books: [], settings: {} };
let dbFile;
const dev = !app.isPackaged;
const defaultSettings = { theme:'warm', spread:false, zoom:1, margin:44, soft:false, toolbarAutoHide:true };
function emitChange() { mainWindow?.webContents.send('library-changed', database.books); }
function safeNumber(n,min,max) { return Math.max(min,Math.min(max, Number(n)||min)); }
async function persist() {
  const temp = dbFile+'.tmp';
  await fsp.writeFile(temp, JSON.stringify(database,null,2), 'utf8');
  try { await fsp.rename(temp, dbFile); }
  catch (err) { if (process.platform === 'win32') { await fsp.rm(dbFile,{force:true}); await fsp.rename(temp,dbFile); } else throw err; }
}
let writing = Promise.resolve();
function enqueuePersist() { writing = writing.catch(()=>{}).then(persist); return writing; }
function publicBooks() { return database.books.map(({path: _path,...book})=>({ ...book, filePath:_path })); }
function findBook(id) { return database.books.find(b=>b.id===id); }
function createWindow() {
  mainWindow = new BrowserWindow({width:1440,height:940,minWidth:850,minHeight:570,backgroundColor:'#EAE6DC',title:'gozumyoruluyo',autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  mainWindow.webContents.on('will-navigate',(e)=>e.preventDefault());
  if (dev) mainWindow.loadURL('http://127.0.0.1:5173');
  else mainWindow.loadFile(path.join(__dirname,'../dist/index.html'));
}
app.whenReady().then(async()=>{
  dbFile=path.join(app.getPath('userData'),'library.json');
  // One-time migration from the earlier Elegant Reader desktop identity.
  // The new name changes Electron's userData directory; keep existing local reading progress.
  try {
    const previousDb = path.join(app.getPath('appData'), 'Elegant Reader', 'library.json');
    if (!fs.existsSync(dbFile) && fs.existsSync(previousDb)) {
      await fsp.mkdir(path.dirname(dbFile), { recursive: true });
      await fsp.copyFile(previousDb, dbFile, fs.constants.COPYFILE_EXCL);
    }
  } catch (err) { console.warn('Eski okuma verileri aktarılamadı:', err.message); }

  try {const loaded=JSON.parse(await fsp.readFile(dbFile,'utf8')); if(Array.isArray(loaded.books)) database.books=loaded.books; database.settings=loaded.settings||{};} catch{}
  database.settings={...defaultSettings,...database.settings};
  ipcMain.handle('library:list',()=>publicBooks());
  ipcMain.handle('settings:get',()=>database.settings);
  ipcMain.handle('settings:save',async(_e,patch)=>{
    const allowed=['theme','spread','zoom','margin','soft','toolbarAutoHide'];
    if(!patch || typeof patch!=='object') return database.settings;
    for(const key of allowed){ if(!(key in patch))continue;
      if(key==='theme' && ['warm','light','night'].includes(patch[key]))database.settings[key]=patch[key];
      else if(key==='zoom')database.settings.zoom=safeNumber(patch.zoom,.5,2.5);
      else if(key==='margin')database.settings.margin=safeNumber(patch.margin,12,110);
      else if(['spread','soft','toolbarAutoHide'].includes(key)&&typeof patch[key]==='boolean')database.settings[key]=patch[key];
    }
    await enqueuePersist();return database.settings;
  });
  ipcMain.handle('library:import',async()=>{
    const result=await dialog.showOpenDialog(mainWindow,{title:'PDF kitapları seç',properties:['openFile','multiSelections'],filters:[{name:'PDF kitapları',extensions:['pdf']}]});
    if(result.canceled)return[];
    return importFiles(result.filePaths);
  });
  ipcMain.handle('library:import-paths',async(_e,paths)=>{
    if(!Array.isArray(paths)||paths.length>100)return[];
    return importFiles(paths.filter(p=>typeof p==='string'));
  });
  async function importFiles(paths){
    const added=[];
    for(const file of paths){
      try{
        if(path.extname(file).toLowerCase()!=='.pdf')continue;
        const stat=await fsp.stat(file); if(!stat.isFile())continue;
        const canonical=await fsp.realpath(file);
        const existing=database.books.find(b=>b.path===canonical);
        if(existing){ added.push({...existing,filePath:existing.path}); continue; }
        const fd=await fsp.open(canonical,'r');let sig=Buffer.alloc(5);
        try {await fd.read(sig,0,5,0);} finally {await fd.close();}
        if(sig.toString()!=='%PDF-')continue;
        const book={id:crypto.randomUUID(),path:canonical,title:path.basename(file,'.pdf'),totalPages:0,lastPage:1,openedAt:null,addedAt:new Date().toISOString(),size:stat.size,cover:false};
        database.books.unshift(book); added.push({...book,filePath:canonical});
      }catch(e){console.warn('Could not import',e.message)}
    }
    if(added.length){await enqueuePersist(); emitChange();}
    return added;
  }
  ipcMain.handle('book:read',async(_e,id)=>{
    const book=findBook(id); if(!book)throw Error('Kitap kütüphanede bulunamadı.');
    try{
      const bytes=await fsp.readFile(book.path);
      // Return a typed array; never expose unrestricted filesystem APIs to renderer.
      return new Uint8Array(bytes);
    }catch(e){if(e.code==='ENOENT')throw Error('PDF bulunamadı. Dosya taşınmış veya silinmiş olabilir.');throw Error('PDF okunamadı: '+e.message);}
  });
  ipcMain.handle('book:update',async(_e,id,patch)=>{
    const b=findBook(id); if(!b)return null;
    if(Number.isFinite(patch?.totalPages))b.totalPages=Math.floor(safeNumber(patch.totalPages,1,100000));
    if(Number.isFinite(patch?.lastPage))b.lastPage=Math.floor(safeNumber(patch.lastPage,1,b.totalPages||100000));
    if(patch?.openedAt===true)b.openedAt=new Date().toISOString();
    if(typeof patch?.title==='string'&&patch.title.trim()&&patch.title.length<300)b.title=patch.title.trim();
    await enqueuePersist();emitChange();return {...b,filePath:b.path};
  });
  ipcMain.handle('book:remove',async(_e,id)=>{
    const old=findBook(id);if(!old)return;
    database.books=database.books.filter(b=>b.id!==id);
    await fsp.rm(path.join(app.getPath('userData'),'covers',id+'.jpg'),{force:true}).catch(()=>{});
    await enqueuePersist();emitChange();
  });
  ipcMain.handle('book:cover-save',async(_e,id,data)=>{
    const b=findBook(id); if(!b||typeof data!=='string'||!data.startsWith('data:image/jpeg;base64,')||data.length>3_000_000)return false;
    const dir=path.join(app.getPath('userData'),'covers');await fsp.mkdir(dir,{recursive:true});
    await fsp.writeFile(path.join(dir,id+'.jpg'),Buffer.from(data.slice('data:image/jpeg;base64,'.length),'base64'));
    b.cover=true;await enqueuePersist();emitChange();return true;
  });
  ipcMain.handle('book:cover-get',async(_e,id)=>{
    const b=findBook(id);if(!b?.cover)return null;
    try{return 'data:image/jpeg;base64,'+fs.readFileSync(path.join(app.getPath('userData'),'covers',id+'.jpg')).toString('base64');}catch{return null;}
  });
  ipcMain.handle('window:fullscreen',()=>{const next=!mainWindow.isFullScreen();mainWindow.setFullScreen(next);return next;});
  ipcMain.handle('window:exit-fullscreen',()=>{if(mainWindow.isFullScreen())mainWindow.setFullScreen(false);return mainWindow.isFullScreen();});
  ipcMain.handle('window:is-fullscreen',()=>mainWindow.isFullScreen());
  ipcMain.handle('app:open-data',()=>shell.openPath(app.getPath('userData')));
  createWindow();
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
