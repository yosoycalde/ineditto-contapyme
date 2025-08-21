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









Codigo Hecho por: Juan Jose Calderon Benjumea
Para: Empresa Manizaleña





# Detailed Analysis of the Inedito Inventory System → ContaPyme

## General Description of the System

This system is an inventory file processing interface that converts data from the Unreleased format to the ContaPyme format. The system handles CSV, XLSX and XLS files, assigns cost centers automatically, distributes quantities by days of the week and generates CSV files compatible with ContaPyme.

## Architecture of the System

### File Structure

```
├── config/
│ ├── database.php # Database configuration
│ ├── error.html # Error page
│ │── handler.php # Main functions of the system
├── includes/
│ ├── cleanup.php # Cleaning of files and data
│ ├── cleanup_status.php # State of cleanliness
│ ├── download_csv.php # Download of the processed file
│ ├── functions.php # Auxiliary functions
│ ├── get_preview.php # Data preview
│ ├── manager-accountant.php # Management of accountants
│ │── upload_handler.php # Handling of uploads
├── required-files/
│ ├── COST CENTER.csv
│ │── INVENTORY ITEMS.csv
├── css/
│ ├── style.css
│ │── error.css
├── js/
│ │── main.js
└── index.html # User interface
```

## Component-by-component Analysis

### 1. Database.php - Database Configuration

"'php
class Database
{
    private $host = 'localhost';
    private $db_name = 'ineditto_contapyme';
    private $username = 'root';
    private $password = ";
    private $conn;
}
```

** Functionality:**
- Singleton class for handling PDO connections
- Centralized database configuration
- Connection error handling with PDO exceptions

### 2. Handler.php - Core of the System

#### A) Consecutive Number Management (INUMSOP)

"'php
function Get Nextinumsop()
{
    // Implements an atomic counter using transactions
    $conn->StartTransaction();
    
    // Check if the counter exists
    $checkQuery = "SELECT current_value FROM counters WHERE name = 'INUMSOP'";
    
    // If it doesn't exist, create it with initial value 1
    // If it exists, gets the current value and increments
    
    $conn->commit();
    return $Next number;
}
```

** Features:**
- **Atomicity:** Use transactions to avoid duplicate numbers
- **Auto-initialization:** Creates the counter if it does not exist
-**Rollback:** Reverts changes in case of error

####B) Distribution by Weekdays

"'php
function Distribuircumberweekly($date, $quantity)
{
    // Supports multiple date formats:
    // - Y-m-d (2024-01-15)
    // - d/m/Y (15/01/2024)
    // - j/n/Y (1/15/2024)
    
    $Weekday = $dateObj->format('N'); // 1=Monday, 7=Sunday
    
    switch ($Weekday) {
        case 1: $distribution['QCANTLUN'] = floatval($amount); break;
        case 2: $distribution['QCANTMAR'] = floatval($amount); break;
        // ... etc
    }
}
```

** Business Logic:**
- Take the date of the movement (FSOPORT)
- Determine the day of the week
- Allocate the full amount to the corresponding day
- The other days are set to NULL

####C) Allocation of Cost Centers

"'php
function Get Centrocosto($ilabor, $codigo_elemento)
{
    // Priority 1: Direct mapping by ILABOR
    $mapeoIlabor = [
        'PERIODICALS' => '11212117001',
        'PULICOMERCIALES' => '11212417001',
        'MAGAZINES' => '11212317001',
        // ...
    ];
    
    // Priority 2: Database search by ILABOR
    
    // Priority 3: Direct mapping by element code
    $Mapeoelement = [
        '76001' => '11212317001',
        '76019' => '11212417001',
        // ... (more than 200 maps)
    ];
    
    // Priority 4: Database search by item
    
    // Default: '1121231700'
}
```

**Allocation algorithm:**
1. **Direct LABOR:** Search in hardcoded mapping
2. **ILABOR fuzzy:** Search LIKE in database
3. **Direct element:** Mapping by element code
4. **BD Element:** Query table elements
5. **Default:** Default cost center

#### D) Excel File Conversion

"'php
function CONVERTXLSXACSVNATIVE($archivoXLSX)
{
    // Use ZipArchive to read XLSX files
    $zip = new ZipArchive();
    
    // Lee shared strings (shared strings)
    $SharedStrings = [];
    if (($sharedStringsXML = $zip->getFromName('xl/SharedStrings.xml'))!== false) {
        // XML PARSEA of shared strings
    }
    
    // Read the first worksheet
    $worksheetXML = $zip->getFromName('xl/worksheets/sheet1.xml');
    
    // Convert to CSV
    foreach ($xml->sheetData->row as $row) {
        // Processes each cell, handles shared string references
        fputcsv($csvFile, $rowData);
    }
}
```

** Technical Characteristics:**
- **No external libraries:** Native implementation with ZipArchive
-**Handling of shared strings:** Full support for Excel shared strings
- **Cell references:** Converts references such as A1, B2 to numeric indexes
- **Automatic cleaning:** Deletes temporary files

### 3. Upload Handler - File Processing

"'php
// Supports three types of operations:
if ($_POST['action'] === 'import_centers') {
    // Import cost centers from CSV/Excel
}
if ($_POST['action'] === 'import_elements') {
    // Import inventory items from CSV/Excel
}
if (isset($_FILES['csvFile'])) {
    // Processes main inventory file
}
```

** Processing Flow:**
1. **Validation:** Verify file extension
2. **Upload:** Save file with unique timestamp
3. **Conversion:** Convert Excel to CSV if necessary
4. **Processing:** Executes type-specific logic
5. **Cleaning:** Deletes temporary files
6. **JSON response:** Returns statistics and status

### 4. Cleaning System

#### Cleanup.php - Complete Cleaning
"'php
function Performcomplete cleaning()
{
    $Deletedfiles = limpiarArchivosTemporales();
    $Registersremoved = Clear Timestablishmentinventaries();
    
    return [
        'success' => true,
        'archives_removed' => $Archivesremoved,
        'registros_eliminados' => $registrosEliminados
    ];
}
```

#### Cleanup Status.php - Status and Forced Cleanup
"'php
function Check this cleaning()
{
    // Account records in inventory_temp
    // Account temporary files in uploads/
    // Determines if the system is "clean"
}
```

### 5. Preview System - Data Preview

"'php
// 1. Verify that there is processed data
// 2. View inventory data_temp
// 3. Generate CSV with specific headers
// 4. Apply UTF-8 format with BOM
// 5. Performs automatic cleaning after unloading
```

**Headers of the generated CSV**:
- IEMP, FSOPORT, ITDSOP, INUMSOP, INVENTORY
- IRESOURCE, ICCSUBCC, ILABOR
- QCANTLUN, QCANTMAR, QCANTMIE, QCANTJUE, QCANTVIE, QCANTSAB, QCANTDOM
- SOBSERVAC

## 7. Preview ('includes/get_preview.php`)

Provides statistical information:
- Last 15 records processed
- General statistics (total, records without labor, etc.)
- Distribution of cost centers
- Status of the INUMSOP counter
- Verification of integrity

## 8. Management of the Accountant ('includes/manager-accountant.php`)

REST API to manage the INUMSOP counter:

### Endpoints GET:
- `?action=state`: Complete state of the system
- `?action=next': Next issue available
- `?action=validate&number=X`: Validate if number exists

### Endpoints POST:
- '{"action":"reset","value":X}': Reset counter
- '{"action":"increment"}': Manually increment
- '{"action":"set","value":X}': Set specific value

## 9. File Upload ('includes/upload_handler.php`)

Handles three types of operations:

###9.1 Import Cost Centers
"'php
// Headers for CSV download
header('Content-Type: text/csv; charset= utf-8');
header('Content-Arrangement: attachment; filename="contapyme_' . date('Y-m-d_H-i-s'). '.csv"');

// BOM for UTF-8
fprintf($csvOutput, chr(0xEF). chr(0xBB) . chr(0xBF));

// ContaPyme specific headers
$headers = ['IEMP', 'FSOPORT', 'ITDSOP', 'INUMSOP', 'INVENTORY', 
           'IRECOURSE', 'ICCSUBCC', 'ILABOR', 'QCANTLUN', 'QCANTMAR', 
           'QCANTMIE', 'QCANTJUE', 'QCANTVIE', 'QCANTSAB', 'QCANTDOM', 'SOBSERVAC'];

// ILABOR is always shipped empty (ContaPyme requirement)
$csvRow[7] = "; // Empty word

// Automatic cleaning after unloading
Perform thorough cleaning($conn);
```

## Database Structure

### Main Tables

#### inventory_temp
"'sql
CREATE TABLE inventory_temp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    IEMP VARCHAR(10),
    FSOPORT DATE,
    ITDSOP VARCHAR(10),
    INUMSOP INT,
    INVENTORY VARCHAR(10),
    IRECOURSE VARCHAR(50),
    ICCSUBCC VARCHAR(20),
    ILABOR VARCHAR(100),
    QCANTLUN DECIMAL(10,2),
    QCANTMAR DECIMAL(10,2),
    QCANTMIE DECIMAL(10,2),
    QCANTJUE DECIMAL(10,2),
    QCANTVIE DECIMAL(10,2),
    QCANTSAB DECIMAL(10,2),
    DECIMAL QCANTDOM(10,2),
    SOBSERVAC TEXT,
    centro_costo_asignado VARCHAR(20),
    date_processing TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### accountants
"'sql
CREATE TABLE contadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE,
    valor_actual INT NOT NULL DEFAULT 0,
    date_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### centros_costs
"'sql
CREATE TABLE centros_costs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    VARCHAR code(20) UNIQUE,
    name VARCHAR(100)
);
```

#### elements
"'sql
CREATE TABLE elements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    VARCHAR code(20) UNIQUE,
    reference VARCHAR(100),
    description VARCHAR(200),
    centre_costo_1 VARCHAR(20),
    centre_costo_2 VARCHAR(20),
    centre_costo_3 VARCHAR(20),
    centre_costo_4 VARCHAR(20),
    centre_costo_5 VARCHAR(20)
);
```

## Complete Data Flow

### 1. File Upload
1. User selects file (CSV/XLSX/XLS)
2. System validates format
3. If it's Excel, convert to CSV using ZipArchive
4. Save temporary file with timestamp

### 2. Inventory Processing
1. Read headers and clean BOM UTF-8
2. Processes row by row:
   - Gets next INUMSOP (atomic)
   - Determines cost center (4 priority levels)
   - Distributes quantity according to FSOPORT weekday
   - Insert in inventory_temp

### 3. Preview
1. Check the last processed records
2. Generates statistics (totals, distribution, completeness)
3. Displays information of the INUMSOP counter

### 4. Download
1. View all inventory records_temp
2. Generates CSV with specific format ContaPyme
3. Automatically cleans temporary files and data

## Outstanding Technical Features

### Robustness
- **Atomic transactions** for consecutive numbers
-**Exception handling** in all operations
- **Automatic rollback** in case of errors
- **Data integrity validation**

### Flexibility
- **Multiple file formats** (CSV, XLSX, XLS)
- **Multiple date formats**
- **Configurable mapping** of cost centers
- **Manual and automatic cleaning system**

### Performance
- **Batch processing** for large files
- **Optimized queries** with LIMIT and ORDER BY
- **Automatic cleaning** of temporary resources
- **Indexes in key fields** (INUMSOP, codes)

### Security
- **Validation of file types**
- **Sanitization of file names**
- **Prepared statements** to avoid SQL injection
- **Error logging** for audit

## Use Cases of the System

1. **Daily processing:** Regular inventory files
2. **Initial configuration:** Loading of cost centers and elements
3. **Data correction:** Cleaning and reprocessing
4. **Audit:** Preview and verification before download
5. **Integration:** Export compatible with ContaPyme



Code Made by: Juan Jose Calderon Benjumea
For: Manizales Company