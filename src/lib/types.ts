export interface Book {id:string;filePath:string;title:string;totalPages:number;lastPage:number;openedAt:string|null;addedAt:string;size:number;cover:boolean}
export type Theme='warm'|'light'|'night';
export interface Settings {theme:Theme;spread:boolean;zoom:number;margin:number;soft:boolean;toolbarAutoHide:boolean}
export interface ReaderAPI {
  listBooks():Promise<Book[]>; importBooks():Promise<Book[]>; importFiles(files:File[]):Promise<Book[]>; importPaths(paths:string[]):Promise<Book[]>; getPathForFile(file:File):string;
  readBook(id:string):Promise<Uint8Array>;updateBook(id:string,patch:Partial<Omit<Book,'openedAt'>>&{openedAt?:boolean}):Promise<Book|null>;
  removeBook(id:string):Promise<void>;saveCover(id:string,data:string):Promise<boolean>;getCover(id:string):Promise<string|null>;
  getSettings():Promise<Settings>;saveSettings(patch:Partial<Settings>):Promise<Settings>;
  toggleFullscreen():Promise<boolean>;exitFullscreen():Promise<boolean>;isFullscreen():Promise<boolean>;openData():Promise<string>;
  onLibraryChange(cb:(books:Book[])=>void):()=>void;
}
declare global {interface Window {readerAPI:ReaderAPI}}
export const defaultSettings:Settings={theme:'warm',spread:false,zoom:1,margin:44,soft:false,toolbarAutoHide:true};
