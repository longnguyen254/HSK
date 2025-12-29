
import { Word, Folder } from '../types';

const DB_NAME = 'ZhongwenMasteryDB';
const WORD_STORE = 'words';
const FOLDER_STORE = 'folders';
const DB_VERSION = 3;

export class DBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject('Trình duyệt của bạn không hỗ trợ IndexedDB.');
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(WORD_STORE)) {
          db.createObjectStore(WORD_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(FOLDER_STORE)) {
          db.createObjectStore(FOLDER_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        reject('IndexedDB error: ' + (event.target as IDBOpenDBRequest).error);
      };
    });
  }

  /**
   * Lấy toàn bộ dữ liệu để backup một cách an toàn nhất
   */
  async getFullBackup(): Promise<{ words: Word[], folders: Folder[] }> {
    const words = await this.getAllWords();
    const folders = await this.getAllFolders();
    return { words, folders };
  }

  /**
   * Nhập dữ liệu hàng loạt: Xóa sạch và nạp mới trong 1 transaction
   */
  async importData(words: Word[], folders: Folder[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Database chưa được khởi tạo');
      
      const transaction = this.db.transaction([WORD_STORE, FOLDER_STORE], 'readwrite');
      const wordStore = transaction.objectStore(WORD_STORE);
      const folderStore = transaction.objectStore(FOLDER_STORE);

      transaction.onerror = (e) => {
        console.error("Import transaction failed:", e);
        reject(new Error("Không thể ghi dữ liệu vào Database."));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      // Xóa sạch dữ liệu cũ trước khi nạp mới
      wordStore.clear();
      folderStore.clear();

      // Nạp thư mục trước
      if (Array.isArray(folders)) {
        folders.forEach(f => {
          if (f && f.id) folderStore.add(f);
        });
      }
      
      // Nạp từ vựng
      if (Array.isArray(words)) {
        words.forEach(w => {
          if (w && w.id) wordStore.add(w);
        });
      }
    });
  }

  async getAllWords(): Promise<Word[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const transaction = this.db.transaction(WORD_STORE, 'readonly');
      const store = transaction.objectStore(WORD_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveWord(word: Word): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(WORD_STORE, 'readwrite');
      const store = transaction.objectStore(WORD_STORE);
      const request = store.put(word);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteWord(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(WORD_STORE, 'readwrite');
      const store = transaction.objectStore(WORD_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveAllWords(words: Word[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(WORD_STORE, 'readwrite');
      const store = transaction.objectStore(WORD_STORE);
      store.clear();
      words.forEach(word => store.add(word));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getAllFolders(): Promise<Folder[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const transaction = this.db.transaction(FOLDER_STORE, 'readonly');
      const store = transaction.objectStore(FOLDER_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveFolder(folder: Folder): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(FOLDER_STORE, 'readwrite');
      const store = transaction.objectStore(FOLDER_STORE);
      const request = store.put(folder);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFolder(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(FOLDER_STORE, 'readwrite');
      const store = transaction.objectStore(FOLDER_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new DBService();
