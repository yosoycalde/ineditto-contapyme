# Explicación Completa del Sistema PHP de Inventarios

## 1. Estructura General del Sistema

Este es un sistema de gestión de inventarios llamado "ContaPyme" que procesa archivos Excel/CSV y los convierte para un sistema contable. La estructura está organizada en:

- **config/**: Configuración y manejadores principales
- **includes/**: Funcionalidades específicas
- **index.php**: Punto de entrada

## 2. Configuración de la Base de Datos (`config/database.php`)

```php
class Database {
    private $host = 'localhost';
    private $db_name = 'ineditto_contapyme';
    private $username = 'root';
    private $password = '';
    
    public function connect() {
        // Conexión PDO con MySQL
        $this->conn = new PDO("mysql:host=...", $this->username, $this->password);
        return $this->conn;
    }
}
```

**Función**: Proporciona conexión a la base de datos MySQL usando PDO.

## 3. Manejador Principal (`config/handler.php`)

### 3.1 Sistema de Numeración Consecutiva (INUMSOP)

```php
function obtenerSiguienteINUMSOP() {
    // 1. Inicia transacción
    // 2. Busca el valor actual en tabla 'contadores'
    // 3. Si no existe, crea contador inicial con valor 1
    // 4. Incrementa el contador
    // 5. Retorna el número consecutivo
}
```

**Propósito**: Generar números únicos consecutivos para cada registro de inventario.

### 3.2 Conversión de Archivos Excel

```php
function convertirXLSXACSVNativo($archivoXLSX) {
    // 1. Abre archivo XLSX como ZIP
    // 2. Lee shared strings (textos compartidos)
    // 3. Procesa la hoja de trabajo principal
    // 4. Convierte a formato CSV
    // 5. Limpia archivos temporales
}
```

**Características**:
- Soporta XLSX (no XLS por limitaciones)
- Maneja textos compartidos de Excel
- Procesa celdas y referencias de columnas
- Genera CSV compatible

### 3.3 Asignación de Centros de Costo

```php
function obtenerCentroCosto($ilabor, $codigo_elemento) {
    // Mapeo directo por ILABOR
    $mapeoIlabor = [
        'PERIODICOS' => '11212317002',
        'PULICOMERCIALES' => '11212317003',
        'REVISTAS' => '11212317001',
        'PLEGADIZAS' => '11212317004'
    ];
    
    // Mapeo por código de elemento
    $mapeoElemento = [
        '72312' => '11212317005',
        '54003' => '11212317006',
        // ...
    ];
    
    // Búsqueda en base de datos como fallback
    // Retorna código por defecto si no encuentra
}
```

**Lógica**:
1. Busca por ILABOR (tipo de trabajo)
2. Si no encuentra, busca por código de elemento
3. Como último recurso, busca en base de datos
4. Retorna código por defecto: '1121231700'

### 3.4 Procesamiento Principal de Inventario

```php
function procesarInventarioIneditto($archivo_csv) {
    // 1. Limpia tabla temporal
    // 2. Convierte Excel a CSV si es necesario
    // 3. Lee headers del archivo
    // 4. Procesa línea por línea
    // 5. Para cada fila:
    //    - Obtiene centro de costo
    //    - Genera INUMSOP consecutivo
    //    - Inserta en tabla temporal
    // 6. Retorna cantidad procesada
}
```

## 4. Funciones de Importación

### 4.1 Importar Centros de Costo

```php
function importarCentrosCostos($archivo_csv) {
    // Espera columnas: 'Codigo', 'Nombre'
    // INSERT ... ON DUPLICATE KEY UPDATE
    // Permite actualizar existentes
}
```

### 4.2 Importar Elementos

```php
function importarElementos($archivo_csv) {
    // Espera: 'Cód. Artículo', 'Referencia', 'Descripción'
    // Múltiples centros de costo por elemento
    // 5 centros de costo posibles por elemento
}
```

## 5. Sistema de Limpieza (`includes/cleanup.php`)

```php
function realizarLimpiezaCompleta() {
    // 1. Limpia archivos temporales del directorio uploads/
    // 2. Limpia tabla temporal inventarios_temp
    // 3. Retorna estadísticas de limpieza
}
```

**Archivos que limpia**: Archivos que empiecen con timestamp (patrón `/^\d+_/`)

## 6. Descarga de CSV (`includes/download_csv.php`)

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
// POST con action=import_centros
// Archivo en $_FILES['configFile']
```

### 9.2 Importar Elementos
```php
// POST con action=import_elementos  
// Archivo en $_FILES['configFile']
```

### 9.3 Procesar Inventario
```php
// POST con archivo en $_FILES['csvFile']
// Procesamiento principal del inventario
```

## 10. Estructura de Base de Datos

### Tablas Principales:

**contadores**:
- id (PK)
- nombre (UNIQUE)
- valor_actual
- fecha_actualizacion

**inventarios_temp**:
- Todos los campos del inventario
- centro_costo_asignado
- fecha_procesamiento

**centros_costos**:
- codigo (PK)
- nombre

**elementos**:
- codigo (PK)
- referencia, descripcion
- centro_costo_1 hasta centro_costo_5

## 11. Flujo de Trabajo Típico

1. **Configuración inicial**: Importar centros de costo y elementos
2. **Procesamiento**: Subir archivo de inventario (Excel/CSV)
3. **Conversión**: Sistema convierte Excel a CSV automáticamente
4. **Asignación**: Asigna centros de costo según reglas de negocio
5. **Numeración**: Genera números INUMSOP consecutivos únicos
6. **Vista previa**: Revisar datos procesados
7. **Descarga**: Generar CSV final para sistema contable
8. **Limpieza**: Limpieza automática post-descarga

## 12. Características Técnicas

- **Transacciones**: Uso de transacciones para integridad de datos
- **Manejo de errores**: Try-catch extensivo con logging
- **Limpieza automática**: Previene acumulación de archivos temporales
- **API REST**: Endpoints JSON para gestión del contador
- **Soporte multi-formato**: CSV, XLSX (XLS limitado)
- **Validación**: Verificación de integridad de datos
- **UTF-8 BOM**: Compatibilidad con Excel en descarga

Este sistema está diseñado para ser robusto, manejar grandes volúmenes de datos y mantener la integridad de la numeración consecutiva crítica para sistemas contables.
