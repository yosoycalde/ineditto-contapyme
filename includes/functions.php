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
        'PERIODICOS' => '11212117001',
        'PULICOMERCIALES' => '11212417001',
        'REVISTAS' => '11212317001',
        'PLEGADIZAS' => '11212517001',
        'LIBROS' => '11212217001',
        'CIRCULACION' => '11211217001',
        'MANTENIMIENTO' => '11216317001',
        'ADM-RECURSOS HUMANOS' => '11216117001'

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
        '76001' => '11212317001',
        '76019' => '11212417001', 
        '72003' => '11212517001', 
        '72002' => '11212517001', 
        '75018' => '11212217001',
        '75004' => '11212317001',
        '75019' => '11212517001',
        '75012' => '11212517001',
        '38016' => '11212517001',
        '63201' => '11212417001',
        '82011' => '11212517001',
        '112804' => '11212517001',
        '71001' => '11211217001',
        '2071010' => '11212317001',
        '2071011' => '11212317001',
        '2071012' => '11212317001',
        '2071006' => '11212317001',
        '2071015' => '11212417001',
        '73106' => '11212317001',
        '73002' => '11212317001',
        '73105' => '11212317001',
        '73003' => '11212317001',
        '73113' => '11212317001',
        '73114' => '11212317001',
        '73112' => '11212317001',
        '72312' => '11212317001',
        '74151' => '11212117001',
        '74101' => '11212117001',
        '71011' => '11212117001',
        '71012' => '11212117001',
        '82053' => '11212317001',
        '74002' => '11212517001',
        '132004' => '11212117001',
        '62032' => '11212417001',
        '62028' => '11212417001',
        '62031' => '11212117001',
        '62027' => '11212117001',
        '93701' => '11212417001',
        '82006' => '11212517001',
        '63003' => '11212317001',
        '81601' => '11212317001',
        '63004' => '11212417001',
        '63305' => '11212417001',
        '63303' => '11212417001',
        '55603' => '11212317001',
        '55523' => '11212317001',
        '55530' => '11212317001',
        '55522' => '11212317001',
        '63410' => '11216317001',
        '55524' => '11212117001',
        '81501' => '11212317001',
        '82009' => '11212317001',
        '31014' => '11212317001',
        '31012' => '11212317001',
        '32004' => '11212317001',
        '32002' => '11212317001',
        '33041' => '11212317001',
        '33001' => '11212317001',
        '33011' => '11212317001',
        '34001' => '11212317001',
        '34011' => '11212317001',
        '35012' => '11212317001',
        '35011' => '11212317001',
        '46007' => '11216117001',
        '42012' => '11212117001',
        '42021' => '11212517001',
        '43002' => '11212517001',
        '430055' => '11212517001',
        '430054' => '11212517001',
        '430053' => '11212517001',
        '430051' => '11212517001',
        '43016' => '11212517001',
        '480213' => '11212517001',
        '480213' => '11212517001',
        '480211' => '11212517001',
        '46029' => '11212517001',
        '49091' => '11212517001',
        '430148' => '11212517001',
        '430147' => '11212517001',
        '430145' => '11212517001',
        '430144' => '11212517001',
        '430143' => '11212517001',
        '430142' => '11212517001',
        '430141' => '11212517001',
        '49051' => '11216117001',
        '43025' => '11212517001',
        '49081' => '11212517001',
        '43018' => '11212517001',
        '43024' => '11212517001',
        '43021' => '11212517001',
        '43026' => '11212517001',
        '43022' => '11212517001',
        '36312' => '11212517001',
        '36211' => '11212517001',
        '36201' => '11212517001',
        '36102' => '11212517001',
        '36101' => '11212517001',
        '36261' => '11212517001',
        '36103' => '11212517001',
        '36151' => '11212517001',
        '36301' => '11212517001',
        '363074' => '11212517001',
        '363073' => '11212517001',
        '363072' => '11212517001',
        '363071' => '11212517001',
        '13001' => '11212417001',
        '13002' => '11212417001',
        '29066' => '11212417001',
        '37021' => '11212417001',
        '29065' => '11212317001',
        '29064' => '11212317001',
        '290701' => '11212317001',
        '46005' => '11212517001',
        '46013' => '11212517001',
        '38012' => '11216117001',
        '38010' => '11212317001',
        '18003' => '11212117001',
        '38014' => '11216117001',
        '38019' => '11216117001',
        '38003' => '11212417001',
        '38001' => '11212417001',
        '38031' => '11212317001',
        '11015' => '11212117001',
        '17028' => '11212117001',
        '17027' => '11212117001',
        '17029' => '11212117001',
        '17025' => '11212117001',
        '17026' => '11212117001',
        '17022' => '11212117001',
        '17020' => '11212117001',
        '21002' => '11212417001',
        '22002' => '11212417001',
        '22012' => '11212417001',
        '23002' => '11212417001',
        '23012' => '11212417001',
        '25002' => '11212417001',
        '25012' => '11212417001',
        '26012' => '11212417001',
        '28022' => '11212417001',
        '21014' => '11212417001',
        '24001' => '11212417001',
        '25811' => '11212417001',
        '27011' => '11212417001',
        '28012' => '11212417001',
        '28021' => '11212417001',
        '21001' => '11212417001',
        '22005' => '11212417001',
        '22001' => '11212417001',
        '22013' => '11212417001',
        '23001' => '11212417001',
        '23011' => '11212417001',
        '24005' => '11212417001',
        '25001' => '11212417001',
        '25011' => '11212417001',
        '26001' => '11212417001',
        '26011' => '11212417001',
        '28001' => '11212417001',
        '28011' => '11212417001',
        '29002' => '11212217001',
        '29001' => '11212217001',
        '29003' => '11212217001',
        '11016' => '11212117001',
        '16011' => '11212117001',
        '14004' => '11212117001',
        '17002' => '11212117001',
        '21401' => '11212317001',
        '54005' => '11212417001',
        '52012' => '11212417001',
        '52034' => '11212417001',
        '53005' => '11212417001',
        '54003' => '11212117001',
        '52031' => '11212417001',
        '51011' => '11212417001',
        '51051' => '11212417001',
        '54055' => '11212417001',
        '51081' => '11212417001',
        '52062' => '11212417001',
        '53060' => '11212417001',
        '53101' => '11212417001',
        '54307' => '11212417001',
        '53102' => '11212417001',
        '53053' => '11212417001',
        '53061' => '11212417001',
        '54053' => '11212117001',
        '52081' => '11212417001',
        '55102' => '11212517001',
        '55114' => '11212417001',
        '55111' => '11212417001',
        '55121' => '11212417001',
        '53240' => '11212417001',
        '51101' => '11212417001',
        '51701' => '11212417001',
        '51602' => '11212417001',
        '54105' => '11212417001',
        '54103' => '11212117001',
        '52231' => '11212417001',
        '51251' => '11212417001',
        '53251' => '11212417001',
        '53254' => '11212417001',
        '53252' => '11212417001',
        '54205' => '11212417001',
        '54203' => '11212117001',
        '52301' => '11212417001',
        '52312' => '11212417001',
        '52331' => '11212417001',
        '53262' => '11212517001',
        '53302' => '11212417001',
        '53223' => '11212517001',
        '51401' => '11212417001',
        '55601' => '11212417001',
        '55301' => '11212417001',
        '53205' => '11212417001',
        '51361' => '11212417001',
        '53203' => '11212417001',
        '53210' => '11212417001',
        '53209' => '11212417001',
        '53212' => '11212417001',
        '53202' => '11212417001',
        '51521' => '11212417001',
        '54312' => '11212417001',
        '53171' => '11212417001',
        '53159' => '11212417001',
        '54310' => '11212417001',
        '54301' => '11212417001',
        '74203' => '11212517001',
        '74209' => '11212517001',
        '74208' => '11212517001',
        '74201' => '11212517001',
        '74202' => '11212517001',
        '74204' => '11212517001',
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
                // Obtener siguiente número consecutivo ENTERO
                $siguienteINUMSOP = obtenerSiguienteINUMSOP();
                $stmt->execute([
                    ':iemp' => $fila['IEMP'] ?? '1',
                    ':fsoport' => $fila['FSOPORT'] ?? '',
                    ':itdsop' => $fila['ITDSOP'] ?? '160',
                    ':inumsop' => $siguienteINUMSOP, // Número entero consecutivo
                    ':inventario' => $fila['INVENTARIO'] ?? '1',
                    ':irecurso' => $fila['IRECURSO'] ?? '',
                    ':iccsubcc' => $centro_costo,
                    ':ilabor' => $fila['ILABOR'] ?? '',
                    ':qcantlun' => !empty($fila['QCANTLUN']) ? floatval($fila['QCANTLUN']) : null,
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
            'primer_inumsop' => 1,
            'ultimo_inumsop' => 1,
            'contador_actual' => 1,
            'proximo_inumsop' => 2
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
            $insertQuery = "INSERT INTO contadores (nombre, valor_actual) VALUES ('INUMSOP', 1)";
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->execute();
            $valorActual = 1;
        } else {
            $valorActual = (int)$result['valor_actual'];
        }
        $updateQuery = "UPDATE contadores SET valor_actual = valor_actual + 1 WHERE nombre = 'INUMSOP'";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->execute();
        $siguienteNumero = $valorActual;
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
            // Crear contador inicial
            $insertQuery = "INSERT INTO contadores (nombre, valor_actual) VALUES ('INUMSOP', 1)";
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->execute();
            return [
                'valor_actual' => 1,
                'proximo_valor' => 2,
                'fecha_actualizacion' => date('Y-m-d H:i:s')
            ];
        }
        return [
            'valor_actual' => (int)$result['valor_actual'],
            'proximo_valor' => (int)$result['proximo_valor'],
            'fecha_actualizacion' => $result['fecha_actualizacion']
        ];
    } catch (Exception $e) {
        error_log("Error obteniendo estado del contador: " . $e->getMessage());
        return [
            'valor_actual' => 1,
            'proximo_valor' => 2,
            'fecha_actualizacion' => date('Y-m-d H:i:s')
        ];
    }
}

/**
 *
 * @param string|int 
 * @return bool 
 */
function existeINUMSOP($inumsop)
{
    $database = new Database();
    $conn = $database->connect();   
    try {
        $query = "SELECT COUNT(*) as existe FROM inventarios_temp WHERE INUMSOP = :inumsop";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':inumsop', $inumsop, PDO::PARAM_INT);
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