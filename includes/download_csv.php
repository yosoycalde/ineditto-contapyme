<?php
ob_start();
require_once '../config/database.php';

try {
    $database = new Database();
    $conn = $database->connect();
    
    // Verificar que hay datos para descargar
    $checkQuery = "SELECT COUNT(*) as total FROM inventarios_temp";
    $checkStmt = $conn->prepare($checkQuery);
    $checkStmt->execute();
    $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['total'] == 0) {
        throw new Exception("No hay datos procesados para descargar. Primero debe procesar un archivo de inventario.");
    }
    
    // Obtener los datos procesados - AQUÍ ESTÁ LA CORRECCIÓN PRINCIPAL
    $query = "SELECT IEMP, FSOPORT, ITDSOP, INUMSOP, INVENTARIO, IRECURSO, 
                     centro_costo_asignado as ICCSUBCC, ILABOR, QCANTLUN, QCANTMAR, 
                     QCANTMIE, QCANTJUE, QCANTVIE, QCANTSAB, QCANTDOM, SOBSERVAC 
              FROM inventarios_temp 
              ORDER BY INUMSOP ASC";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($resultados)) {
        throw new Exception("No se encontraron datos para procesar");
    }
    
    // Limpiar buffer de salida
    ob_clean();
    ob_start();
    
    // Crear archivo CSV
    $csvOutput = fopen('php://output', 'w');
    
    // Agregar BOM UTF-8
    fprintf($csvOutput, chr(0xEF) . chr(0xBB) . chr(0xBF));
    
    // Headers del CSV
    $headers = [
        'IEMP',
        'FSOPORT', 
        'ITDSOP',
        'INUMSOP',
        'INVENTARIO',
        'IRECURSO',
        'ICCSUBCC',
        'ILABOR',
        'QCANTLUN',
        'QCANTMAR',
        'QCANTMIE', 
        'QCANTJUE',
        'QCANTVIE',
        'QCANTSAB',
        'QCANTDOM',
        'SOBSERVAC'
    ];
    
    fputcsv($csvOutput, $headers);
    
    // Escribir los datos - CORRECCIÓN: Usar INUMSOP de la base de datos
    foreach ($resultados as $row) {
        $csvRow = [
            $row['IEMP'] ?? '',
            $row['FSOPORT'] ?? '',
            $row['ITDSOP'] ?? '',
            (int)$row['INUMSOP'], // ASEGURAR QUE SEA ENTERO
            $row['INVENTARIO'] ?? '',
            $row['IRECURSO'] ?? '',
            $row['ICCSUBCC'] ?? '',
            '', // ILABOR vacío según el formato requerido
            $row['QCANTLUN'] ?? '',
            '', // Campos de otros días vacíos según formato
            '',
            '',
            '',
            '',
            '',
            $row['SOBSERVAC'] ?? ''
        ];
        
        fputcsv($csvOutput, $csvRow);
    }
    
    fclose($csvOutput);
    $csvContent = ob_get_contents();
    ob_end_clean();
    
    // Realizar limpieza automática después de generar el CSV
    realizarLimpiezaCompleta($conn);
    
    // Headers para descarga
    $filename = 'contapyme_' . date('Y-m-d_H-i-s') . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-cache, must-revalidate');
    header('Expires: Sat, 26 Jul 1997 05:00:00 GMT');
    header('Pragma: no-cache');
    header('Content-Length: ' . strlen($csvContent));
    
    echo $csvContent;
    exit; 
    
} catch (Exception $e) {
    ob_end_clean();
    mostrarErrorDescarga($e->getMessage());
}

function realizarLimpiezaCompleta($conn)
{
    try {
        // Eliminar registros de la tabla temporal
        $deleteQuery = "DELETE FROM inventarios_temp";
        $deleteStmt = $conn->prepare($deleteQuery);
        $deleteStmt->execute();
        $registrosEliminados = $deleteStmt->rowCount();
        
        // Eliminar archivos temporales
        $uploadDir = '../uploads/';
        $archivosEliminados = 0;
        
        if (is_dir($uploadDir)) {
            $archivos = scandir($uploadDir);
            foreach ($archivos as $archivo) {
                if ($archivo === '.' || $archivo === '..') {
                    continue;
                }
                
                $rutaArchivo = $uploadDir . $archivo;
                if (is_file($rutaArchivo) && preg_match('/^\d+_/', $archivo)) {
                    if (unlink($rutaArchivo)) {
                        $archivosEliminados++;
                    }
                }
            }
        }
        
        error_log("Limpieza completada: $archivosEliminados archivos y $registrosEliminados registros eliminados");

    } catch (Exception $e) {
        error_log("Error en limpieza automática: " . $e->getMessage());
    }
}

function mostrarErrorDescarga($mensaje)
{
    include __DIR__ . "/../config/error.html";
}
?>