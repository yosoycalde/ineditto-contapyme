<?php
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../config/handler.php';

try {
    $database = new Database();
    $conn = $database->connect();

    $query = "SELECT 
                IRECURSO as codigo_elemento,
                ICCSUBCC as descripcion_categoria, 
                QCANTLUN as cantidad,
                FSOPORT as fecha_movimiento,
                centro_costo_asignado,
                ILABOR as labor_original,
                SOBSERVAC as observaciones,
                INUMSOP as numero_consecutivo
              FROM inventarios_temp 
              ORDER BY INUMSOP DESC
              LIMIT 15";

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $statsQuery = "SELECT 
                    COUNT(*) as total_registros,
                    COUNT(CASE WHEN ILABOR IS NULL OR ILABOR = '' THEN 1 END) as registros_sin_labor,
                    COUNT(DISTINCT centro_costo_asignado) as centros_costo_utilizados,
                    SUM(QCANTLUN) as suma_total_cantidades,
                    MIN(fecha_procesamiento) as primer_registro,
                    MAX(fecha_procesamiento) as ultimo_registro,
                    MIN(INUMSOP) as primer_inumsop,
                    MAX(INUMSOP) as ultimo_inumsop,
                    COUNT(DISTINCT INUMSOP) as inumsop_unicos
                   FROM inventarios_temp";

    $statsStmt = $conn->prepare($statsQuery);
    $statsStmt->execute();
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    $distQuery = "SELECT centro_costo_asignado, COUNT(*) as cantidad_registros 
                  FROM inventarios_temp 
                  GROUP BY centro_costo_asignado 
                  ORDER BY cantidad_registros DESC";

    $distStmt = $conn->prepare($distQuery);
    $distStmt->execute();
    $distribucion = $distStmt->fetchAll(PDO::FETCH_ASSOC);

    $estadoContador = obtenerEstadoContador();
    
    $integridadQuery = "SELECT 
                        COUNT(*) as total_registros,
                        COUNT(DISTINCT INUMSOP) as inumsop_unicos,
                        (COUNT(*) - COUNT(DISTINCT INUMSOP)) as duplicados_inumsop
                        FROM inventarios_temp";
    
    $integridadStmt = $conn->prepare($integridadQuery);
    $integridadStmt->execute();
    $integridad = $integridadStmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $results,
        'statistics' => $stats,
        'distribucion_centros_costo' => $distribucion,
        'contador_info' => [
            'valor_actual' => $estadoContador['valor_actual'],
            'proximo_valor' => $estadoContador['proximo_valor'],
            'fecha_actualizacion' => $estadoContador['fecha_actualizacion'] ?? date('Y-m-d H:i:s')
        ],
        'integridad_inumsop' => [
            'total_registros' => $integridad['total_registros'],
            'inumsop_unicos' => $integridad['inumsop_unicos'],
            'duplicados' => $integridad['duplicados_inumsop'],
            'integridad_ok' => $integridad['duplicados_inumsop'] == 1
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener vista previa: ' . $e->getMessage()
    ]);
}
?>