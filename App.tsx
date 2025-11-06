

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { productTemplates, parametrosChecklist } from './constants';
import type { ProductSessionState, Verification, PhotoRecord, Tab, ProductTemplate, ChecklistItem } from './types';
import * as db from './services/db';

// QR Scanner is not a React library, so we need to declare its type.
declare const Html5Qrcode: any;
declare const Chart: any;

// A modern, declarative way to define icons as components
// FIX: Add optional title prop to Icon component to allow passing a title attribute.
const Icon: React.FC<{ name: string; className?: string; title?: string }> = ({ name, className, title }) => (
    <i className={`fa-solid fa-${name} ${className || ''}`} aria-hidden="true" title={title}></i>
);

// ============================
// PRINT HEADER COMPONENT
// ============================
const PrintHeader: React.FC = () => (
    <div className="print-only hidden">
        <img 
            src="https://seeklogo.com/images/C/coca-cola-femsa-logo-6503544C27-seeklogo.com.png" 
            alt="Logo Coca-Cola FEMSA" 
            style={{ height: '50px' }} 
        />
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '1rem', marginBottom: '0.5rem', color: 'black' }}>Reporte de Verificación de Calidad</h1>
        <hr style={{ marginBottom: '1rem' }}/>
    </div>
);


// ============================
// MODAL COMPONENTS
// ============================
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;

    return (
        <div className="no-print">
            <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose}></div>
            <div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl z-50 w-[95vw] max-w-4xl max-h-[90vh] flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h2 id="modal-title" className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Cerrar modal">
                        <Icon name="xmark" className="fa-lg" />
                    </button>
                </header>
                <div className="overflow-y-auto p-6 flex-grow">
                    {children}
                </div>
            </div>
        </div>
    );
};


// ============================
// APP COMPONENT
// ============================
const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('verificar');
    const [products, setProducts] = useState<ProductSessionState[]>([]);
    const [dbInitialized, setDbInitialized] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    
    // Modal States
    const [isChecklistModalOpen, setChecklistModalOpen] = useState(false);
    const [isQrModalOpen, setQrModalOpen] = useState(false);
    const [isHistoryDetailModalOpen, setHistoryDetailModalOpen] = useState(false);

    // Data for Modals
    const [selectedProduct, setSelectedProduct] = useState<ProductSessionState | null>(null);
    const [selectedHistory, setSelectedHistory] = useState<Verification | null>(null);

    // Effect for initializing DB and session state
    useEffect(() => {
        db.initDB().then(() => {
            setDbInitialized(true);
            // FIX: Explicitly type the mapped object to ensure it conforms to ProductSessionState, preventing type widening issues.
            const initialProducts = productTemplates.map((p): ProductSessionState => ({
                ...p,
                status: 'pending',
                notes: '',
                ubicacion: '',
                inspector: '',
                turno: '',
                fotos_adjuntas: 0,
                fotos: {},
                parametros: Object.fromEntries(parametrosChecklist.map(item => [item.nombre, '']))
            }));
            setProducts(initialProducts);
        }).catch(err => {
            console.error("Failed to initialize DB:", err);
            // Handle DB init failure gracefully
        });
    }, []);

    // Effect for Dark Mode
    useEffect(() => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add('dark');
            setIsDarkMode(true);
        } else {
            document.documentElement.classList.remove('dark');
            setIsDarkMode(false);
        }
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode(prev => {
            const newMode = !prev;
            if (newMode) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
            return newMode;
        });
    };

    const handleOpenChecklist = useCallback((product: ProductSessionState) => {
        setSelectedProduct(product);
        setChecklistModalOpen(true);
    }, []);
    
    const handleSaveChecklist = (updatedProduct: ProductSessionState) => {
        setProducts(prev => prev.map(p => p.sku === updatedProduct.sku ? updatedProduct : p));
        setChecklistModalOpen(false);
        setSelectedProduct(null);
    };

    const handleCommitSession = async () => {
        const productsToCommit = products.filter(p => p.status !== 'pending');
        if (productsToCommit.length === 0) {
            alert('No hay verificaciones completadas para guardar.');
            return;
        }
        try {
            await Promise.all(productsToCommit.map(p => db.addVerificationAndPhotos(p)));
            alert(`✅ ${productsToCommit.length} verificaciones guardadas con éxito en el historial.`);
            // Reset state for committed products
            setProducts(prev => prev.map(p => {
                if(productsToCommit.some(committed => committed.sku === p.sku)) {
                    const template = productTemplates.find(t => t.sku === p.sku)!;
                    // FIX: Explicitly type the reset product object to ensure it conforms to ProductSessionState.
                     const resetProduct: ProductSessionState = {
                        ...template,
                        status: 'pending', notes: '', ubicacion: '', inspector: '', turno: '',
                        fotos_adjuntas: 0, fotos: {},
                        parametros: Object.fromEntries(parametrosChecklist.map(item => [item.nombre, '']))
                    };
                    return resetProduct;
                }
                return p;
            }));

        } catch (error) {
            console.error("Error committing session:", error);
            alert("⚠️ Ocurrió un error al guardar la sesión.");
        }
    };
    
    const handleOpenHistoryDetail = async (verificationId: number) => {
        const verification = await db.getVerificationById(verificationId);
        if (verification) {
            setSelectedHistory(verification);
            setHistoryDetailModalOpen(true);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'historial':
                return <HistoryTab onOpenDetail={handleOpenHistoryDetail} />;
            case 'estadisticas':
                return <StatsTab />;
            case 'configuracion':
                return <SettingsTab isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
            case 'verificar':
            default:
                return <VerificarTab 
                    products={products} 
                    onOpenChecklist={handleOpenChecklist} 
                    onOpenQrScanner={() => setQrModalOpen(true)}
                    onCommitSession={handleCommitSession}
                />;
        }
    };
    
    return (
        <div className="min-h-screen text-gray-800 dark:text-gray-200 transition-colors duration-300">
            <main className="max-w-7xl mx-auto p-4">
                <PrintHeader />
                <Header dbInitialized={dbInitialized} />
                <nav className="mb-6 no-print">
                    <ul className="flex border-b border-gray-200 dark:border-gray-700">
                        {(['verificar', 'historial', 'estadisticas', 'configuracion'] as const).map(tab => (
                            <li key={tab}>
                                <button 
                                    onClick={() => setActiveTab(tab)}
                                    className={`tab-button capitalize px-4 py-3 font-semibold text-sm border-b-2 transition-colors duration-200 ${activeTab === tab ? 'active' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                >
                                    {tab}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {renderTabContent()}
                
                {isChecklistModalOpen && selectedProduct && (
                    <ChecklistModal
                        isOpen={isChecklistModalOpen}
                        onClose={() => setChecklistModalOpen(false)}
                        product={selectedProduct}
                        onSave={handleSaveChecklist}
                    />
                )}
                
                {isQrModalOpen && (
                     <QrScannerModal
                        isOpen={isQrModalOpen}
                        onClose={() => setQrModalOpen(false)}
                        onScanSuccess={(sku) => {
                            const product = products.find(p => p.sku === sku);
                            if (product) {
                                setQrModalOpen(false);
                                handleOpenChecklist(product);
                            } else {
                                alert(`Producto con SKU ${sku} no encontrado.`);
                            }
                        }}
                    />
                )}

                {isHistoryDetailModalOpen && selectedHistory && (
                    <HistoryDetailModal
                        isOpen={isHistoryDetailModalOpen}
                        onClose={() => setHistoryDetailModalOpen(false)}
                        verification={selectedHistory}
                    />
                )}
            </main>
        </div>
    );
};

// ============================
// HEADER & SUB-COMPONENTS
// ============================
const Header: React.FC<{ dbInitialized: boolean }> = ({ dbInitialized }) => {
    const [dateTime, setDateTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setDateTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="text-center mb-6 no-print">
            <div className="bg-[#ed1c24] text-white p-3 rounded-b-2xl shadow-lg flex items-center justify-center gap-4 max-w-lg mx-auto">
                <img src="https://logodownload.org/wp-content/uploads/2019/09/coca-cola-femsa-logo.png" alt="Logo FEMSA" className="h-10 object-contain" />
                <h1 className="text-xl font-bold">Quality Checklist Pro</h1>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                <p>{dateTime.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - {dateTime.toLocaleTimeString('es-ES')}</p>
                <p className={`font-semibold ${dbInitialized ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {dbInitialized ? 'Base de Datos Conectada' : 'Error en Base de Datos'}
                </p>
            </div>
        </header>
    );
};


// ============================
// TAB: VERIFICAR
// ============================
interface VerificarTabProps {
    products: ProductSessionState[];
    onOpenChecklist: (product: ProductSessionState) => void;
    onOpenQrScanner: () => void;
    onCommitSession: () => void;
}

const VerificarTab: React.FC<VerificarTabProps> = ({ products, onOpenChecklist, onOpenQrScanner, onCommitSession }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = useMemo(() => 
        products.filter(p => 
            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
        ), 
    [products, searchTerm]);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md sticky top-2 z-20 no-print">
                <div className="relative md:col-span-2 lg:col-span-1">
                    <input
                        type="text"
                        placeholder="Buscar por SKU o descripción..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ed1c24]"
                    />
                    <Icon name="magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <button onClick={onOpenQrScanner} className="flex items-center justify-center gap-2 p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition font-semibold">
                    <Icon name="qrcode" /> Escanear QR
                </button>
                <button onClick={onCommitSession} className="flex items-center justify-center gap-2 p-2 bg-[#ed1c24] text-white rounded-lg hover:bg-red-700 transition font-semibold">
                    <Icon name="save" /> Guardar Sesión
                </button>
                <button onClick={() => window.print()} className="flex items-center justify-center gap-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
                    <Icon name="print" /> Imprimir Reporte
                </button>
            </div>
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-md">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-3">SKU</th>
                            <th className="px-6 py-3">Descripción</th>
                            <th className="px-6 py-3 text-center">Factor Estiba</th>
                            <th className="px-6 py-3 text-center">Estado</th>
                            <th className="px-6 py-3 text-center">Ubicación</th>
                            <th className="px-6 py-3 text-center">Fotos</th>
                            <th className="px-6 py-3 text-center print-hide-action">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => (
                           <tr key={p.sku} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                               <td className="px-6 py-4 font-medium">{p.sku}</td>
                               <td className="px-6 py-4">{p.descripcion}</td>
                               <td className="px-6 py-4 text-center font-bold text-lg">{p.factorEstiba}</td>
                               <td className="px-6 py-4 text-center">
                                   {p.status === 'ok' && <Icon name="check-circle" className="text-green-500 fa-lg" title="OK" />}
                                   {p.status === 'error' && <Icon name="exclamation-triangle" className="text-red-500 fa-lg" title="Con Incidencias" />}
                                   {p.status === 'pending' && <Icon name="circle" className="text-gray-400 fa-xs" title="Pendiente" />}
                               </td>
                               <td className="px-6 py-4 text-center">{p.ubicacion || '-'}</td>
                               <td className="px-6 py-4 text-center">{p.fotos_adjuntas > 0 ? `📷 ${p.fotos_adjuntas}`: '-'}</td>
                               <td className="px-6 py-4 text-center print-hide-action">
                                   <button onClick={() => onOpenChecklist(p)} className="px-3 py-1 bg-[#ed1c24] text-white rounded-md hover:bg-red-700 text-xs font-semibold">Verificar</button>
                               </td>
                           </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredProducts.length === 0 && <div className="text-center p-8 text-gray-500">No se encontraron productos.</div>}
            </div>
        </div>
    );
};

// ============================
// TAB: HISTORIAL
// ============================
interface HistoryTabProps {
    onOpenDetail: (id: number) => void;
}
const HistoryTab: React.FC<HistoryTabProps> = ({ onOpenDetail }) => {
    const [history, setHistory] = useState<Verification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            const data = await db.getVerifications();
            setHistory(data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
            setLoading(false);
        };
        fetchHistory();
    }, []);

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
                <h3 className="text-lg font-semibold mb-2">Historial de Verificaciones</h3>
                <p className="text-sm text-gray-500">{history.length} registros encontrados.</p>
            </div>
             <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-md">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">SKU</th>
                            <th className="px-6 py-3">Descripción</th>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3">Inspector</th>
                            <th className="px-6 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center p-8">Cargando...</td></tr>
                        ) : history.length === 0 ? (
                             <tr><td colSpan={6} className="text-center p-8">No hay registros en el historial.</td></tr>
                        ) : (
                            history.map(v => (
                                <tr key={v.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4">{new Date(v.fecha).toLocaleString('es-ES')}</td>
                                    <td className="px-6 py-4 font-medium">{v.sku}</td>
                                    <td className="px-6 py-4">{v.descripcion}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${v.status === 'ok' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                            {v.status === 'ok' ? 'OK' : 'Incidencia'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{v.inspector || '-'}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => onOpenDetail(v.id!)} className="text-[#ed1c24] hover:underline font-semibold">Ver Detalles</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// ============================
// TAB: ESTADISTICAS
// ============================
const StatCard: React.FC<{ icon: string; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
    <div className={`p-4 rounded-xl flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 border-l-4 ${color}`}>
        <Icon name={icon} className="fa-2x text-gray-400" />
        <div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        </div>
    </div>
);

const StatsTab: React.FC = () => {
    const [stats, setStats] = useState({ total: 0, ok: 0, error: 0, photos: 0 });
    const chartRef = React.useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const data = await db.getVerifications();
            const photoCount = data.reduce((acc, v) => acc + (v.total_fotos || 0), 0);
            const okCount = data.filter(v => v.status === 'ok').length;
            setStats({
                total: data.length,
                ok: okCount,
                error: data.length - okCount,
                photos: photoCount,
            });
        };
        fetchStats();
    }, []);

    useEffect(() => {
        if (chartRef.current) {
            const chart = new Chart(chartRef.current, {
                type: 'doughnut',
                data: {
                    labels: ['OK', 'Con Incidencias'],
                    datasets: [{
                        data: [stats.ok, stats.error],
                        backgroundColor: ['#22c55e', '#ef4444'],
                        borderColor: ['#fff', '#fff'],
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
            return () => chart.destroy();
        }
    }, [stats]);
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon="clipboard-check" label="Total Verificaciones" value={stats.total} color="border-blue-500" />
                <StatCard icon="thumbs-up" label="OK" value={stats.ok} color="border-green-500" />
                <StatCard icon="triangle-exclamation" label="Con Incidencias" value={stats.error} color="border-red-500" />
                <StatCard icon="camera" label="Fotos Tomadas" value={stats.photos} color="border-yellow-500" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 h-96">
                <h3 className="text-lg font-semibold mb-4">Distribución de Estados</h3>
                <canvas ref={chartRef}></canvas>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold">Más información próximamente...</h3>
                <p className="text-gray-500 mt-2">Futuras versiones incluirán rankings de productos e inspectores.</p>
            </div>
        </div>
    );
};

// ============================
// TAB: CONFIGURACION
// ============================
interface SettingsTabProps {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}
const SettingsTab: React.FC<SettingsTabProps> = ({ isDarkMode, toggleDarkMode }) => {
    const [storageUsage, setStorageUsage] = useState("Calculando...");

    useEffect(() => {
        async function getUsage() {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                const usedMB = (estimate.usage! / 1024 / 1024).toFixed(2);
                const quotaMB = (estimate.quota! / 1024 / 1024).toFixed(2);
                setStorageUsage(`${usedMB} MB / ${quotaMB} MB`);
            } else {
                setStorageUsage("No disponible");
            }
        }
        getUsage();
    }, []);

    const handleClearData = async () => {
        if (confirm("¡ADVERTENCIA! Esto borrará TODAS las verificaciones y fotos. Esta acción no se puede deshacer. ¿Está seguro?")) {
            await db.deleteAllData();
            alert("Base de datos borrada.");
            window.location.reload();
        }
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
                <h3 className="text-lg font-semibold">Apariencia</h3>
                 <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                     <label htmlFor="dark-mode-toggle" className="font-medium">Modo Oscuro</label>
                     <button onClick={toggleDarkMode} className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors bg-gray-200 dark:bg-gray-600">
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                     </button>
                 </div>
            </div>
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
                <h3 className="text-lg font-semibold">Gestión de Datos</h3>
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm font-medium">Almacenamiento Local:</p>
                    <p className="text-lg font-semibold">{storageUsage}</p>
                </div>
                <button onClick={handleClearData} className="w-full p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold">
                    <Icon name="trash" className="mr-2"/> Limpiar Base de Datos
                </button>
            </div>
        </div>
    );
};


// ============================
// Checklist Modal Component
// ============================
interface ChecklistModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: ProductSessionState;
    onSave: (product: ProductSessionState) => void;
}

const ChecklistModal: React.FC<ChecklistModalProps> = ({ isOpen, onClose, product, onSave }) => {
    const [formData, setFormData] = useState<ProductSessionState>(product);

    useEffect(() => {
        setFormData(product);
    }, [product]);

    const handleParamChange = (paramName: string, value: 'si' | 'no') => {
        setFormData(prev => ({ ...prev, parametros: { ...prev.parametros, [paramName]: value } }));
    };

    const handlePhotoChange = async (paramName: string, file: File) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const img = document.createElement('img');
        
        img.onload = () => {
            let { width, height } = img;
            const maxSize = 1280;
            if (width > height) {
                if (width > maxSize) { height *= maxSize / width; width = maxSize; }
            } else {
                if (height > maxSize) { width *= maxSize / height; height = maxSize; }
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

            setFormData(prev => {
                const newFotos = { ...prev.fotos, [paramName]: dataUrl };
                return { ...prev, fotos: newFotos, fotos_adjuntas: Object.keys(newFotos).length };
            });
        };
        img.src = URL.createObjectURL(file);
    };

    const handleSaveClick = () => {
        const allAnswered = parametrosChecklist.every(p => formData.parametros[p.nombre]);
        if (!allAnswered) {
            alert('Por favor, responda a todos los parámetros.');
            return;
        }

        const hasError = Object.values(formData.parametros).some(v => v === 'no');
        const finalStatus = hasError ? 'error' : 'ok';
        
        onSave({ ...formData, status: finalStatus });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Checklist: ${product.descripcion}`}>
            <div className="space-y-6">
                {parametrosChecklist.map(param => (
                    <div key={param.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-grow">
                                <h4 className="font-semibold">{param.pregunta}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{param.descripcion}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Radio Buttons */}
                                <div className="flex gap-3">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" name={param.nombre} value="si" checked={formData.parametros[param.nombre] === 'si'} onChange={() => handleParamChange(param.nombre, 'si')} className="text-green-500 focus:ring-green-500" />
                                        <span className="text-green-600">Sí</span>
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" name={param.nombre} value="no" checked={formData.parametros[param.nombre] === 'no'} onChange={() => handleParamChange(param.nombre, 'no')} className="text-red-500 focus:ring-red-500" />
                                        <span className="text-red-600">No</span>
                                    </label>
                                </div>
                                {/* Photo Input */}
                                <div className="text-center">
                                    <input type="file" id={`photo-${param.nombre}`} accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && handlePhotoChange(param.nombre, e.target.files[0])} />
                                    <label htmlFor={`photo-${param.nombre}`} className="cursor-pointer text-blue-500 hover:text-blue-700">
                                        <Icon name="camera" className="fa-2x" />
                                    </label>
                                    {formData.fotos[param.nombre] && <img src={formData.fotos[param.nombre]} alt="preview" className="w-10 h-10 object-cover rounded mt-1 mx-auto" />}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                
                <div className="border-t pt-6 space-y-4">
                     <h3 className="text-lg font-semibold">Trazabilidad</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input type="text" name="inspector" placeholder="Inspector" value={formData.inspector} onChange={handleInputChange} className="input-field" />
                         <select name="turno" value={formData.turno} onChange={handleInputChange} className="input-field">
                             <option value="">Seleccionar Turno</option>
                             <option>Mañana</option><option>Tarde</option><option>Noche</option>
                         </select>
                     </div>
                     <input type="text" name="ubicacion" placeholder="Ubicación" value={formData.ubicacion} onChange={handleInputChange} className="input-field w-full" />
                     <textarea name="notes" placeholder="Observaciones" value={formData.notes} onChange={handleInputChange} className="input-field w-full" rows={3}></textarea>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition">Cancelar</button>
                    <button onClick={handleSaveClick} className="px-4 py-2 rounded-lg bg-[#ed1c24] text-white hover:bg-red-700 transition font-semibold">Guardar Verificación</button>
                </div>
            </div>
        </Modal>
    );
};

// ============================
// QR Scanner Modal
// ============================
interface QrScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (sku: string) => void;
}
const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
    const scannerRef = React.useRef<any>(null);

    useEffect(() => {
        if (isOpen) {
            const html5QrCode = new Html5Qrcode("qr-reader-container");
            scannerRef.current = html5QrCode;
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            
            html5QrCode.start({ facingMode: "environment" }, config, 
                (decodedText: string) => {
                    const skuMatch = decodedText.match(/SKU:\s*(\d+)/i);
                    if (skuMatch && skuMatch[1]) {
                        onScanSuccess(skuMatch[1]);
                    } else {
                        alert("No se encontró un SKU válido en el código QR.");
                    }
                    html5QrCode.stop();
                }, 
                () => {} // error callback, ignore
            ).catch((err: any) => console.error("QR Scanner Error:", err));
        }

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch((err: any) => console.error("Error stopping scanner", err));
            }
        };
    }, [isOpen, onScanSuccess]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Escanear Código QR">
            <div id="qr-reader-container" className="w-full h-80 bg-gray-900 rounded-lg"></div>
        </Modal>
    );
};


// ============================
// History Detail Modal
// ============================
interface HistoryDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    verification: Verification;
}
const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({ isOpen, onClose, verification }) => {
    const [photos, setPhotos] = useState<PhotoRecord[]>([]);

    useEffect(() => {
        if(isOpen) {
            db.getPhotosForVerification(verification.id!).then(setPhotos);
        }
    }, [isOpen, verification.id]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalle: ${verification.sku}`}>
             <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><strong className="block text-gray-500">Inspector:</strong> {verification.inspector || 'N/A'}</div>
                    <div><strong className="block text-gray-500">Turno:</strong> {verification.turno || 'N/A'}</div>
                    <div className="md:col-span-2"><strong className="block text-gray-500">Ubicación:</strong> {verification.ubicacion || 'N/A'}</div>
                </div>
                
                <div>
                     <h4 className="text-md font-semibold mb-2">Checklist</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        {parametrosChecklist.map(param => (
                            <div key={param.id} className="flex items-center">
                                {verification.parametros[param.nombre] === 'si' && <Icon name="check-circle" className="text-green-500 mr-2" />}
                                {verification.parametros[param.nombre] === 'no' && <Icon name="times-circle" className="text-red-500 mr-2" />}
                                {!verification.parametros[param.nombre] && <Icon name="minus-circle" className="text-gray-400 mr-2" />}
                                <span>{param.pregunta}</span>
                            </div>
                        ))}
                     </div>
                </div>

                <div>
                    <h4 className="text-md font-semibold mb-2">Observaciones</h4>
                    <p className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded text-sm whitespace-pre-wrap">{verification.observaciones || 'Sin observaciones.'}</p>
                </div>
                
                 <div>
                    <h4 className="text-md font-semibold mb-2">Fotos</h4>
                     {photos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {photos.map(photo => (
                                <a key={photo.id} href={photo.blob} target="_blank" rel="noopener noreferrer" className="block">
                                    <img src={photo.blob} alt={`Foto para ${photo.parametro}`} className="w-full h-auto rounded-lg shadow-md" />
                                    <p className="text-xs text-center mt-1">{parametrosChecklist.find(p => p.nombre === photo.parametro)?.pregunta}</p>
                                </a>
                            ))}
                        </div>
                     ) : (
                         <p className="text-sm text-gray-500">No hay fotos para esta verificación.</p>
                     )}
                </div>
             </div>
        </Modal>
    )
};


export default App;