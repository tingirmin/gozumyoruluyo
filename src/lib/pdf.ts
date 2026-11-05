import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
export {pdfjs};
export async function makeCover(data:Uint8Array):Promise<{pages:number;cover:string}> {
  const task=pdfjs.getDocument({data:data.slice(),useSystemFonts:true});
  const doc=await task.promise;
  try{
    const page=await doc.getPage(1);const vp=page.getViewport({scale:1});const scale=Math.min(340/vp.width,460/vp.height);
    const view=page.getViewport({scale});const canvas=document.createElement('canvas');canvas.width=Math.round(view.width);canvas.height=Math.round(view.height);
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f5f0e6';ctx.fillRect(0,0,canvas.width,canvas.height);
    await page.render({canvasContext:ctx,viewport:view}).promise;
    const cover=canvas.toDataURL('image/jpeg',.83);page.cleanup();return{pages:doc.numPages,cover};
  } finally {await doc.destroy();}
}
