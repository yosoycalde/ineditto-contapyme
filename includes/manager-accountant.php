<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';
require_once '../config/handler.php';

function inicializarTablaContadores()
{
    $database = new Database();
    $conn = $database->connect();
    
    try {
        $createTableQuery = "CREATE TABLE IF NOT EXISTS contadores (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nombre VARCHAR(50) UNIQUE NOT NULL,
            valor_actual INT NOT NULL DEFAULT 0,
            fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";
        $conn->exec($createTableQuery);
        
        $insertCounterQuery = "INSERT IGNORE INTO contadores (nombre, valor_actual) VALUES ('INUMSOP')";
        $conn->exec($insertCounterQuery);
        
        return true;
    } catch (Exception $e) {
        error_log("Error inicializando tabla contadores: " . $e->getMessage());
        return false;
    }
}

function manejarPeticion()
{
    inicializarTablaContadores();
    
    $metodo = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    switch ($metodo) {
        case 'GET':
            if (isset($_GET['action'])) {
                switch ($_GET['action']) {
                    case 'estado':
                        return obtenerEstadoCompleto();
                    case 'proximo':
                        return obtenerProximoNumero();
                    case 'validar':
                        $numero = $_GET['numero'] ?? '';
                        return validarNumeroUnico($numero);
                    default:
                        return ['success' => false, 'message' => 'Acción GET no válida'];
                }
            }
            return obtenerEstadoCompleto();
            
        case 'POST':
            if (isset($input['action'])) {
                switch ($input['action']) {
                    case 'reiniciar':
                        $nuevoValor = $input['valor'] ?? 0;
                        return reiniciarContador($nuevoValor);
                    case 'incrementar':
                        return incrementarContador();
                    case 'establecer':
                        $valor = $input['valor'] ?? 0;
                        return establecerValorContador($valor);
                    default:
                        return ['success' => false, 'message' => 'Acción POST no válida'];
                }
            }
            return ['success' => false, 'message' => 'Acción requerida para POST'];
            
        default:
            return ['success' => false, 'message' => 'Método HTTP no soportado'];
    }
}

function obtenerEstadoCompleto()
{
    try {
        $estadoContador = obtenerEstadoContador();
        $estadisticasTemp = obtenerEstadisticasTablaTemp();
        
        return [
            'success' => true,
            'contador' => $estadoContador,
            'estadisticas_temp' => $estadisticasTemp,
            'message' => 'Estado obtenido correctamente'
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error obteniendo estado: ' . $e->getMessage()
        ];
    }
}

function obtenerProximoNumero()
{
    try {
        $estadoContador = obtenerEstadoContador();
        return [
            'success' => true,
            'proximo_numero' => $estadoContador['proximo_valor'],
            'contador_actual' => $estadoContador['valor_actual']
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error obteniendo próximo número: ' . $e->getMessage()
        ];
    }
}

function validarNumeroUnico($numero)
{
    try {
        $existe = existeINUMSOP($numero);
        return [
            'success' => true,
            'numero' => $numero,
            'existe' => $existe,
            'es_unico' => !$existe
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error validando número: ' . $e->getMessage()
        ];
    }
}

function reiniciarContador($nuevoValor)
{
    try {
        $resultado = reiniciarContadorINUMSOP($nuevoValor);
        if ($resultado) {
            return [
                'success' => true,
                'message' => "Contador reiniciado a $nuevoValor",
                'nuevo_valor' => $nuevoValor,
                'proximo_valor' => $nuevoValor + 1
            ];
        } else {
            return [
                'success' => false,
                'message' => 'No se pudo reiniciar el contador'
            ];
        }
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error reiniciando contador: ' . $e->getMessage()
        ];
    }
}

function incrementarContador()
{
    try {
        $siguienteNumero = obtenerSiguienteINUMSOP();
        return [
            'success' => true,
            'message' => 'Contador incrementado',
            'numero_generado' => $siguienteNumero,
            'proximo_valor' => $siguienteNumero + 1
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error incrementando contador: ' . $e->getMessage()
        ];
    }
}

function establecerValorContador($valor)
{
    $database = new Database();
    $conn = $database->connect();
    
    try {
        $query = "UPDATE contadores SET valor_actual = :valor WHERE nombre = 'INUMSOP'";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':valor', $valor, PDO::PARAM_INT);
        $stmt->execute();
        
        return [
            'success' => true,
            'message' => "Contador establecido a $valor",
            'valor_actual' => $valor,
            'proximo_valor' => $valor + 1
        ];
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error estableciendo valor del contador: ' . $e->getMessage()
        ];
    }
}

echo json_encode(manejarPeticion());
?>