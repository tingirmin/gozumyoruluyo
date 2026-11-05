import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';

export default function PdfPage({doc,pageNumber,zoom,soft,availableWidth,availableHeight}:{doc:PDFDocumentProxy;pageNumber:number;zoom:number;soft:boolean;availableWidth:number;availableHeight:number}){
 const canvasRef=useRef<HTMLCanvasElement>(null);const taskRef=useRef<RenderTask|null>(null);
 const [state,setState]=useState<{w:number;h:number;error?:string}>({w:500,h:700});
 useEffect(()=>{
  if(pageNumber<1||pageNumber>doc.numPages)return;
  let disposed=false;let pageCleanup:(()=>void)|undefined;
  const render=async()=>{
   try{
    const page=await doc.getPage(pageNumber);if(disposed)return;
    const base=page.getViewport({scale:1});
    const fit=Math.min(availableWidth/base.width,availableHeight/base.height);
    const scale=Math.max(.05,fit*zoom);
    const cssWidth=Math.round(base.width*scale),cssHeight=Math.round(base.height*scale);
    setState({w:cssWidth,h:cssHeight});
    const canvas=canvasRef.current;if(!canvas)return;
    const pixelRatio=Math.min(window.devicePixelRatio||1,2.25);
    canvas.width=Math.max(1,Math.round(cssWidth*pixelRatio));canvas.height=Math.max(1,Math.round(cssHeight*pixelRatio));
    canvas.style.width=cssWidth+'px';canvas.style.height=cssHeight+'px';
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
    const viewport=page.getViewport({scale:scale*pixelRatio});
    const task=page.render({canvasContext:ctx,viewport});taskRef.current=task;
    await task.promise;if(disposed)return;
    pageCleanup=()=>page.cleanup();
   }catch(e){if(!disposed&&!(e instanceof Error&&e.name==='RenderingCancelledException'))setState(s=>({...s,error:'Bu sayfa görüntülenemedi.'}));}
  };void render();
  return()=>{disposed=true;taskRef.current?.cancel();taskRef.current=null;pageCleanup?.();};
 },[doc,pageNumber,zoom,availableWidth,availableHeight]);
 if(pageNumber<1||pageNumber>doc.numPages)return <div className="blank-page"/>;
 return <div className={'pdf-paper'+(soft?' soft-page':'')} style={{width:state.w,height:state.h}}>
  <canvas ref={canvasRef} aria-label={`${pageNumber}. sayfa`} />
  {state.error&&<div className="page-error">{state.error}</div>}
 </div>;
}
