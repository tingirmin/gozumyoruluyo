'use strict';
const {contextBridge, ipcRenderer, webUtils}=require('electron');
contextBridge.exposeInMainWorld('readerAPI',{
  listBooks:()=>ipcRenderer.invoke('library:list'),
  importBooks:()=>ipcRenderer.invoke('library:import'),
  importFiles:(files)=>ipcRenderer.invoke('library:import-paths',Array.from(files).map(file=>webUtils.getPathForFile(file)).filter(Boolean)),
  importPaths:(paths)=>ipcRenderer.invoke('library:import-paths',paths),
  getPathForFile:(file)=>webUtils.getPathForFile(file),
  readBook:(id)=>ipcRenderer.invoke('book:read',id),
  updateBook:(id,patch)=>ipcRenderer.invoke('book:update',id,patch),
  removeBook:(id)=>ipcRenderer.invoke('book:remove',id),
  saveCover:(id,data)=>ipcRenderer.invoke('book:cover-save',id,data),
  getCover:(id)=>ipcRenderer.invoke('book:cover-get',id),
  getSettings:()=>ipcRenderer.invoke('settings:get'),
  saveSettings:(patch)=>ipcRenderer.invoke('settings:save',patch),
  toggleFullscreen:()=>ipcRenderer.invoke('window:fullscreen'),
  exitFullscreen:()=>ipcRenderer.invoke('window:exit-fullscreen'),
  isFullscreen:()=>ipcRenderer.invoke('window:is-fullscreen'),
  openData:()=>ipcRenderer.invoke('app:open-data'),
  onLibraryChange:(callback)=>{const fn=(_event,books)=>callback(books);ipcRenderer.on('library-changed',fn);return()=>ipcRenderer.removeListener('library-changed',fn);}
});
