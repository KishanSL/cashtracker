export interface Transaction {
    id?: number;
    date: string;
    account: string;
    amount: number;
    to?: string;
    category: string;
    note?: string;
}

const DB_NAME = 'CashTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('date', 'date', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject('IndexedDB error: ' + (event.target as IDBOpenDBRequest).error);
        };
    });

    return dbPromise;
};

export const addTransaction = async (transaction: Transaction): Promise<number> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.add(transaction);

        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllTransactions = async (): Promise<Transaction[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            // Sort by date DESC, then id DESC (newest created)
            const results = (request.result as Transaction[]).sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (dateA > dateB) return -1;
                if (dateA < dateB) return 1;
                // Handle optional id safely
                const idA = a.id ?? 0;
                const idB = b.id ?? 0;
                return idB - idA;
            });
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
};
