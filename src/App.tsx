import {useCallback,useEffect,useRef,useState} from 'react';
import type {ReactNode,DragEvent} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,BookPlus,Check,ChevronLeft,ChevronRight,Columns2,FileWarning,FolderOpen,Fullscreen,Keyboard,LayoutGrid,Maximize2,Minus,MoreHorizontal,Plus,Settings2,SlidersHorizontal,Trash2, X} from 'lucide-react';
import type {PDFDocumentProxy} from 'pdfjs-dist';
import {pdfjs,makeCover} from './lib/pdf';
import type {Book,Settings,Theme} from './lib/types';
import {defaultSettings} from './lib/types';
import PdfPage from './components/PdfPage';

const themes:{id:Theme;name:string;color:string}[]=[{id:'warm',name:'Warm Paper',color:'#f5f0e6'},{id:'light',name:'Soft Light',color:'#f8f8f4'},{id:'night',name:'Night',color:'#323332'}];
function IconBtn({label,onClick,children,active=false,disabled=false}:{label:string;onClick:()=>void;children:ReactNode;active?:boolean;disabled?:boolean}){return <button title={label} aria-label={label} onClick={onClick} disabled={disabled} className={'icon-button'+(active?' active':'')}>{children}</button>}
function Cover({book}:{book:Book}){
 const [src,setSrc]=useState<string|null>(null);
 useEffect(()=>{let active=true; if(book.cover)window.readerAPI.getCover(book.id).then(v=>{if(active)setSrc(v)});return()=>{active=false}},[book.id,book.cover]);
 return <div className="book-cover">{src?<img src={src} alt=""/>:<div className="cover-placeholder"><BookOpen size={35} strokeWidth={1.15}/><span>{book.title}</span></div>}</div>
}
function Library({books,onOpen,onAdd,onRemove,onSettings,busy}:{books:Book[];onOpen:(b:Book)=>void;onAdd:()=>void;onRemove:(b:Book)=>void;onSettings:()=>void;busy:boolean}){
 const [drag,setDrag]=useState(false);
 const onDrop=async(e:DragEvent)=>{e.preventDefault();setDrag(false);const files=Array.from(e.dataTransfer.files).filter(f=>f.name.toLowerCase().endsWith('.pdf'));if(files.length)await window.readerAPI.importFiles(files);};
 return <div className="library" onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDrag(false)}} onDrop={onDrop}>
  {drag&&<div className="drop-overlay"><BookPlus size={44}/><span>PDF dosyalarını buraya bırakın</span></div>}
  <header className="library-header"><div className="brand"><div className="brand-mark"><BookOpen size={19}/></div><span><b>gozumyoruluyo</b></span></div><div className="header-right"><IconBtn label="Ayarlar" onClick={onSettings}><Settings2 size={19}/></IconBtn><button className="primary-button" onClick={onAdd} disabled={busy}><Plus size={17}/>{busy?'Ekleniyor…':'Kitap Ekle'}</button></div></header>
  <main className="library-main"><div className="section-eyebrow">KİŞİSEL KÜTÜPHANE</div><div className="library-title-row"><div><h1>Kütüphanem<span className="book-count">{books.length}</span></h1><p>Kitaplarınıza kaldığınız yerden devam edin.</p></div><span className="quiet-label"><LayoutGrid size={16}/> Kitaplık görünümü</span></div>
  {books.length===0?<div className="empty-state"><div className="empty-illustration"><BookOpen size={68} strokeWidth={.9}/></div><h2>Okuma köşeniz hazır.</h2><p>İlk PDF kitabınızı ekleyin. Kitaplarınız yalnızca bilgisayarınızda saklanır.</p><button className="primary-button" onClick={onAdd}><Plus size={17}/> İlk Kitabımı Ekle</button><small>Bir veya birden fazla PDF seçebilir ya da buraya sürükleyebilirsiniz.</small></div>:
  <div className="book-grid">{books.map(book=>{const progress=book.totalPages?Math.round(book.lastPage/book.totalPages*100):0;return <div className="book-item" key={book.id}><button className="book-open" onClick={()=>onOpen(book)}><Cover book={book}/><div className="book-info"><h3 title={book.title}>{book.title}</h3><div className="book-meta">{book.totalPages?`${book.totalPages} sayfa · ${book.lastPage}. sayfada`:'Henüz açılmadı'}</div><div className="progress-line"><div style={{width:progress+'%'}}/></div><div className="progress-caption">{book.totalPages?`%${progress} okundu`:'Okumaya başla'}</div></div></button><button className="book-remove" title="Kütüphaneden kaldır" aria-label={`${book.title} kitabını kaldır`} onClick={()=>onRemove(book)}><Trash2 size={16}/></button></div>})}</div>}
 </main><footer className="library-footer">GOZUMYORULUYO <span>·</span> Sakin bir okuma alanı</footer></div>
}
function SettingsPanel({settings,onChange,onClose,reader=false}:{settings:Settings;onChange:(patch:Partial<Settings>)=>void;onClose:()=>void;reader?:boolean}){
 return <div className="panel-backdrop" onMouseDown={onClose}><aside className="settings-panel" onMouseDown={e=>e.stopPropagation()}><div className="panel-heading"><div><div className="section-eyebrow">KİŞİSELLEŞTİRME</div><h2>Okuma ayarları</h2></div><IconBtn label="Kapat" onClick={onClose}><X size={20}/></IconBtn></div>
 <div className="panel-section"><h4>Görünüm</h4><div className="theme-options">{themes.map(t=><button className={'theme-choice'+(settings.theme===t.id?' selected':'')} key={t.id} onClick={()=>onChange({theme:t.id})}><span className="theme-circle" style={{background:t.color}}>{settings.theme===t.id&&<Check size={18}/>}</span><span>{t.name}</span></button>)}</div></div>
 <div className="panel-section"><h4>Sayfa düzeni</h4><div className="mode-options"><button className={!settings.spread?'selected':''} onClick={()=>onChange({spread:false})}><BookOpen size={18}/> Tek sayfa</button><button className={settings.spread?'selected':''} onClick={()=>onChange({spread:true})}><Columns2 size={18}/> Çift sayfa</button></div></div>
 <div className="panel-section"><div className="setting-heading"><h4>Yakınlaştırma</h4><span>%{Math.round(settings.zoom*100)}</span></div><input aria-label="Yakınlaştırma" type="range" min="0.5" max="2.5" step="0.05" value={settings.zoom} onChange={e=>onChange({zoom:Number(e.target.value)})}/><div className="range-ends"><span>%50</span><span>%250</span></div><button className="plain-action" onClick={()=>onChange({zoom:1})}>Sayfayı ekrana sığdır</button></div>
 <div className="panel-section"><div className="setting-heading"><h4>Çevre boşluğu</h4><span>{settings.margin}px</span></div><input aria-label="Çevre boşluğu" type="range" min="12" max="110" step="2" value={settings.margin} onChange={e=>onChange({margin:Number(e.target.value)})}/></div>
 <div className="panel-section"><label className="toggle-line"><span><b>Yumuşak okuma modu</b><small>PDF sayfasının parlaklığını hafifçe azaltır. Belgeyi değiştirmez.</small></span><input type="checkbox" checked={settings.soft} onChange={e=>onChange({soft:e.target.checked})}/></label><label className="toggle-line"><span><b>Menüleri otomatik gizle</b><small>Okuma sırasında dikkat dağıtıcı öğeleri azaltır.</small></span><input type="checkbox" checked={settings.toolbarAutoHide} onChange={e=>onChange({toolbarAutoHide:e.target.checked})}/></label></div>
 {reader&&<div className="shortcut-hint"><Keyboard size={17}/> ← → sayfa &nbsp; · &nbsp; F tam ekran &nbsp; · &nbsp; H menü<br/>+ / − yakınlaştır &nbsp; · &nbsp; 0 sığdır &nbsp; · &nbsp; Esc kapat</div>}
 <div className="panel-footer">Tüm ayarlar bu bilgisayarda saklanır.</div></aside></div>
}
function Reader({book,settings,onSettings,onBack,onChange,openSettings}:{book:Book;settings:Settings;onSettings:()=>void;onBack:()=>void;onChange:(patch:Partial<Settings>)=>void;openSettings:boolean}){
 const [doc,setDoc]=useState<PDFDocumentProxy|null>(null),[error,setError]=useState<string|null>(null);
 const [page,setPage]=useState(book.lastPage||1),[target,setTarget]=useState(String(book.lastPage||1));
 const [controls,setControls]=useState(true),[manualHidden,setManualHidden]=useState(false);
 const [bounds,setBounds]=useState({w:1200,h:800});
 const stageRef=useRef<HTMLDivElement>(null),hideTimer=useRef<ReturnType<typeof setTimeout>|null>(null),wheelStamp=useRef(0);
 const pageRef=useRef(page);pageRef.current=page;
 useEffect(()=>{let cancel=false;let loaded:PDFDocumentProxy|null=null;
  (async()=>{try{const bytes=await window.readerAPI.readBook(book.id);if(cancel)return;const task=pdfjs.getDocument({data:bytes,useSystemFonts:true});loaded=await task.promise;if(cancel){await loaded.destroy();return;}setDoc(loaded);const last=Math.min(Math.max(1,book.lastPage),loaded.numPages);setPage(last);setTarget(String(last));await window.readerAPI.updateBook(book.id,{totalPages:loaded.numPages,lastPage:last,openedAt:true});}catch(e){if(!cancel)setError(e instanceof Error?e.message:'PDF açılamadı.');}})();
  return()=>{cancel=true; if(loaded)void loaded.destroy();};
 },[book.id]);
 useEffect(()=>{if(!stageRef.current)return;const observer=new ResizeObserver(entries=>{const e=entries[0];if(e)setBounds({w:e.contentRect.width,h:e.contentRect.height});});observer.observe(stageRef.current);return()=>observer.disconnect()},[doc]);
 useEffect(()=>{setTarget(String(page));const id=setTimeout(()=>{void window.readerAPI.updateBook(book.id,{lastPage:page});},220);return()=>clearTimeout(id)},[page,book.id]);
 const go=useCallback((n:number)=>{if(!doc)return;setPage(Math.max(1,Math.min(doc.numPages,n)));},[doc]);
 const step=settings.spread?2:1;
 const next=()=>go(pageRef.current+step),prev=()=>go(pageRef.current-step);
 const showControls=()=>{if(manualHidden)return;setControls(true);if(hideTimer.current)clearTimeout(hideTimer.current);if(settings.toolbarAutoHide&&!openSettings)hideTimer.current=setTimeout(()=>setControls(false),3200);};
 useEffect(()=>{showControls();return()=>{if(hideTimer.current)clearTimeout(hideTimer.current)}},[settings.toolbarAutoHide,manualHidden,openSettings]);
 useEffect(()=>{
  const handler=(e:KeyboardEvent)=>{
   const el=e.target as HTMLElement; if(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
   if(openSettings&&e.key==='Escape'){e.preventDefault();onSettings();return;}
   if(openSettings)return;
   switch(e.key){
    case 'ArrowRight':e.preventDefault();next();break;
    case 'ArrowLeft':e.preventDefault();prev();break;
    case 'f':case 'F':e.preventDefault();void window.readerAPI.toggleFullscreen();break;
    case 'Escape':e.preventDefault();void window.readerAPI.exitFullscreen();break;
    case '+':case '=':e.preventDefault();onChange({zoom:Math.min(2.5,+(settings.zoom+.1).toFixed(2))});break;
    case '-':case '_':e.preventDefault();onChange({zoom:Math.max(.5,+(settings.zoom-.1).toFixed(2))});break;
    case '0':e.preventDefault();onChange({zoom:1});break;
    case 'h':case 'H':e.preventDefault();setManualHidden(h=>!h);setControls(h=>!h);break;
   }
  };window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[doc,settings.zoom,settings.spread,openSettings,onSettings,onChange]);
 const onWheel=(e:React.WheelEvent)=>{if(e.ctrlKey)return; if(Math.abs(e.deltaY)<6)return;const now=Date.now();if(now-wheelStamp.current<350)return;wheelStamp.current=now;go(pageRef.current+(e.deltaY>0?step:-step));};
 const jump=()=>{const n=Number(target);if(Number.isFinite(n))go(Math.floor(n));else setTarget(String(page));(document.activeElement as HTMLElement)?.blur();};
 const availableW=Math.max(180,bounds.w-settings.margin*2-(settings.spread?24:0));const availableH=Math.max(240,bounds.h-settings.margin*2);
 const pageWidth=settings.spread?availableW/2:availableW;
 return <div className="reader-shell" onMouseMove={showControls}>
 <div className={'reader-top reader-toolbar'+(!controls||manualHidden?' hide-ui':'')}><div className="reader-top-left"><IconBtn label="Kütüphaneye dön" onClick={onBack}><ArrowLeft size={19}/></IconBtn><div className="toolbar-divider"/><span className="reader-book-title" title={book.title}>{book.title}</span></div><div className="reader-top-right"><IconBtn label="Uzaklaştır" onClick={()=>onChange({zoom:Math.max(.5,+(settings.zoom-.1).toFixed(2))})}><Minus size={18}/></IconBtn><button className="zoom-indicator" title="Sayfayı sığdır" onClick={()=>onChange({zoom:1})}>%{Math.round(settings.zoom*100)}</button><IconBtn label="Yakınlaştır" onClick={()=>onChange({zoom:Math.min(2.5,+(settings.zoom+.1).toFixed(2))})}><Plus size={18}/></IconBtn><div className="toolbar-divider"/><IconBtn label={settings.spread?'Tek sayfa görünümü':'Çift sayfa görünümü'} active={settings.spread} onClick={()=>onChange({spread:!settings.spread})}><Columns2 size={19}/></IconBtn><IconBtn label="Okuma ayarları" onClick={onSettings}><SlidersHorizontal size={19}/></IconBtn><IconBtn label="Tam ekran" onClick={()=>void window.readerAPI.toggleFullscreen()}><Maximize2 size={18}/></IconBtn></div></div>
 {error?<div className="reader-error"><FileWarning size={44}/><h2>Kitap açılamadı</h2><p>{error}</p><button className="primary-button" onClick={onBack}>Kütüphaneye dön</button></div>:!doc?<div className="reader-loading">Kitap hazırlanıyor…</div>:<>
  <div ref={stageRef} className="reading-stage" onWheel={onWheel}>
   <button className="page-nav page-nav-left" aria-label="Önceki sayfa" onClick={prev} disabled={page===1}><ChevronLeft size={23}/></button>
   <div className={'page-spread'+(settings.spread?' double':'')}>
    <PdfPage doc={doc} pageNumber={page} zoom={settings.zoom} soft={settings.soft} availableWidth={pageWidth} availableHeight={availableH}/>
    {settings.spread&&page+1<=doc.numPages&&<PdfPage doc={doc} pageNumber={page+1} zoom={settings.zoom} soft={settings.soft} availableWidth={pageWidth} availableHeight={availableH}/>} 
   </div>
   <button className="page-nav page-nav-right" aria-label="Sonraki sayfa" onClick={next} disabled={page+step>doc.numPages}><ChevronRight size={23}/></button>
  </div>
  <div className={'reader-bottom reader-toolbar'+(!controls||manualHidden?' hide-ui':'')}><span className="reading-progress">{Math.round(Math.min(doc.numPages,page+(settings.spread?1:0))/doc.numPages*100)}% tamamlandı</span><div className="pagination"><IconBtn label="Önceki sayfa" onClick={prev} disabled={page===1}><ChevronLeft size={18}/></IconBtn><span>Sayfa</span><input type="number" aria-label="Gitmek istediğiniz sayfa" min={1} max={doc.numPages} value={target} onChange={e=>setTarget(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')jump()}} onBlur={jump}/><span className="of-pages">/ {doc.numPages}</span><IconBtn label="Sonraki sayfa" onClick={next} disabled={page+step>doc.numPages}><ChevronRight size={18}/></IconBtn></div><span className="reader-hint">← → sayfalar arasında geç</span></div>
 </>}
 </div>
}
export default function App(){
 const [books,setBooks]=useState<Book[]>([]),[settings,setSettings]=useState<Settings>(defaultSettings),[active,setActive]=useState<Book|null>(null),[panel,setPanel]=useState(false),[busy,setBusy]=useState(false),[toast,setToast]=useState<string|null>(null);
 const toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const notify=(message:string)=>{setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(null),4400)};
 useEffect(()=>{void window.readerAPI.listBooks().then(setBooks);void window.readerAPI.getSettings().then(setSettings);return window.readerAPI.onLibraryChange(setBooks)},[]);
 const updateSettings=useCallback((patch:Partial<Settings>)=>{setSettings(s=>({...s,...patch}));void window.readerAPI.saveSettings(patch).catch(()=>notify('Ayarlar kaydedilemedi.'));},[]);
 const prepare=async(items:Book[])=>{for(const b of items){if(b.totalPages)continue;try{const data=await window.readerAPI.readBook(b.id);const result=await makeCover(data);await window.readerAPI.updateBook(b.id,{totalPages:result.pages});await window.readerAPI.saveCover(b.id,result.cover);}catch(e){notify(`${b.title}: PDF önizlemesi oluşturulamadı. Kitabı açmayı deneyin.`)}}};
 const add=async()=>{setBusy(true);try{const items=await window.readerAPI.importBooks();await prepare(items);}catch(e){notify(e instanceof Error?e.message:'PDF ekleme başarısız.')}finally{setBusy(false)}};
 useEffect(()=>{const onDropPrepare=async()=>{const current=await window.readerAPI.listBooks();await prepare(current.filter(b=>b.totalPages===0));};const unsub=window.readerAPI.onLibraryChange(()=>{void onDropPrepare()});return unsub},[]);
 const remove=(b:Book)=>{if(window.confirm(`“${b.title}” kütüphaneden kaldırılsın mı?\n\nOrijinal PDF dosyası silinmeyecek.`)){void window.readerAPI.removeBook(b.id);}};
 return <div className={'app theme-'+settings.theme}>
 {active?<Reader book={active} settings={settings} onSettings={()=>setPanel(p=>!p)} onBack={()=>{setActive(null);setPanel(false)}} onChange={updateSettings} openSettings={panel}/>:<Library books={books} onOpen={setActive} onAdd={()=>void add()} onRemove={remove} onSettings={()=>setPanel(true)} busy={busy}/>}
 {panel&&<SettingsPanel settings={settings} onChange={updateSettings} onClose={()=>setPanel(false)} reader={!!active}/>}
 {toast&&<div className="toast" role="status">{toast}<button onClick={()=>setToast(null)} aria-label="Kapat"><X size={15}/></button></div>}
 </div>
}
