<?php
require_once __DIR__ . '/../config/database.php';

function convertirExcelACSVNativo($archivoExcel)
{
    $fileExtension = strtolower(pathinfo($archivoExcel, PATHINFO_EXTENSION));

    if ($fileExtension === 'csv') {
        return $archivoExcel;
    }

    if ($fileExtension === 'xlsx') {
        return convertirXLSXACSVNativo($archivoExcel);
    } elseif ($fileExtension === 'xls') {
        throw new Exception("Archivos XLS no soportados directamente. Por favor, convierta a XLSX o CSV desde Excel.");
    }

    throw new Exception("Formato de archivo no soportado: $fileExtension");
}

function convertirXLSXACSVNativo($archivoXLSX)
{
    if (!class_exists('ZipArchive')) {
        throw new Exception("La extensión ZipArchive de PHP es requerida para procesar archivos XLSX");
    }

    try {
        $csvPath = pathinfo($archivoXLSX, PATHINFO_DIRNAME) . '/' .
            pathinfo($archivoXLSX, PATHINFO_FILENAME) . '_converted.csv';

        $zip = new ZipArchive();
        $result = $zip->open($archivoXLSX);

        if ($result !== TRUE) {
            throw new Exception("No se pudo abrir el archivo XLSX. Código de error: $result");
        }

        $sharedStrings = [];
        if (($sharedStringsXML = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
            $xml = simplexml_load_string($sharedStringsXML);
            if ($xml !== false) {
                foreach ($xml->si as $si) {
                    if (isset($si->t)) {
                        $sharedStrings[] = (string) $si->t;
                    } elseif (isset($si->r)) {
                        $text = '';
                        foreach ($si->r as $r) {
                            if (isset($r->t)) {
                                $text .= (string) $r->t;
                            }
                        }
                        $sharedStrings[] = $text;
                    }
                }
            }
        }

        $worksheetXML = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($worksheetXML === false) {
            throw new Exception("No se pudo leer la hoja de trabajo del archivo XLSX");
        }

        $zip->close();

        $xml = simplexml_load_string($worksheetXML);
        if ($xml === false) {
            throw new Exception("No se pudo parsear el contenido XML de la hoja de trabajo");
        }

        $csvFile = fopen($csvPath, 'w');
        if ($csvFile === false) {
            throw new Exception("No se pudo crear el archivo CSV temporal");
        }

        if (isset($xml->sheetData->row)) {
            foreach ($xml->sheetData->row as $row) {
                $rowData = [];
                $maxCol = 0;

                foreach ($row->c as $cell) {
                    $cellRef = (string) $cell['r'];
                    $colNum = obtenerNumeroColumna($cellRef);
                    if ($colNum > $maxCol) {
                        $maxCol = $colNum;
                    }
                }

                for ($i = 0; $i <= $maxCol; $i++) {
                    $rowData[$i] = '';
                }

                foreach ($row->c as $cell) {
                    $cellRef = (string) $cell['r'];
                    $colNum = obtenerNumeroColumna($cellRef);
                    $cellValue = '';

                    if (isset($cell['t']) && (string) $cell['t'] === 's') {
                        $stringIndex = (int) $cell->v;
                        if (isset($sharedStrings[$stringIndex])) {
                            $cellValue = $sharedStrings[$stringIndex];
                        }
                    } elseif (isset($cell->v)) {
                        $cellValue = (string) $cell->v;
                    }

                    $rowData[$colNum] = $cellValue;
                }

                $rowData = array_values($rowData);
                while (count($rowData) > 0 && end($rowData) === '') {
                    array_pop($rowData);
                }

                if (!empty($rowData) && !empty(array_filter($rowData))) {
                    fputcsv($csvFile, $rowData);
                }
            }
        }

        fclose($csvFile);
        return $csvPath;

    } catch (Exception $e) {
        if (isset($csvFile) && is_resource($csvFile)) {
            fclose($csvFile);
        }
        if (isset($csvPath) && file_exists($csvPath)) {
            unlink($csvPath);
        }
        throw new Exception("Error convirtiendo XLSX a CSV: " . $e->getMessage());
    }
}

function obtenerNumeroColumna($cellRef)
{
    $col = preg_replace('/[0-9]+/', '', $cellRef);
    $colNum = 0;
    $len = strlen($col);

    for ($i = 0; $i < $len; $i++) {
        $colNum = $colNum * 26 + (ord($col[$i]) - ord('A') + 1);
    }

    return $colNum - 1;
}

function obtenerCentroCosto($ilabor, $codigo_elemento)
{
    $database = new Database();
    $conn = $database->connect();

    $mapeoIlabor = [
        'PERIODICOS' => '11212317002',
        'PULICOMERCIALES' => '11212317003',
        'REVISTAS' => '11212317001',
        'PLEGADIZAS' => '11212317004'
    ];

    if (!empty(trim($ilabor))) {
        $ilaborUpper = strtoupper(trim($ilabor));
        if (isset($mapeoIlabor[$ilaborUpper])) {
            return $mapeoIlabor[$ilaborUpper];
        }

        try {
            $query = "SELECT codigo FROM centros_costos WHERE UPPER(nombre) LIKE UPPER(:ilabor)";
            $stmt = $conn->prepare($query);
            $searchTerm = '%' . $ilabor . '%';
            $stmt->bindParam(':ilabor', $searchTerm);
            $stmt->execute();

            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($result) {
                return $result['codigo'];
            }
        } catch (Exception $e) {
            error_log("Error buscando centro de costo por ILABOR: " . $e->getMessage());
        }
    }

    $mapeoElemento = [
        '72312' => '11212317005',
        '54003' => '11212317006',
        '62027' => '11212317007',
        '62028' => '11212317007',
        '62031' => '11212317007'
    ];

    if (!empty($codigo_elemento) && isset($mapeoElemento[$codigo_elemento])) {
        return $mapeoElemento[$codigo_elemento];
    }

    if (!empty($codigo_elemento)) {
        try {
            $query = "SELECT centro_costo_1 FROM elementos WHERE codigo = :codigo_elemento";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':codigo_elemento', $codigo_elemento);
            $stmt->execute();

            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($result && !empty($result['centro_costo_1'])) {
                return $result['centro_costo_1'];
            }
        } catch (Exception $e) {
            error_log("Error buscando centro de costo por elemento: " . $e->getMessage());
        }
    }

    return '1121231700';
}

function procesarInventarioIneditto($archivo_csv)
{
    $database = new Database();
    $conn = $database->connect();

    try {
        $conn->exec("DELETE FROM inventarios_temp");

        $fileExtension = strtolower(pathinfo($archivo_csv, PATHINFO_EXTENSION));
        $archivoAProcesar = $archivo_csv;

        if (in_array($fileExtension, ['xlsx', 'xls'])) {
            $archivoAProcesar = convertirExcelACSVNativo($archivo_csv);
        }

        if (!file_exists($archivoAProcesar)) {
            throw new Exception("Archivo no encontrado: $archivoAProcesar");
        }

        $handle = fopen($archivoAProcesar, "r");
        if ($handle === FALSE) {
            throw new Exception("No se pudo abrir el archivo");
        }

        $headers = fgetcsv($handle, 1000, ",");
        if ($headers === FALSE) {
            fclose($handle);
            throw new Exception("No se pudieron leer los headers del archivo");
        }

        $headers = array_map(function ($header) {
            return trim(str_replace("\xEF\xBB\xBF", '', $header));
        }, $headers);

        $datos = [];
        $lineNumber = 1;
        while (($row = fgetcsv($handle, 1000, ",")) !== FALSE) {
            $lineNumber++;

            if (empty(array_filter($row))) {
                continue;
            }

            if (count($row) === count($headers)) {
                $datos[] = array_combine($headers, $row);
            } else {
                error_log("Línea $lineNumber: número de columnas no coincide. Esperadas: " . count($headers) . ", encontradas: " . count($row));
            }
        }
        fclose($handle);

        if ($archivoAProcesar !== $archivo_csv && file_exists($archivoAProcesar)) {
            unlink($archivoAProcesar);
        }

        if (empty($datos)) {
            throw new Exception("No se encontraron datos válidos en el archivo");
        }

        $query = "INSERT INTO inventarios_temp 
                  (IEMP, FSOPORT, ITDSOP, INUMSOP, INVENTARIO, IRECURSO, ICCSUBCC, ILABOR,
                   QCANTLUN, QCANTMAR, QCANTMIE, QCANTJUE, QCANTVIE, QCANTSAB, QCANTDOM, 
                   SOBSERVAC, centro_costo_asignado) 
                  VALUES (:iemp, :fsoport, :itdsop, :inumsop, :inventario, :irecurso, :iccsubcc, :ilabor,
                          :qcantlun, :qcantmar, :qcantmie, :qcantjue, :qcantvie, :qcantsab, :qcantdom,
                          :sobservac, :centro_costo)";

        $stmt = $conn->prepare($query);
        $procesados = 0;
        $estadoContadorInicial = obtenerEstadoContador();

        foreach ($datos as $index => $fila) {
            try {
                $centro_costo = obtenerCentroCosto(
                    $fila['ILABOR'] ?? '',
                    $fila['IRECURSO'] ?? ''
                );

                $siguienteINUMSOP = obtenerSiguienteINUMSOP();

                $stmt->execute([
                    ':iemp' => $fila['IEMP'] ?? '1',
                    ':fsoport' => $fila['FSOPORT'] ?? '',
                    ':itdsop' => $fila['ITDSOP'] ?? '160',
                    ':inumsop' => $siguienteINUMSOP,
                    ':inventario' => $fila['INVENTARIO'] ?? '1',
                    ':irecurso' => $fila['IRECURSO'] ?? '',
                    ':iccsubcc' => $centro_costo,
                    ':ilabor' => $fila['ILABOR'] ?? '',
                    ':qcantlun' => !empty($fila['QCANTLUN']) ? floatval($fila['QCANTLUN']) : 0,
                    ':qcantmar' => !empty($fila['QCANTMAR']) ? floatval($fila['QCANTMAR']) : null,
                    ':qcantmie' => !empty($fila['QCANTMIE']) ? floatval($fila['QCANTMIE']) : null,
                    ':qcantjue' => !empty($fila['QCANTJUE']) ? floatval($fila['QCANTJUE']) : null,
                    ':qcantvie' => !empty($fila['QCANTVIE']) ? floatval($fila['QCANTVIE']) : null,
                    ':qcantsab' => !empty($fila['QCANTSAB']) ? floatval($fila['QCANTSAB']) : null,
                    ':qcantdom' => !empty($fila['QCANTDOM']) ? floatval($fila['QCANTDOM']) : null,
                    ':sobservac' => $fila['SOBSERVAC'] ?? '',
                    ':centro_costo' => $centro_costo
                ]);

                $procesados++;

            } catch (Exception $e) {
                error_log("Error procesando fila " . ($index + 2) . ": " . $e->getMessage() . " - Datos: " . print_r($fila, true));
            }
        }

        $estadoContadorFinal = obtenerEstadoContador();
        error_log("Contador INUMSOP - Inicial: " . $estadoContadorInicial['valor_actual'] . ", Final: " . $estadoContadorFinal['valor_actual']);

        return $procesados;

    } catch (Exception $e) {
        if (isset($handle) && is_resource($handle)) {
            fclose($handle);
        }
        if (isset($archivoAProcesar) && $archivoAProcesar !== $archivo_csv && file_exists($archivoAProcesar)) {
            unlink($archivoAProcesar);
        }
        throw new Exception("Error procesando inventario: " . $e->getMessage());
    }
}

function limpiarHeaders($headers)
{
    return array_map(function ($header) {
        return trim(str_replace("\xEF\xBB\xBF", '', $header));
    }, $headers);
}

function procesarArchivoCSV($archivo_csv, $callback)
{
    $fileExtension = strtolower(pathinfo($archivo_csv, PATHINFO_EXTENSION));
    $archivoAProcesar = $archivo_csv;

    if (in_array($fileExtension, ['xlsx', 'xls'])) {
        $archivoAProcesar = convertirExcelACSVNativo($archivo_csv);
    }

    $handle = null;
    try {
        if (!file_exists($archivoAProcesar)) {
            throw new Exception("Archivo no encontrado: $archivoAProcesar");
        }

        $handle = fopen($archivoAProcesar, "r");
        if ($handle === FALSE) {
            throw new Exception("No se pudo abrir el archivo");
        }

        $headers = fgetcsv($handle, 1000, ",");
        if ($headers === FALSE) {
            throw new Exception("No se pudieron leer los headers del archivo");
        }

        $headers = limpiarHeaders($headers);
        $importados = $callback($handle, $headers);

        fclose($handle);

        if ($archivoAProcesar !== $archivo_csv && file_exists($archivoAProcesar)) {
            unlink($archivoAProcesar);
        }

        return $importados;

    } catch (Exception $e) {
        if ($handle && is_resource($handle)) {
            fclose($handle);
        }
        if (isset($archivoAProcesar) && $archivoAProcesar !== $archivo_csv && file_exists($archivoAProcesar)) {
            unlink($archivoAProcesar);
        }
        throw $e;
    }
}

function importarCentrosCostos($archivo_csv)
{
    $database = new Database();
    $conn = $database->connect();

    return procesarArchivoCSV($archivo_csv, function ($handle, $headers) use ($conn) {
        $query = "INSERT INTO centros_costos (codigo, nombre) VALUES (:codigo, :nombre)
                  ON DUPLICATE KEY UPDATE nombre = :nombre2";
        $stmt = $conn->prepare($query);
        $importados = 0;

        while (($row = fgetcsv($handle, 1000, ",")) !== FALSE) {
            if (count($row) === count($headers)) {
                $data = array_combine($headers, $row);

                $codigo = trim($data['Codigo'] ?? $data['codigo'] ?? '');
                $nombre = trim($data['Nombre'] ?? $data['nombre'] ?? '');

                if (!empty($codigo) && !empty($nombre)) {
                    try {
                        $stmt->execute([
                            ':codigo' => $codigo,
                            ':nombre' => $nombre,
                            ':nombre2' => $nombre
                        ]);
                        $importados++;
                    } catch (Exception $e) {
                        error_log("Error importando centro de costo: " . $e->getMessage());
                    }
                }
            }
        }

        return $importados;
    });
}

function importarElementos($archivo_csv)
{
    $database = new Database();
    $conn = $database->connect();

    return procesarArchivoCSV($archivo_csv, function ($handle, $headers) use ($conn) {
        $query = "INSERT INTO elementos 
                  (codigo, referencia, descripcion, centro_costo_1, centro_costo_2, centro_costo_3, centro_costo_4, centro_costo_5) 
                  VALUES (:codigo, :referencia, :descripcion, :cc1, :cc2, :cc3, :cc4, :cc5)
                  ON DUPLICATE KEY UPDATE 
                  referencia = :referencia2,
                  descripcion = :descripcion2,
                  centro_costo_1 = :cc1_2,
                  centro_costo_2 = :cc2_2,
                  centro_costo_3 = :cc3_2,
                  centro_costo_4 = :cc4_2,
                  centro_costo_5 = :cc5_2";

        $stmt = $conn->prepare($query);
        $importados = 0;

        while (($row = fgetcsv($handle, 1000, ",")) !== FALSE) {
            if (count($row) === count($headers)) {
                $data = array_combine($headers, $row);

                $codigo = trim($data['Cód. Artículo'] ?? $data['codigo'] ?? '');
                $referencia = trim($data['Referencia'] ?? $data['referencia'] ?? '');
                $descripcion = trim($data['Descripción'] ?? $data['descripcion'] ?? '');

                if (!empty($codigo)) {
                    try {
                        $cc1 = !empty($data['Centro Costos 1']) ? trim($data['Centro Costos 1']) : null;
                        $cc2 = !empty($data['Centro Costos 2']) ? trim($data['Centro Costos 2']) : null;
                        $cc3 = !empty($data['Centro Costos 3']) ? trim($data['Centro Costos 3']) : null;
                        $cc4 = !empty($data['Centro Costos 4']) ? trim($data['Centro Costos 4']) : null;
                        $cc5 = !empty($data['Centro Costos 5']) ? trim($data['Centro Costos 5']) : null;

                        $stmt->execute([
                            ':codigo' => $codigo,
                            ':referencia' => $referencia,
                            ':descripcion' => $descripcion,
                            ':cc1' => $cc1,
                            ':cc2' => $cc2,
                            ':cc3' => $cc3,
                            ':cc4' => $cc4,
                            ':cc5' => $cc5,
                            ':referencia2' => $referencia,
                            ':descripcion2' => $descripcion,
                            ':cc1_2' => $cc1,
                            ':cc2_2' => $cc2,
                            ':cc3_2' => $cc3,
                            ':cc4_2' => $cc4,
                            ':cc5_2' => $cc5
                        ]);
                        $importados++;
                    } catch (Exception $e) {
                        error_log("Error importando elemento: " . $e->getMessage());
                    }
                }
            }
        }

        return $importados;
    });
}

function obtenerEstadisticasTablaTemp()
{
    $database = new Database();
    $conn = $database->connect();

    try {
        $query = "SELECT 
                    COUNT(*) as total_registros,
                    COUNT(CASE WHEN ILABOR IS NULL OR ILABOR = '' THEN 1 END) as ilabor_vacios,
                    COUNT(DISTINCT centro_costo_asignado) as centros_costo_diferentes,
                    COALESCE(SUM(QCANTLUN), 0) as suma_cantidades,
                    MIN(INUMSOP) as primer_inumsop,
                    MAX(INUMSOP) as ultimo_inumsop
                  FROM inventarios_temp";

        $stmt = $conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $estadoContador = obtenerEstadoContador();
        $result['contador_actual'] = $estadoContador['valor_actual'];
        $result['proximo_inumsop'] = $estadoContador['proximo_valor'];
        
        return $result;
    } catch (Exception $e) {
        error_log("Error obteniendo estadísticas: " . $e->getMessage());
        return [
            'total_registros' => 0,
            'ilabor_vacios' => 0,
            'centros_costo_diferentes' => 0,
            'suma_cantidades' => 0,
            'primer_inumsop' => 0,
            'ultimo_inumsop' => 0,
            'contador_actual' => 0,
            'proximo_inumsop' => 1
        ];
    }
}

/**
 * 
 * @return int
 */
function obtenerSiguienteINUMSOP()
{
    $database = new Database();
    $conn = $database->connect();
    
    try {
        $conn->beginTransaction();
        $checkQuery = "SELECT valor_actual FROM contadores WHERE nombre = 'INUMSOP'";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->execute();
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            $insertQuery = "INSERT INTO contadores (nombre, valor_actual) VALUES ('INUMSOP')";
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->execute();
            $valorActual = 0;
        } else {
            $valorActual = $result['valor_actual'];
        }
        
        $updateQuery = "UPDATE contadores SET valor_actual = valor_actual + 1 WHERE nombre = 'INUMSOP'";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->execute();
        
        $siguienteNumero = $valorActual + 1;
        
        $conn->commit();
        
        return $siguienteNumero;
        
    } catch (Exception $e) {
        $conn->rollBack();
        error_log("Error obteniendo siguiente INUMSOP: " . $e->getMessage());
        throw new Exception("Error al obtener número consecutivo: " . $e->getMessage());
    }
}

/**
 * 
 * @return array 
 */
function obtenerEstadoContador()
{
    $database = new Database();
    $conn = $database->connect();
    
    try {
        $query = "SELECT valor_actual, 
                         (valor_actual + 1) as proximo_valor,
                         fecha_actualizacion 
                  FROM contadores 
                  WHERE nombre = 'INUMSOP'";
        
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            $insertQuery = "INSERT INTO contadores (nombre, valor_actual) VALUES ('INUMSOP')";
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->execute();
            
            return [
                'valor_actual' => 0,
                'proximo_valor' => 1,
                'fecha_actualizacion' => date('Y-m-d H:i:s')
            ];
        }
        
        return $result;
        
    } catch (Exception $e) {
        error_log("Error obteniendo estado del contador: " . $e->getMessage());
        return [
            'valor_actual' => 0,
            'proximo_valor' => 1,
            'fecha_actualizacion' => date('Y-m-d H:i:s')
        ];
    }
}

/**
 * 
 * @param string 
 * @return bool 
 */
function existeINUMSOP($inumsop)
{
    $database = new Database();
    $conn = $database->connect();
    
    try {
        $query = "SELECT COUNT(*) as existe FROM inventarios_temp WHERE INUMSOP = :inumsop";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':inumsop', $inumsop);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['existe'] > 0;
        
    } catch (Exception $e) {
        error_log("Error verificando INUMSOP existente: " . $e->getMessage());
        return false;
    }
}

/**
 * 
 * @param int 
 * @return bool
 */
function reiniciarContadorINUMSOP($nuevoValor = 1)
{
    $database = new Database();
    $conn = $database->connect();
    
    try {
        $query = "UPDATE contadores SET valor_actual = :nuevo_valor WHERE nombre = 'INUMSOP'";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':nuevo_valor', $nuevoValor, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
        
    } catch (Exception $e) {
        error_log("Error reiniciando contador INUMSOP: " . $e->getMessage());
        return false;
    }
}
?>