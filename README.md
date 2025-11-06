# FEMSA Quality Checklist Pro

## Descripción

Una Progressive Web Application (PWA) avanzada y con funcionalidad offline, diseñada para los equipos de control de calidad de Coca-Cola FEMSA. Esta herramienta agiliza el proceso de realización de checklists de calidad para verticalidad y apilamiento de productos. Incluye características como escaneo de códigos QR para identificación rápida de productos, captura de evidencia fotográfica, registro de datos históricos y análisis estadístico.

## ✨ Características Principales

-   **Offline-First**: Todos los datos se almacenan localmente utilizando IndexedDB, permitiendo que la aplicación funcione sin conexión a internet.
-   **Verificación de Productos**: Un checklist completo para parámetros de calidad como verticalidad, factor de estiba e integridad del empaque.
-   **Escaneo de Códigos QR**: Utiliza la cámara del dispositivo para escanear códigos QR de productos y abrir rápidamente el checklist correspondiente.
-   **Evidencia Fotográfica**: Adjunta fotos a cada ítem del checklist como prueba visual de cumplimiento o no conformidad.
-   **Gestión de Sesiones**: Agrupa múltiples verificaciones de productos en una sesión y guárdalas en la base de datos de una sola vez.
-   **Datos Históricos**: Navega y revisa todas las verificaciones pasadas con información detallada y fotos adjuntas.
-   **Panel de Estadísticas**: Visualiza datos de control de calidad con gráficos y métricas clave.
-   **Gestión de Datos**: Consulta el uso del almacenamiento y limpia la base de datos local si es necesario.
-   **Modo Oscuro**: Un tema oscuro amigable para diferentes condiciones de iluminación.
-   **Reportes Imprimibles**: Genera e imprime reportes limpios y profesionales de la sesión de verificación actual.

## 🚀 Stack Tecnológico

-   **Frontend**: React, TypeScript
-   **Estilos**: Tailwind CSS
-   **Iconos**: Font Awesome
-   **Gráficos**: Chart.js
-   **Escaneo QR**: html5-qrcode
-   **Almacenamiento Local**: IndexedDB

## 📂 Estructura del Proyecto

```
/
├── index.html          # Punto de entrada HTML principal
├── index.tsx           # Punto de entrada principal de la aplicación React
├── App.tsx             # Componente raíz de React que contiene toda la lógica y la UI
├── constants.ts        # Plantillas de productos y definiciones del checklist
├── types.ts            # Definiciones de tipos de TypeScript para la aplicación
├── services/
│   └── db.ts           # Servicio de IndexedDB para todas las operaciones de base de datos
└── metadata.json       # Metadatos de la aplicación
```

## 🛠️ Cómo Funciona

1.  **Pestaña Verificar**: Esta es la pantalla principal. Puedes ver una lista de todos los productos.
2.  **Buscar/Escanear**: Encuentra un producto buscando su SKU/descripción o usando el botón "Escanear QR".
3.  **Realizar Checklist**: Haz clic en "Verificar" para abrir un modal. Responde "Sí" o "No" para cada parámetro y adjunta fotos usando el ícono de la cámara.
4.  **Añadir Detalles**: Completa la información del inspector, turno y ubicación.
5.  **Guardar Verificación**: Haz clic en "Guardar Verificación". El estado del producto se actualizará en la lista principal.
6.  **Guardar Sesión**: Una vez que hayas verificado múltiples productos, haz clic en "Guardar Sesión" para confirmar todos los cambios en la base de datos local.
7.  **Historial**: Visualiza registros pasados en la pestaña "Historial".
8.  **Estadísticas**: Observa un resumen de tus controles de calidad.
9.  **Configuración**: Activa el modo oscuro o limpia los datos locales.
