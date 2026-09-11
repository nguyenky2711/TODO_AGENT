import type { Database } from 'sql.js';

const DB_STORAGE_KEY = 'personal_productivity_agent_db';

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

// IndexedDB persistence helpers
const IDB_NAME = 'ProductivityAgentIDB';
const IDB_STORE = 'db_files';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadFromIDB(): Promise<Uint8Array | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(DB_STORAGE_KEY);
      req.onsuccess = () => {
        if (req.result && req.result instanceof Uint8Array) {
          resolve(req.result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Could not load from IndexedDB, fallback to fresh DB:', err);
    return null;
  }
}

async function saveToIDB(data: Uint8Array): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(data, DB_STORAGE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('IndexedDB transaction aborted'));
    });
  } catch (err) {
    console.warn('Could not save to IndexedDB:', err);
  }
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  target_date TEXT,
  status TEXT DEFAULT 'ACTIVE',
  color TEXT DEFAULT '#4f46e5',
  progress INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id TEXT,
  start_date TEXT,
  start_time TEXT,
  end_date TEXT,
  end_time TEXT,
  due_date TEXT,
  priority TEXT DEFAULT 'MEDIUM',
  status TEXT DEFAULT 'TODO',
  color TEXT,
  reminder_minutes INTEGER DEFAULT 10,
  repeat_rule TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (task_id, tag_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_notes (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  content TEXT NOT NULL,
  task_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_memory (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_actions (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  description TEXT NOT NULL,
  source TEXT DEFAULT 'AGENT',
  created_at TEXT NOT NULL,
  is_undone INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let initFn = (window as any).initSqlJs;
    if (!initFn) {
      try {
        const mod = await import('sql.js');
        initFn = mod.default || (mod as any).initSqlJs || mod;
      } catch (e) {
        console.warn('Module import of sql.js failed, waiting for window.initSqlJs...', e);
      }
    }

    if (!initFn && typeof window !== 'undefined' && !(window as any).initSqlJs) {
      // Wait up to 1 second for script tag to finish executing
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 100));
        if ((window as any).initSqlJs) {
          initFn = (window as any).initSqlJs;
          break;
        }
      }
    }

    if (!initFn) {
      throw new Error('Không thể khởi tạo SQLite WASM (initSqlJs not found)');
    }

    const SQL = await initFn({
      locateFile: (file: string) => `./${file}`,
    });

    const savedData = await loadFromIDB();
    let db: Database;
    if (savedData && savedData.length > 0) {
      try {
        db = new SQL.Database(savedData);
      } catch (err) {
        console.error('Error opening saved DB, creating fresh DB:', err);
        db = new SQL.Database();
      }
    } else {
      db = new SQL.Database();
    }

    // Execute Schema
    db.run(SCHEMA_SQL);
    try {
      db.run("ALTER TABLE tasks ADD COLUMN color TEXT;");
    } catch (e) {
      // Column already exists, safe to ignore
    }
    try {
      db.run(`CREATE TABLE IF NOT EXISTS task_notes (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        content TEXT NOT NULL,
        task_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );`);
    } catch (e) {}
    dbInstance = db;
    return db;
  })();

  return initPromise;
}

export async function persistDatabase(): Promise<void> {
  if (!dbInstance) return;
  const data = dbInstance.export();
  await saveToIDB(data);
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDatabase();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export async function run(sql: string, params: any[] = []): Promise<void> {
  const db = await getDatabase();
  db.run(sql, params);
  await persistDatabase();
}

export async function getDatabaseSize(): Promise<{ bytes: number; formatted: string }> {
  try {
    const db = await getDatabase();
    const data = db.export();
    const bytes = data.byteLength;
    if (bytes < 1024) return { bytes, formatted: `${bytes} B` };
    if (bytes < 1024 * 1024) return { bytes, formatted: `${(bytes / 1024).toFixed(1)} KB` };
    return { bytes, formatted: `${(bytes / (1024 * 1024)).toFixed(2)} MB` };
  } catch (err) {
    return { bytes: 0, formatted: '0 KB' };
  }
}
