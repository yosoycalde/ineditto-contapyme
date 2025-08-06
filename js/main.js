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
        processInfo.innerHTML = `<p class="info"> Procesando archivo ${fileExt.toUpperCase()} de inventario...</p>`;
        resultsSection.style.display = 'block';
        fetch('includes/upload_handler.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const stats = data.statistics;
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
                        <div class="info" style="margin-top: 15px;">
                            <p> <strong>Importante:</strong> Después de descargar el archivo CSV, todos los archivos temporales y datos procesados se eliminarán automáticamente del servidor.</p>
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
                    ['Código Elemento', 'Categoría/Descripción', 'Cantidad', 'Fecha', 'Centro Costo', 'Labor Original', 'Observaciones'].forEach(header => {
                        const th = document.createElement('th');
                        th.textContent = header;
                        headerRow.appendChild(th);
                    });
                    tableHead.appendChild(headerRow);
                    data.data.forEach(row => {
                        const tr = document.createElement('tr');
                        Object.values(row).forEach(cell => {
                            const td = document.createElement('td');
                            td.textContent = cell || '';
                            tr.appendChild(td);
                        });
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
                messageDiv.style.backgroundColor = '#28a745';
                break;
            case 'error':
                messageDiv.style.backgroundColor = '#dc3545';
                break;
            case 'info':
                messageDiv.style.backgroundColor = '#17a2b8';
                break;
            default:
                messageDiv.style.backgroundColor = '#6c757d';
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
});