
export interface ProductTemplate {
    sku: string;
    descripcion: string;
    factorEstiba: string;
}

export interface ChecklistItem {
    id: number;
    nombre: string;
    pregunta: string;
    descripcion: string;
}

export interface ProductSessionState extends ProductTemplate {
    status: 'pending' | 'ok' | 'error';
    notes: string;
    ubicacion: string;
    inspector: string;
    turno: string;
    fotos_adjuntas: number;
    fotos: { [key: string]: string }; // key is param.nombre, value is base64 data URL
    parametros: { [key: string]: 'si' | 'no' | '' }; // key is param.nombre
}

export interface Verification {
    id?: number;
    sku: string;
    descripcion: string;
    factorEstiba: string;
    status: 'ok' | 'error';
    fecha: string; // ISO string
    inspector: string;
    turno: string;
    ubicacion: string;
    observaciones: string;
    parametros: { [key: string]: 'si' | 'no' | '' };
    total_fotos: number;
}

export interface PhotoRecord {
    id?: number;
    verificacion_id: number;
    parametro: string; // The 'nombre' of the checklist item
    blob: string; // base64 data URL
    fecha: string; // ISO string
}

export type Tab = 'verificar' | 'historial' | 'estadisticas' | 'configuracion';
