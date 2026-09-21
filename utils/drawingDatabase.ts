// IndexedDB client-side database for robust, quota-free storage of technical drawing plans & project models
const DB_NAME = 'QS_Nexus_Database';
const DB_VERSION = 1;
const DRAWING_STORE = 'drawings';
const PROJECT_STORE = 'projects';

interface StoredDrawing {
  projectId: string;
  dataUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  updatedAt: string;
}

interface StoredProject {
  projectId: string;
  components: any[];
  calibration?: any;
  updatedAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(DRAWING_STORE)) {
        db.createObjectStore(DRAWING_STORE, { keyPath: 'projectId' });
      }
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: 'projectId' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result as IDBDatabase);
    };

    request.onerror = (event: any) => {
      console.warn('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Save technical drawing plan into IndexedDB database
 */
export async function saveDrawingToDb(
  projectId: string,
  dataUrl: string,
  meta?: { fileName?: string; fileSize?: number; mimeType?: string }
): Promise<boolean> {
  const record: StoredDrawing = {
    projectId,
    dataUrl,
    fileName: meta?.fileName || 'plan-drawing.jpg',
    fileSize: meta?.fileSize || dataUrl.length,
    mimeType: meta?.mimeType || 'image/jpeg',
    updatedAt: new Date().toISOString()
  };

  // 1. Store in IndexedDB
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([DRAWING_STORE], 'readwrite');
      const store = tx.objectStore(DRAWING_STORE);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB drawing write failed, relying on localStorage fallback:', err);
  }

  // 2. Fallback mirror in localStorage (metadata & small images)
  try {
    localStorage.setItem(`iseeqs_drawing_${projectId}`, dataUrl);
    localStorage.setItem(`iseeqs_drawing_meta_${projectId}`, JSON.stringify({
      fileName: record.fileName,
      updatedAt: record.updatedAt
    }));
    localStorage.setItem(`iseeqs_target_url_${projectId}`, `target-${projectId}`);
  } catch (err) {
    console.warn('LocalStorage quota limit reached for drawing string:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('iseeqs_database_updated', {
      detail: { type: 'drawing', projectId }
    }));
  }

  return true;
}

/**
 * Retrieve drawing plan dataUrl from database
 */
export async function getDrawingFromDb(projectId: string): Promise<string | null> {
  // 1. Try IndexedDB first
  try {
    const db = await getDb();
    const result = await new Promise<StoredDrawing | null>((resolve) => {
      const tx = db.transaction([DRAWING_STORE], 'readonly');
      const store = tx.objectStore(DRAWING_STORE);
      const req = store.get(projectId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (result && result.dataUrl) {
      return result.dataUrl;
    }
  } catch (err) {
    console.warn('IndexedDB drawing read error:', err);
  }

  // 2. Fallback to localStorage
  try {
    const local = localStorage.getItem(`iseeqs_drawing_${projectId}`);
    if (local) return local;
  } catch {}

  return null;
}

/**
 * Remove drawing from database
 */
export async function removeDrawingFromDb(projectId: string): Promise<boolean> {
  try {
    const db = await getDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction([DRAWING_STORE], 'readwrite');
      const store = tx.objectStore(DRAWING_STORE);
      const req = store.delete(projectId);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {}

  try {
    localStorage.removeItem(`iseeqs_drawing_${projectId}`);
    localStorage.removeItem(`iseeqs_drawing_meta_${projectId}`);
    localStorage.removeItem(`iseeqs_target_url_${projectId}`);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('iseeqs_database_updated', {
      detail: { type: 'drawing_removed', projectId }
    }));
  }

  return true;
}

/**
 * Save full project components & calibration into database
 */
export async function saveProjectToDb(
  projectId: string,
  components: any[],
  calibration?: any
): Promise<boolean> {
  const record: StoredProject = {
    projectId,
    components,
    calibration,
    updatedAt: new Date().toISOString()
  };

  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([PROJECT_STORE], 'readwrite');
      const store = tx.objectStore(PROJECT_STORE);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB project write error:', err);
  }

  try {
    localStorage.setItem(`iseeqs_project_${projectId}`, JSON.stringify(components));
    if (calibration) {
      localStorage.setItem(`iseeqs_calib_${projectId}`, JSON.stringify(calibration));
    }
  } catch (err) {
    console.warn('LocalStorage project write error:', err);
  }

  return true;
}

/**
 * Load project components from database
 */
export async function getProjectFromDb(projectId: string): Promise<{ components: any[]; calibration?: any } | null> {
  try {
    const db = await getDb();
    const result = await new Promise<StoredProject | null>((resolve) => {
      const tx = db.transaction([PROJECT_STORE], 'readonly');
      const store = tx.objectStore(PROJECT_STORE);
      const req = store.get(projectId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (result && Array.isArray(result.components)) {
      return { components: result.components, calibration: result.calibration };
    }
  } catch {}

  try {
    const local = localStorage.getItem(`iseeqs_project_${projectId}`);
    if (local) {
      const components = JSON.parse(local);
      const calib = localStorage.getItem(`iseeqs_calib_${projectId}`);
      return { components, calibration: calib ? JSON.parse(calib) : undefined };
    }
  } catch {}

  return null;
}
