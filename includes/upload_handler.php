<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
require_once '../config/database.php';
require_once 'functions.php';
function convertirExcelACSV($archivoExcel)
{
    $fileExtension = strtolower(pathinfo($archivoExcel, PATHINFO_EXTENSION));
    if ($fileExtension === 'csv') {
        return $archivoExcel; 
    }
    if ($fileExtension === 'xlsx') {
        return convertirXLSXACSV($archivoExcel);
    } elseif ($fileExtension === 'xls') {
        return convertirXLSACSV($archivoExcel);
    }
    throw new Exception("Formato de archivo no soportado: $fileExtension");
}
function convertirXLSXACSV($archivoXLSX)
{
    try {
        $csvPath = pathinfo($archivoXLSX, PATHINFO_DIRNAME) . '/' .
            pathinfo($archivoXLSX, PATHINFO_FILENAME) . '_converted.csv';
        $zip = new ZipArchive();
        if ($zip->open($archivoXLSX) !== TRUE) {
            throw new Exception("Formato de archivo no soportado: $fileExtension");
        }
        $sharedStrings = [];
        $worksheetData = '';
        if (($sharedStringsXML = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
            $xml = simplexml_load_string($sharedStringsXML);
            foreach ($xml->si as $si) {
                $sharedStrings[] = (string) $si->t;
            }
        }
        if (($worksheetXML = $zip->getFromName('xl/worksheets/sheet1.xml')) !== false) {
            $worksheetData = $worksheetXML;
        }
        $zip->close();
        if (empty($worksheetData)) {
            throw new Exception("No se pudo leer el contenido de la hoja de Excel");
        }
        $xml = simplexml_load_string($worksheetData);
        $csvFile = fopen($csvPath, 'w');
        $rows = [];
        foreach ($xml->sheetData->row as $row) {
            $rowData = [];
            $colIndex = 0;
            foreach ($row->c as $cell) {
                $cellValue = '';
                if (isset($cell['t']) && (string) $cell['t'] === 's') {
                    $stringIndex = (int) $cell->v;
                    if (isset($sharedStrings[$stringIndex])) {
                        $cellValue = $sharedStrings[$stringIndex];
                    }
                } else {
                    $cellValue = (string) $cell->v;
                }
                $rowData[] = $cellValue;
                $colIndex++;
            }
            if (!empty($rowData) && !empty(array_filter($rowData))) {
                fputcsv($csvFile, $rowData);
            }
        }
        fclose($csvFile);
        return $csvPath;
    } catch (Exception $e) {
        throw new Exception("Error convirtiendo XLSX a CSV: " . $e->getMessage());
    }
}
function convertirXLSACSV($archivoXLS)
{
    throw new Exception("Los archivos XLS requieren conversión manual a CSV o XLSX. Por favor, guarde el archivo como XLSX o CSV desde Excel.");
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (isset($_POST['action']) && $_POST['action'] === 'import_centros' && isset($_FILES['configFile'])) {
            $uploadDir = '../uploads/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $file = $_FILES['configFile'];
            $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($fileExtension, ['csv', 'xlsx', 'xls'])) {
                throw new Exception('Recuerda, Solo se permiten archivos CSV, XLSX o XLS');
            }
            $fileName = time() . '_centros_' . $file['name'];
            $uploadPath = $uploadDir . $fileName;
            if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                throw new Exception('Tenemos problemas en subir el archivo (Verificalo):');
            }   
            try {
                $csvPath = convertirExcelACSV($uploadPath);
                $importados = importarCentrosCostos($csvPath);
                if (file_exists($uploadPath) && $uploadPath !== $csvPath) {
                    unlink($uploadPath);
                }
                if ($csvPath !== $uploadPath && file_exists($csvPath)) {
                    unlink($csvPath);
                }
                echo json_encode([
                    'success' => true,
                    'records' => $importados,
                    'message' => "Centros de costos importados correctamente desde archivo {$fileExtension}"
                ]);
                exit; 
            } catch (Exception $e) {
                if (file_exists($uploadPath)) {
                    unlink($uploadPath);
                }
                throw $e;
            }
        }
        if (isset($_POST['action']) && $_POST['action'] === 'import_elementos' && isset($_FILES['configFile'])) {
            $uploadDir = '../uploads/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $file = $_FILES['configFile'];
            $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($fileExtension, ['csv', 'xlsx', 'xls'])) {
                throw new Exception('Solo se permiten archivos CSV, XLSX o XLS');
            }
            $fileName = time() . '_elementos_' . $file['name'];
            $uploadPath = $uploadDir . $fileName;
            if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                throw new Exception('Error al subir el archivo');
            }
            try {
                $csvPath = convertirExcelACSV($uploadPath);
                $importados = importarElementos($csvPath);
                if (file_exists($uploadPath) && $uploadPath !== $csvPath) {
                    unlink($uploadPath);
                }
                if ($csvPath !== $uploadPath && file_exists($csvPath)) {
                    unlink($csvPath);
                }
                echo json_encode([
                    'success' => true,
                    'records' => $importados,
                    'message' => "Elementos importados correctamente desde archivo {$fileExtension}"
                ]);
                exit;
            } catch (Exception $e) {
                if (file_exists($uploadPath)) {
                    unlink($uploadPath);
                }
                throw $e;
            }
        }
        if (isset($_FILES['csvFile'])) {
            $uploadDir = '../uploads/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $file = $_FILES['csvFile'];
            $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($fileExtension, ['csv', 'xlsx', 'xls'])) {
                throw new Exception('Solo se permiten archivos CSV, XLSX o XLS para el inventario');
            }
            $fileName = time() . '_inventario_' . $file['name'];
            $uploadPath = $uploadDir . $fileName;
            if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                throw new Exception('Error al subir el archivo de inventario');
            }
            try {
                $csvPath = convertirExcelACSV($uploadPath);
                $records = procesarInventarioIneditto($csvPath);
                if (file_exists($uploadPath) && $uploadPath !== $csvPath) {
                    unlink($uploadPath);
                }
                if ($csvPath !== $uploadPath && file_exists($csvPath)) {
                    unlink($csvPath);
                }
                $stats = obtenerEstadisticasTablaTemp();
                echo json_encode([
                    'success' => true,
                    'records' => $records,
                    'statistics' => $stats,
                    'message' => "Archivo de inventario {$fileExtension} procesado correctamente"
                ]);
                exit;
            } catch (Exception $e) {
                if (file_exists($uploadPath)) {
                    unlink($uploadPath);
                }
                throw $e;
            }
        }
        throw new Exception('No se encontró una acción válida o archivo requerido');
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Se requiere POST.'
    ]);
}
?> 