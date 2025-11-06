
import type { Verification, PhotoRecord, ProductSessionState } from '../types';

const DB_NAME = 'ChecklistDB_React';
const DB_VERSION = 1;
let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject('IndexedDB not supported');
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject('Error opening DB');
        
        request.onsuccess = (event) => {
            db = (event.target as IDBOpenDBRequest).result;
            resolve(true);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;
            if (!database.objectStoreNames.contains('verifications')) {
                const store = database.createObjectStore('verifications', { keyPath: 'id', autoIncrement: true });
                store.createIndex('sku', 'sku', { unique: false });
                store.createIndex('fecha', 'fecha', { unique: false });
            }
            if (!database.objectStoreNames.contains('photos')) {
                const store = database.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
                store.createIndex('verificacion_id', 'verificacion_id', { unique: false });
            }
        };
    });
};

export const addVerificationAndPhotos = (product: ProductSessionState): Promise<void> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['verifications', 'photos'], 'readwrite');
        const verificationsStore = transaction.objectStore('verifications');
        const photosStore = transaction.objectStore('photos');

        const verification: Verification = {
            sku: product.sku,
            descripcion: product.descripcion,
            factorEstiba: product.factorEstiba,
            status: product.status as 'ok' | 'error',
            fecha: new Date().toISOString(),
            inspector: product.inspector,
            turno: product.turno,
            ubicacion: product.ubicacion,
            observaciones: product.notes,
            parametros: product.parametros,
            total_fotos: product.fotos_adjuntas,
        };

        const addRequest = verificationsStore.add(verification);
        addRequest.onsuccess = () => {
            const verificationId = addRequest.result as number;
            if (product.fotos_adjuntas > 0) {
                for (const [param, photoData] of Object.entries(product.fotos)) {
                    const photoRecord: Omit<PhotoRecord, 'id'> = {
                        verificacion_id: verificationId,
                        parametro: param,
                        blob: photoData,
                        fecha: new Date().toISOString(),
                    };
                    photosStore.add(photoRecord);
                }
            }
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getVerifications = (): Promise<Verification[]> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('verifications', 'readonly');
        const store = transaction.objectStore('verifications');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getVerificationById = (id: number): Promise<Verification | undefined> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('verifications', 'readonly');
        const store = transaction.objectStore('verifications');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export const getPhotosForVerification = (verificationId: number): Promise<PhotoRecord[]> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('photos', 'readonly');
        const store = transaction.objectStore('photos');
        const index = store.index('verificacion_id');
        const request = index.getAll(verificationId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const deleteAllData = (): Promise<void> => {
     return new Promise((resolve, reject) => {
        const transaction = db.transaction(['verifications', 'photos'], 'readwrite');
        const verificationsStore = transaction.objectStore('verifications');
        const photosStore = transaction.objectStore('photos');
        
        verificationsStore.clear();
        photosStore.clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}
