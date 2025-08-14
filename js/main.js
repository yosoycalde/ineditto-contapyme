document.addEventListener('DOMContentLoaded', function () {
    const uploadForm = document.getElementById('uploadForm');
    const resultsSection = document.getElementById('results');
    const previewSection = document.getElementById('preview');
    const downloadBtn = document.getElementById('downloadBtn');
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) {
        const cleanupBtn = document.createElement('button');
        cleanupBtn.id = 'cleanupBtn';
        cleanupBtn.innerHTML = ' Limpiar Archivos y Datos';
        cleanupBtn.style.display = 'none';
        cleanupBtn.style.marginLeft = '15px';
        actionButtons.appendChild(cleanupBtn);
        cleanupBtn.addEventListener('click', function () {
            if (confirm('¿Está seguro de que desea eliminar todos los archivos temporales y datos procesados?')) {
                realizarLimpiezaManual();
            }
        });
    }
    function importarArchivo(action, file, tipo) {
        const formData = new FormData();
        formData.append('action', action);
        const fileExt = file.name.split('.').pop().toUpperCase();
        showMessage(`Procesando archivo ${fileExt} - Importando ${tipo}...`, 'info');
        fetch('includes/upload_handler.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage(` ${data.message} (${data.records} registros)`, 'success');
                } else {
                    showMessage(` Error al importar ${tipo}: ${data.message}`, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage(` Error de conexión al importar ${tipo}`, 'error');
            });
    }
    uploadForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData();
        const fileInput = document.getElementById('csvFile');
        if (fileInput.files.length === 0) {
            showMessage('Por favor selecciona un archivo de inventario', 'error');
            return;
        }
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(fileExt)) {
            showMessage('Solo se permiten archivos CSV, XLSX o XLS para inventarios', 'error');
            return;
        }
        if (fileExt === 'xls') {
            if (!confirm('Los archivos XLS pueden tener problemas de compatibilidad. ¿Desea continuar? Se recomienda usar XLSX o CSV.')) {
                return;
            }
        }
        formData.append('csvFile', file);
        const processInfo = document.getElementById('processInfo');
        processInfo.innerHTML = `<p class="info"> Procesando archivo ${fileExt.toUpperCase()} de inventario y distribuyendo cantidades por día de semana...</p>`;
        resultsSection.style.display = 'block';
        fetch('includes/upload_handler.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const stats = data.statistics;

                    // Crear estadísticas de distribución por día de semana
                    let distribucionDias = '';
                    if (stats.registros_lunes > 0 || stats.registros_martes > 0 || stats.registros_miercoles > 0 ||
                        stats.registros_jueves > 0 || stats.registros_viernes > 0 || stats.registros_sabado > 0 ||
                        stats.registros_domingo > 0) {
                        distribucionDias = `
                            <div class="day-distribution">
                                <h4>📅 Distribución por día de semana:</h4>
                                <div class="day-stats">
                                    <span class="day-stat">Lunes: ${stats.registros_lunes || 0}</span>
                                    <span class="day-stat">Martes: ${stats.registros_martes || 0}</span>
                                    <span class="day-stat">Miércoles: ${stats.registros_miercoles || 0}</span>
                                    <span class="day-stat">Jueves: ${stats.registros_jueves || 0}</span>
                                    <span class="day-stat">Viernes: ${stats.registros_viernes || 0}</span>
                                    <span class="day-stat">Sábado: ${stats.registros_sabado || 0}</span>
                                    <span class="day-stat">Domingo: ${stats.registros_domingo || 0}</span>
                                </div>
                            </div>`;
                    }

                    processInfo.innerHTML = `
                    <div class="success">
                        <h3> ${data.message}</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <strong>Registros procesados:</strong> ${data.records}
                            </div>
                            <div class="stat-item">
                                <strong>Total en BD:</strong> ${stats.total_registros}
                            </div>
                            <div class="stat-item">
                                <strong>Registros sin ILABOR:</strong> ${stats.ilabor_vacios}
                            </div>
                            <div class="stat-item">
                                <strong>Centros de costo utilizados:</strong> ${stats.centros_costo_diferentes}
                            </div>
                            <div class="stat-item">
                                <strong>Suma total cantidades:</strong> ${parseFloat(stats.suma_cantidades || 0).toFixed(2)}
                            </div>
                        </div>
                        ${distribucionDias}
                        <div class="info" style="margin-top: 15px;">
                            <p> <strong>Importante:</strong> Las cantidades se han distribuido automáticamente según el día de la semana correspondiente a la fecha FSOPORT. Después de descargar el archivo CSV, todos los archivos temporales y datos procesados se eliminarán automáticamente del servidor.</p>
                        </div>
                    </div>`;
                    downloadBtn.style.display = 'inline-block';
                    const cleanupBtn = document.getElementById('cleanupBtn');
                    if (cleanupBtn) {
                        cleanupBtn.style.display = 'inline-block';
                    }
                    mostrarVistPrevia();
                } else {
                    processInfo.innerHTML = `<p class="error"> Error: ${data.message}</p>`;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                processInfo.innerHTML = '<p class="error"> Error al procesar el archivo</p>';
            });
    });
    downloadBtn.addEventListener('click', function () {
        showMessage(' Iniciando descarga y limpieza automática...', 'info');
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'includes/download_csv.php';
        document.body.appendChild(iframe);
        setTimeout(() => {
            verificarLimpiezaCompletada();
        }, 2000);
        setTimeout(() => {
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        }, 5000);
    });
    function verificarLimpiezaCompletada() {
        fetch('includes/get_preview.php')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.statistics.total_registros === 0) {
                    showMessage(' Descarga y limpieza completadas exitosamente', 'success');
                    resetearInterfaz();
                } else if (data.success && data.statistics.total_registros > 0) {
                    showMessage(' Completando limpieza...', 'info');
                    setTimeout(() => {
                        realizarLimpiezaManual();
                    }, 1000);
                } else {
                    showMessage(' Descarga completada', 'success');
                    resetearInterfaz();
                }
            })
            .catch(error => {
                console.error('Error verificando limpieza:', error);
                showMessage(' Descarga completada', 'success');
                resetearInterfaz();
            });
    }
    function resetearInterfaz() {
        downloadBtn.style.display = 'none';
        const cleanupBtn = document.getElementById('cleanupBtn');
        if (cleanupBtn) {
            cleanupBtn.style.display = 'none';
        }
        resultsSection.style.display = 'none';
        previewSection.style.display = 'none';
        document.getElementById('csvFile').value = '';
    }
    function realizarLimpiezaManual() {
        showMessage(' Realizando limpieza manual...', 'info');
        fetch('includes/cleanup.php', {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage(` Limpieza completada: ${data.archivos_eliminados} archivos y ${data.registros_eliminados} registros eliminados`, 'success');
                    resetearInterfaz();
                } else {
                    showMessage(` Error en la limpieza: ${data.message}`, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage(' Error de conexión durante la limpieza', 'error');
            });
    }
    function mostrarVistPrevia() {
        fetch('includes/get_preview.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const tableHead = document.getElementById('tableHead');
                    const tableBody = document.getElementById('tableBody');
                    tableHead.innerHTML = '';
                    tableBody.innerHTML = '';
                    const headerRow = document.createElement('tr');
                    ['Código Elemento', 'Categoría/Descripción', 'Cantidad', 'Fecha', 'Centro Costo', 'Labor Original', 'Observaciones', 'Día Semana'].forEach(header => {
                        const th = document.createElement('th');
                        th.textContent = header;
                        headerRow.appendChild(th);
                    });
                    tableHead.appendChild(headerRow);
                    data.data.forEach(row => {
                        const tr = document.createElement('tr');

                        // Calcular qué día de la semana corresponde basado en las cantidades
                        let diaSemana = '';
                        if (parseFloat(row.cantidad) > 0) {
                            // Intentar determinar el día basado en la fecha
                            if (row.fecha_movimiento) {
                                try {
                                    const fecha = new Date(row.fecha_movimiento);
                                    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                                    diaSemana = dias[fecha.getDay()] || '';
                                } catch (e) {
                                    diaSemana = 'N/A';
                                }
                            }
                        }

                        // Agregar las celdas originales
                        Object.values(row).forEach(cell => {
                            const td = document.createElement('td');
                            td.textContent = cell || '';
                            tr.appendChild(td);
                        });

                        // Agregar celda de día de semana
                        const tdDia = document.createElement('td');
                        tdDia.textContent = diaSemana;
                        tdDia.style.fontWeight = 'bold';
                        tdDia.style.color = '#2196F3';
                        tr.appendChild(tdDia);

                        tableBody.appendChild(tr);
                    });
                    if (data.distribucion_centros_costo) {
                        const distribucionDiv = document.getElementById('distribucion');
                        if (distribucionDiv) {
                            let distribucionHTML = '<h4> Distribución por Centro de Costo:</h4><ul>';
                            data.distribucion_centros_costo.forEach(item => {
                                distribucionHTML += `<li><strong>${item.centro_costo_asignado}:</strong> ${item.cantidad_registros} registros</li>`;
                            });
                            distribucionHTML += '</ul>';

                            // Agregar información sobre distribución por días
                            if (data.statistics) {
                                distribucionHTML += '<h4> Distribución por Día de Semana:</h4><div class="day-distribution-preview">';
                                const diasSemana = [
                                    { nombre: 'Lunes', cantidad: data.statistics.registros_lunes || 0 },
                                    { nombre: 'Martes', cantidad: data.statistics.registros_martes || 0 },
                                    { nombre: 'Miércoles', cantidad: data.statistics.registros_miercoles || 0 },
                                    { nombre: 'Jueves', cantidad: data.statistics.registros_jueves || 0 },
                                    { nombre: 'Viernes', cantidad: data.statistics.registros_viernes || 0 },
                                    { nombre: 'Sábado', cantidad: data.statistics.registros_sabado || 0 },
                                    { nombre: 'Domingo', cantidad: data.statistics.registros_domingo || 0 }
                                ];

                                diasSemana.forEach(dia => {
                                    if (dia.cantidad > 0) {
                                        distribucionHTML += `<span class="day-badge">${dia.nombre}: ${dia.cantidad}</span> `;
                                    }
                                });
                                distribucionHTML += '</div>';
                            }

                            distribucionDiv.innerHTML = distribucionHTML;
                        }
                    }
                    previewSection.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error al obtener vista previa:', error);
            });
    }
    function showMessage(message, type) {
        let messageDiv = document.getElementById('globalMessage');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'globalMessage';
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                z-index: 1000;
                max-width: 400px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.43);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(messageDiv);
        }
        switch (type) {
            case 'success':
                messageDiv.style.backgroundColor = '#00b92bff';
                break;
            case 'error':
                messageDiv.style.backgroundColor = '#ff0000ff';
                break;
            case 'info':
                messageDiv.style.backgroundColor = '#00eeffff';
                break;
            default:
                messageDiv.style.backgroundColor = '#575757ff';
        }
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        messageDiv.style.opacity = '1';
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 300);
        }, 6000);
    }
    const csvFileInput = document.getElementById('csvFile');
    if (csvFileInput) {
        csvFileInput.accept = '.csv,.xlsx,.xls';
    }

    // Agregar estilos CSS para las nuevas clases
    const style = document.createElement('style');
    style.textContent = `
        .day-distribution {
            margin: 15px 0;
            padding: 15px;
            background: #f0f8ff;
            border-radius: 8px;
            border-left: 4px solid #2196F3;
        }
        
        .day-stats {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 8px;
        }
        
        .day-stat {
            background: #2196F3;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: bold;
        }
        
        .day-distribution-preview {
            margin-top: 10px;
        }
        
        .day-badge {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 3px 8px;
            margin: 2px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin: 15px 0;
        }
        
        .stat-item {
            padding: 10px;
            background: #f9f9f9;
            border-radius: 5px;
            border-left: 3px solid #4CAF50;
        }
    `;
    document.head.appendChild(style);
});