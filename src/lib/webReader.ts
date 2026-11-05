import type { Book, ReaderAPI, Settings } from './types';
import { defaultSettings } from './types';

// IndexedDB stores PDF contents, metadata and cover previews on this device only.
// No files are transmitted to the web host.
const DB_NAME = 'gozumyoruluyo-web-v1';
const SETTINGS_KEY = 'gozumyoruluyo-settings-v1';
let database: Promise<IDBDatabase> | undefined;
const listeners = new Set<(books: Book[]) => void>();

function db(): Promise<IDBDatabase> {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const instance = request.result;
      instance.createObjectStore('books', { keyPath: 'id' });
      instance.createObjectStore('files');
      instance.createObjectStore('covers');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Tarayıcı depolaması açılamadı.'));
  });
  return database;
}

async function storeRequest<T>(store: string, mode: IDBTransactionMode, operation: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, mode);
    const request = operation(tx.objectStore(store));
    let value: T;
    request.onsuccess = () => { value = request.result; };
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error ?? new Error('Yerel kayıt başarısız.'));
    tx.onabort = () => reject(tx.error ?? new Error('Yerel kayıt iptal edildi.'));
  });
}

const get = <T>(store: string, key: string) => storeRequest<T | undefined>(store, 'readonly', s => s.get(key));
const put = <T>(store: string, value: T, key?: string) => storeRequest<IDBValidKey>(store, 'readwrite', s => key ? s.put(value, key) : s.put(value));
const remove = (store: string, key: string) => storeRequest<undefined>(store, 'readwrite', s => s.delete(key));

async function listBooks(): Promise<Book[]> {
  const items = await storeRequest<Book[]>('books', 'readonly', s => s.getAll());
  return items.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}
async function announce(): Promise<void> {
  const books = await listBooks();
  for (const listener of listeners) listener(books);
}

async function importFiles(files: File[]): Promise<Book[]> {
  const added: Book[] = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.pdf')) continue;
    if (file.size < 5) continue;
    const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
    if (signature !== '%PDF-') continue;
    const books = await listBooks();
    const existing = books.find(b => b.title === file.name.replace(/\.pdf$/i, '') && b.size === file.size);
    if (existing) { added.push(existing); continue; }
    const id = crypto.randomUUID();
    const book: Book = { id, filePath: '', title: file.name.replace(/\.pdf$/i, ''), totalPages: 0,
      lastPage: 1, openedAt: null, addedAt: new Date().toISOString(), size: file.size, cover: false };
    // Commit the PDF and metadata atomically to avoid orphaned entries on quota failures.
    const instance = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = instance.transaction(['files', 'books'], 'readwrite');
      tx.objectStore('files').put(file, id);
      tx.objectStore('books').put(book);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('PDF kaydedilemedi. Depolama alanını kontrol edin.'));
      tx.onabort = () => reject(tx.error ?? new Error('PDF kaydedilemedi.'));
    });
    added.push(book);
  }
  if (added.length) await announce();
  return added;
}
function openPicker(): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.pdf,application/pdf'; input.multiple = true;
    input.style.display = 'none'; document.body.append(input);
    let settled = false;
    const finish = (files: File[]) => { if (settled) return; settled = true; input.remove(); resolve(files); };
    input.addEventListener('change', () => finish(Array.from(input.files ?? [])), { once: true });
    // Modern browsers fire cancel on file-picker dismissal.
    input.addEventListener('cancel', () => finish([]), { once: true });
    input.click();
  });
}
function loadSettings(): Settings {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return { ...defaultSettings, ...value };
  } catch { return { ...defaultSettings }; }
}

export const webReader: ReaderAPI = {
  listBooks,
  async importBooks() { return importFiles(await openPicker()); },
  importFiles,
  async importPaths() { throw new Error('Tarayıcıda dosya yollarına erişilemiyor. PDF dosyalarını sürükleyin.'); },
  getPathForFile() { return ''; },
  async readBook(id) {
    const file = await get<Blob>('files', id);
    if (!file) throw new Error('PDF bu tarayıcının depolamasında bulunamadı. Tekrar ekleyin.');
    return new Uint8Array(await file.arrayBuffer());
  },
  async updateBook(id, patch) {
    const old = await get<Book>('books', id);
    if (!old) return null;
    const next: Book = { ...old };
    if (typeof patch.totalPages === 'number' && Number.isFinite(patch.totalPages)) next.totalPages = Math.max(1, Math.floor(patch.totalPages));
    if (typeof patch.lastPage === 'number' && Number.isFinite(patch.lastPage)) next.lastPage = Math.max(1, Math.min(next.totalPages || 100000, Math.floor(patch.lastPage)));
    if (patch.openedAt === true) next.openedAt = new Date().toISOString();
    if (typeof patch.title === 'string' && patch.title.trim()) next.title = patch.title.trim().slice(0, 299);
    await put('books', next);
    await announce();
    return next;
  },
  async removeBook(id) {
    const instance = await db();
    await new Promise<void>((resolve, reject) => {
      const tx = instance.transaction(['books', 'files', 'covers'], 'readwrite');
      for (const name of ['books', 'files', 'covers']) tx.objectStore(name).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await announce();
  },
  async saveCover(id, data) {
    const book = await get<Book>('books', id);
    if (!book || !data.startsWith('data:image/jpeg;base64,')) return false;
    await put('covers', data, id);
    book.cover = true;
    await put('books', book);
    await announce();
    return true;
  },
  async getCover(id) { return await get<string>('covers', id) ?? null; },
  async getSettings() { return loadSettings(); },
  async saveSettings(patch) { const settings = { ...loadSettings(), ...patch }; localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); return settings; },
  async toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    return !!document.fullscreenElement;
  },
  async exitFullscreen() { if (document.fullscreenElement) await document.exitFullscreen(); return !!document.fullscreenElement; },
  async isFullscreen() { return !!document.fullscreenElement; },
  async openData() { return 'Tarayıcı depolaması (IndexedDB)'; },
  onLibraryChange(callback) { listeners.add(callback); return () => { listeners.delete(callback); }; },
};
