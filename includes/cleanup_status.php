<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';


function verificarEstadoLimpieza()
{
    try {
        $database = new Database();
        $conn = $database->connect();


        $query = "SELECT COUNT(*) as total_registros FROM inventarios_temp";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $registrosTemporales = $result['total_registros'];


        $uploadDir = '../uploads/';
        $archivosTemporales = 0;

        if (is_dir($uploadDir)) {
            $archivos = scandir($uploadDir);
            foreach ($archivos as $archivo) {
                if ($archivo === '.' || $archivo === '..')
                    continue;

                $rutaArchivo = $uploadDir . $archivo;
                if (is_file($rutaArchivo) && preg_match('/^\d+_/', $archivo)) {
                    $archivosTemporales++;
                }
            }
        }

        $estaLimpio = ($registrosTemporales === 0 && $archivosTemporales === 0);

        return [
            'success' => true,
            'limpio' => $estaLimpio,
            'registros_temporales' => $registrosTemporales,
            'archivos_temporales' => $archivosTemporales,
            'message' => $estaLimpio ? 'Sistema limpio' : 'Pendiente de limpieza'
        ];

    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error verificando estado: ' . $e->getMessage()
        ];
    }
}

function realizarLimpiezaForzada()
{
    try {
        $database = new Database();
        $conn = $database->connect();

        $query = "DELETE FROM inventarios_temp";
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $registrosEliminados = $stmt->rowCount();

        $uploadDir = '../uploads/';
        $archivosEliminados = 0;

        if (is_dir($uploadDir)) {
            $archivos = scandir($uploadDir);
            foreach ($archivos as $archivo) {
                if ($archivo === '.' || $archivo === '..')
                    continue;

                $rutaArchivo = $uploadDir . $archivo;
                if (is_file($rutaArchivo) && preg_match('/^\d+_/', $archivo)) {
                    if (unlink($rutaArchivo)) {
                        $archivosEliminados++;
                    }
                }
            }
        }

        return [
            'success' => true,
            'archivos_eliminados' => $archivosEliminados,
            'registros_eliminados' => $registrosEliminados,
            'message' => 'Limpieza forzada completada'
        ];

    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error en limpieza forzada: ' . $e->getMessage()
        ];
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(verificarEstadoLimpieza());
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo json_encode(realizarLimpiezaForzada());
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Método no permitido'
    ]);
}
?>
