export function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('editorDB', 1);
  
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore('contentStore', { keyPath: 'id' });
      };
  
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  