<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
require_once '../config/database.php';
function limpiarArchivosTemporales() {
    $uploadDir = '../uploads/';
    if (!is_dir($uploadDir)) {
        return 0;
    }
    $archivos = scandir($uploadDir);
    $archivosEliminados = 0;
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
    return $archivosEliminados;
}
function limpiarTablaTemporalInventarios() {
    try {
        $database = new Database();
        $conn = $database->connect();       
        $query = "DELETE FROM inventarios_temp";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        return $stmt->rowCount();
    } catch (Exception $e) {
        error_log("Error limpiando tabla temporal: " . $e->getMessage());
        throw new Exception("Error al limpiar la tabla temporal: " . $e->getMessage());
    }
}
function realizarLimpiezaCompleta() {
    try {
        $archivosEliminados = limpiarArchivosTemporales();
        $registrosEliminados = limpiarTablaTemporalInventarios();       
        return [
            'success' => true,
            'message' => 'Limpieza completada exitosamente',
            'archivos_eliminados' => $archivosEliminados,
            'registros_eliminados' => $registrosEliminados
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error durante la limpieza: ' . $e->getMessage()
        ];
    }
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo json_encode(realizarLimpiezaCompleta());
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido. Se requiere POST.'
    ]);
}
?> 