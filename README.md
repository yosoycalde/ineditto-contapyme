# Análisis Detallado del Sistema de Inventarios Ineditto → ContaPyme

## Descripción General del Sistema

Este sistema es una interfaz de procesamiento de archivos de inventario que convierte datos del formato Ineditto al formato ContaPyme. El sistema maneja archivos CSV, XLSX y XLS, asigna centros de costo automáticamente, distribuye cantidades por días de la semana y genera archivos CSV compatibles con ContaPyme.

## Arquitectura del Sistema

### Estructura de Archivos

```
├── config/
│   ├── database.php        # Configuración de base de datos
│   ├── error.html          # Página de errores
│   └── handler.php         # Funciones principales del sistema
├── includes/
│   ├── cleanup.php         # Limpieza de archivos y datos
│   ├── cleanup_status.php  # Estado de limpieza
│   ├── download_csv.php    # Descarga del archivo procesado
│   ├── functions.php       # Funciones auxiliares
│   ├── get_preview.php     # Vista previa de datos
│   ├── manager-accountant.php # Gestión de contadores
│   └── upload_handler.php  # Manejo de uploads
├── required-files/
│   ├── CENTRO DE COSTOS.csv
│   └── ELEMENTOS DE INVENTARIO.csv
├── css/
│   ├── style.css
│   └── error.css
├── js/
│   └── main.js
└── index.html              # Interfaz de usuario
```

## Análisis Componente por Componente

### 1. Database.php - Configuración de Base de Datos

```php
class Database
{
    private $host = 'localhost';
    private $db_name = 'ineditto_contapyme';
    private $username = 'root';
    private $password = '';
    private $conn;
}
```

**Funcionalidad:**
- Clase singleton para manejo de conexiones PDO
- Configuración centralizada de base de datos
- Manejo de errores de conexión con excepciones PDO

### 2. Handler.php - Núcleo del Sistema

#### A) Gestión de Números Consecutivos (INUMSOP)

```php
function obtenerSiguienteINUMSOP()
{
    // Implementa un contador atómico usando transacciones
    $conn->beginTransaction();
    
    // Verifica si existe el contador
    $checkQuery = "SELECT valor_actual FROM contadores WHERE nombre = 'INUMSOP'";
    
    // Si no existe, lo crea con valor inicial 1
    // Si existe, obtiene el valor actual e incrementa
    
    $conn->commit();
    return $siguienteNumero;
}
```

**Características:**
- **Atomicidad:** Usa transacciones para evitar números duplicados
- **Auto-inicialización:** Crea el contador si no existe
- **Rollback:** Revierte cambios en caso de error

#### B) Distribución por Días de Semana

```php
function distribuirCantidadPorDiaSemana($fecha, $cantidad)
{
    // Soporta múltiples formatos de fecha:
    // - Y-m-d (2024-01-15)
    // - d/m/Y (15/01/2024)
    // - j/n/Y (15/1/2024)
    
    $diaSemana = $fechaObj->format('N'); // 1=Lunes, 7=Domingo
    
    switch ($diaSemana) {
        case 1: $distribucion['QCANTLUN'] = floatval($cantidad); break;
        case 2: $distribucion['QCANTMAR'] = floatval($cantidad); break;
        // ... etc
    }
}
```

**Lógica de Negocio:**
- Toma la fecha del movimiento (FSOPORT)
- Determina el día de la semana
- Asigna la cantidad completa al día correspondiente
- Los demás días quedan en NULL

#### C) Asignación de Centros de Costo

```php
function obtenerCentroCosto($ilabor, $codigo_elemento)
{
    // Prioridad 1: Mapeo directo por ILABOR
    $mapeoIlabor = [
        'PERIODICOS' => '11212117001',
        'PULICOMERCIALES' => '11212417001',
        'REVISTAS' => '11212317001',
        // ...
    ];
    
    // Prioridad 2: Búsqueda en base de datos por ILABOR
    
    // Prioridad 3: Mapeo directo por código de elemento
    $mapeoElemento = [
        '76001' => '11212317001',
        '76019' => '11212417001',
        // ... (más de 200 mapeos)
    ];
    
    // Prioridad 4: Búsqueda en base de datos por elemento
    
    // Default: '1121231700'
}
```

**Algoritmo de Asignación:**
1. **ILABOR directo:** Busca en mapeo hardcodeado
2. **ILABOR fuzzy:** Búsqueda LIKE en base de datos
3. **Elemento directo:** Mapeo por código de elemento
4. **Elemento BD:** Consulta tabla elementos
5. **Default:** Centro de costo por defecto

#### D) Conversión de Archivos Excel

```php
function convertirXLSXACSVNativo($archivoXLSX)
{
    // Usa ZipArchive para leer archivos XLSX
    $zip = new ZipArchive();
    
    // Lee shared strings (cadenas compartidas)
    $sharedStrings = [];
    if (($sharedStringsXML = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
        // Parsea XML de cadenas compartidas
    }
    
    // Lee la primera hoja de trabajo
    $worksheetXML = $zip->getFromName('xl/worksheets/sheet1.xml');
    
    // Convierte a CSV
    foreach ($xml->sheetData->row as $row) {
        // Procesa cada celda, maneja referencias de cadenas compartidas
        fputcsv($csvFile, $rowData);
    }
}
```

**Características Técnicas:**
- **Sin librerías externas:** Implementación nativa con ZipArchive
- **Manejo de shared strings:** Soporte completo para cadenas compartidas de Excel
- **Referencias de celda:** Convierte referencias como A1, B2 a índices numéricos
- **Limpieza automática:** Elimina archivos temporales

### 3. Upload Handler - Procesamiento de Archivos

```php
// Soporta tres tipos de operaciones:
if ($_POST['action'] === 'import_centros') {
    // Importa centros de costo desde CSV/Excel
}
if ($_POST['action'] === 'import_elementos') {
    // Importa elementos de inventario desde CSV/Excel
}
if (isset($_FILES['csvFile'])) {
    // Procesa archivo principal de inventario
}
```

**Flujo de Procesamiento:**
1. **Validación:** Verifica extensión de archivo
2. **Upload:** Guarda archivo con timestamp único
3. **Conversión:** Convierte Excel a CSV si es necesario
4. **Procesamiento:** Ejecuta lógica específica según tipo
5. **Limpieza:** Elimina archivos temporales
6. **Respuesta JSON:** Retorna estadísticas y estado

### 4. Sistema de Limpieza

#### Cleanup.php - Limpieza Completa
```php
function realizarLimpiezaCompleta()
{
    $archivosEliminados = limpiarArchivosTemporales();
    $registrosEliminados = limpiarTablaTemporalInventarios();
    
    return [
        'success' => true,
        'archivos_eliminados' => $archivosEliminados,
        'registros_eliminados' => $registrosEliminados
    ];
}
```

#### Cleanup Status.php - Estado y Limpieza Forzada
```php
function verificarEstadoLimpieza()
{
    // Cuenta registros en inventarios_temp
    // Cuenta archivos temporales en uploads/
    // Determina si el sistema está "limpio"
}
```

### 5. Preview System - Vista Previa de Datos

```php
// 1. Verifica que hay datos procesados
// 2. Consulta datos de inventarios_temp
// 3. Genera CSV con headers específicos
// 4. Aplica formato UTF-8 con BOM
// 5. Realiza limpieza automática después de descarga
```

**Headers del CSV generado**:
- IEMP, FSOPORT, ITDSOP, INUMSOP, INVENTARIO
- IRECURSO, ICCSUBCC, ILABOR
- QCANTLUN, QCANTMAR, QCANTMIE, QCANTJUE, QCANTVIE, QCANTSAB, QCANTDOM
- SOBSERVAC

## 7. Vista Previa (`includes/get_preview.php`)

Proporciona información estadística:
- Últimos 15 registros procesados
- Estadísticas generales (total, registros sin labor, etc.)
- Distribución de centros de costo
- Estado del contador INUMSOP
- Verificación de integridad

## 8. Gestión del Contador (`includes/manager-accountant.php`)

API REST para gestionar el contador INUMSOP:

### Endpoints GET:
- `?action=estado`: Estado completo del sistema
- `?action=proximo`: Próximo número disponible
- `?action=validar&numero=X`: Validar si número existe

### Endpoints POST:
- `{"action":"reiniciar","valor":X}`: Reiniciar contador
- `{"action":"incrementar"}`: Incrementar manualmente
- `{"action":"establecer","valor":X}`: Establecer valor específico

## 9. Subida de Archivos (`includes/upload_handler.php`)

Maneja tres tipos de operaciones:

### 9.1 Importar Centros de Costo
```php
// Headers para descarga CSV
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="contapyme_' . date('Y-m-d_H-i-s') . '.csv"');

// BOM para UTF-8
fprintf($csvOutput, chr(0xEF) . chr(0xBB) . chr(0xBF));

// Headers específicos de ContaPyme
$headers = ['IEMP', 'FSOPORT', 'ITDSOP', 'INUMSOP', 'INVENTARIO', 
           'IRECURSO', 'ICCSUBCC', 'ILABOR', 'QCANTLUN', 'QCANTMAR', 
           'QCANTMIE', 'QCANTJUE', 'QCANTVIE', 'QCANTSAB', 'QCANTDOM', 'SOBSERVAC'];

// ILABOR siempre se envía vacío (requisito de ContaPyme)
$csvRow[7] = ''; // ILABOR vacío

// Limpieza automática después de descarga
realizarLimpiezaCompleta($conn);
```

## Estructura de Base de Datos

### Tablas Principales

#### inventarios_temp
```sql
CREATE TABLE inventarios_temp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    IEMP VARCHAR(10),
    FSOPORT DATE,
    ITDSOP VARCHAR(10),
    INUMSOP INT,
    INVENTARIO VARCHAR(10),
    IRECURSO VARCHAR(50),
    ICCSUBCC VARCHAR(20),
    ILABOR VARCHAR(100),
    QCANTLUN DECIMAL(10,2),
    QCANTMAR DECIMAL(10,2),
    QCANTMIE DECIMAL(10,2),
    QCANTJUE DECIMAL(10,2),
    QCANTVIE DECIMAL(10,2),
    QCANTSAB DECIMAL(10,2),
    QCANTDOM DECIMAL(10,2),
    SOBSERVAC TEXT,
    centro_costo_asignado VARCHAR(20),
    fecha_procesamiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### contadores
```sql
CREATE TABLE contadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE,
    valor_actual INT NOT NULL DEFAULT 0,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### centros_costos
```sql
CREATE TABLE centros_costos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    nombre VARCHAR(100)
);
```

#### elementos
```sql
CREATE TABLE elementos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    referencia VARCHAR(100),
    descripcion VARCHAR(200),
    centro_costo_1 VARCHAR(20),
    centro_costo_2 VARCHAR(20),
    centro_costo_3 VARCHAR(20),
    centro_costo_4 VARCHAR(20),
    centro_costo_5 VARCHAR(20)
);
```

## Flujo de Datos Completo

### 1. Carga de Archivo
1. Usuario selecciona archivo (CSV/XLSX/XLS)
2. Sistema valida formato
3. Si es Excel, convierte a CSV usando ZipArchive
4. Guarda archivo temporal con timestamp

### 2. Procesamiento de Inventario
1. Lee headers y limpia BOM UTF-8
2. Procesa fila por fila:
   - Obtiene siguiente INUMSOP (atómico)
   - Determina centro de costo (4 niveles de prioridad)
   - Distribuye cantidad según día de semana de FSOPORT
   - Inserta en inventarios_temp

### 3. Vista Previa
1. Consulta últimos registros procesados
2. Genera estadísticas (totales, distribución, integridad)
3. Muestra información del contador INUMSOP

### 4. Descarga
1. Consulta todos los registros de inventarios_temp
2. Genera CSV con formato específico ContaPyme
3. Limpia automáticamente archivos y datos temporales

## Características Técnicas Destacadas

### Robustez
- **Transacciones atómicas** para números consecutivos
- **Manejo de excepciones** en todas las operaciones
- **Rollback automático** en caso de errores
- **Validación de integridad** de datos

### Flexibilidad
- **Múltiples formatos** de archivo (CSV, XLSX, XLS)
- **Múltiples formatos** de fecha
- **Mapeo configurable** de centros de costo
- **Sistema de limpieza** manual y automático

### Rendimiento
- **Procesamiento por lotes** para archivos grandes
- **Consultas optimizadas** con LIMIT y ORDER BY
- **Limpieza automática** de recursos temporales
- **Indices en campos clave** (INUMSOP, códigos)

### Seguridad
- **Validación de tipos** de archivo
- **Sanitización de nombres** de archivo
- **Prepared statements** para evitar SQL injection
- **Logging de errores** para auditoría

## Casos de Uso del Sistema

1. **Procesamiento diario:** Archivos de inventario regulares
2. **Configuración inicial:** Carga de centros de costo y elementos
3. **Corrección de datos:** Limpieza y reprocesamiento
4. **Auditoría:** Vista previa y verificación antes de descarga
5. **Integración:** Exportación compatible con ContaPyme









Codigo Echo por: Juan Jose Calderon Benjumea
Para 