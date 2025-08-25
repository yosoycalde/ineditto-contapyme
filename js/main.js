document.addEventListener('DOMContentLoaded', function () {
    const uploadForm = document.getElementById('uploadForm');
    const resultsSection = document.getElementById('results');
    const previewSection = document.getElementById('preview');
    const downloadBtn = document.getElementById('downloadBtn');
    const actionButtons = document.querySelector('.action-buttons');

    let animationsReady = false;
    setTimeout(() => {
        if (window.inventoryAnimations) {
            animationsReady = true;
            inventoryAnimations.addHoverEffects('.upload-container, .info-section');
        }
    }, 100);

    if (actionButtons) {
        const cleanupBtn = document.createElement('button');
        cleanupBtn.id = 'cleanupBtn';
        cleanupBtn.innerHTML = 'Limpiar Archivos y Datos';
        cleanupBtn.style.display = 'none';
        cleanupBtn.style.marginLeft = '15px';
        actionButtons.appendChild(cleanupBtn);

        if (animationsReady) {
            cleanupBtn.classList.add('animated-button');
        }
        
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
        
        if (animationsReady) {
            inventoryAnimations.showSpinner(`Importando ${tipo}...`);
        }
        
        fetch('includes/upload_handler.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .catch(error => {
                console.error('Error:', error);
                if (animationsReady) {
                    inventoryAnimations.hideSpinner();
                }
                showMessage(`Error de conexión al importar ${tipo}`, 'error');
            });
    }

    uploadForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData();
        const fileInput = document.getElementById('csvFile');
        
        if (fileInput.files.length === 0) {
            showMessage('Por favor selecciona un archivo de inventario', 'error');
            if (animationsReady) {
                inventoryAnimations.shakeElement(fileInput.parentElement);
            }
            return;
        }

        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop().toLowerCase();
        
        if (!['csv', 'xlsx', 'xls'].includes(fileExt)) {
            showMessage('Solo se permiten archivos CSV, XLSX o XLS para inventarios', 'error');
            if (animationsReady) {
                inventoryAnimations.shakeElement(fileInput.parentElement);
            }
            return;
        }

        if (fileExt === 'xls') {
            if (!confirm('Los archivos XLS pueden tener problemas de compatibilidad. ¿Desea continuar? Se recomienda usar XLSX o CSV.')) {
                return;
            }
        }

        formData.append('csvFile', file);
        const processInfo = document.getElementById('processInfo');

        if (animationsReady) {
            inventoryAnimations.showSpinner(
                `Procesando archivo ${fileExt.toUpperCase()}...`,
                'Distribuyendo cantidades por día de semana'
            );
        }
        
        processInfo.innerHTML = `<p class="info">Procesando archivo ${fileExt.toUpperCase()} de inventario y distribuyendo cantidades por día de semana...</p>`;
        
        if (animationsReady) {
            inventoryAnimations.animateSection('results', 'slide-down');
        } else {
            resultsSection.style.display = 'block';
        }

        let progressInterval;
        if (animationsReady) {
            progressInterval = inventoryAnimations.simulateFileProcessing(100);
        }

        fetch('includes/upload_handler.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (progressInterval) {
                    clearInterval(progressInterval);
                }

                if (animationsReady) {
                    inventoryAnimations.completeLoading(data.success, data.message);
                }

                if (data.success) {
                    const stats = data.statistics;

                    let distribucionDias = '';
                    if (stats.registros_lunes > 0 || stats.registros_martes > 0 || stats.registros_miercoles > 0 ||
                        stats.registros_jueves > 0 || stats.registros_viernes > 0 || stats.registros_sabado > 0 ||
                        stats.registros_domingo > 0) {
                        distribucionDias = `
                            <div class="day-distribution">
                                <h4>Distribución por día de semana:</h4>
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
                        <h3>${data.message}</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <strong>Registros procesados:</strong> <span class="counter">${data.records}</span>
                            </div>
                            <div class="stat-item">
                                <strong>Total en BD:</strong> <span class="counter">${stats.total_registros}</span>
                            </div>
                            <div class="stat-item">
                                <strong>Registros sin ILABOR:</strong> <span class="counter">${stats.ilabor_vacios}</span>
                            </div>
                            <div class="stat-item">
                                <strong>Centros de costo utilizados:</strong> <span class="counter">${stats.centros_costo_diferentes}</span>
                            </div>
                            <div class="stat-item">
                                <strong>Suma total cantidades:</strong> <span class="counter">${parseFloat(stats.suma_cantidades || 0).toFixed(2)}</span>
                            </div>
                        </div>
                        ${distribucionDias}
                        <div class="info" style="margin-top: 15px;">
                            <p><strong>Importante:</strong> Las cantidades se han distribuido automáticamente según el día de la semana correspondiente a la fecha FSOPORT. Después de descargar el archivo CSV, todos los archivos temporales y datos procesados se eliminarán automáticamente del servidor.</p>
                        </div>
                    </div>`;

                    if (animationsReady) {
                        setTimeout(() => {
                            const statsGrid = processInfo.querySelector('.stats-grid');
                            if (statsGrid) {
                                inventoryAnimations.animateStats(statsGrid);
                            }
                            
                            const dayDistribution = processInfo.querySelector('.day-distribution');
                            if (dayDistribution) {
                                dayDistribution.classList.add('scale-in');
                            }
                        }, 500);
                    }

                    downloadBtn.style.display = 'inline-block';
                    if (animationsReady) {
                        downloadBtn.classList.add('bounce-in');
                        setTimeout(() => {
                            downloadBtn.classList.remove('bounce-in');
                        }, 600);
                    }

                    const cleanupBtn = document.getElementById('cleanupBtn');
                    if (cleanupBtn) {
                        cleanupBtn.style.display = 'inline-block';
                        if (animationsReady) {
                            setTimeout(() => {
                                cleanupBtn.classList.add('fade-in');
                            }, 200);
                        }
                    }

                    mostrarVistPrevia();
                } else {
                    processInfo.innerHTML = `<p class="error">❌ Error: ${data.message}</p>`;
                    if (animationsReady) {
                        inventoryAnimations.shakeElement(processInfo);
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);

                if (progressInterval) {
                    clearInterval(progressInterval);
                }
                
                if (animationsReady) {
                    inventoryAnimations.completeLoading(false, 'Error de conexión');
                }
                processInfo.innerHTML = '<p class="error">❌ Error al procesar el archivo</p>';
                if (animationsReady) {
                    inventoryAnimations.shakeElement(processInfo);
                }
            });
    });

    downloadBtn.addEventListener('click', function () {
        if (animationsReady) {
            inventoryAnimations.showSpinner('Preparando descarga...', 'Generando archivo CSV y limpiando datos');
            inventoryAnimations.pulseElement(downloadBtn, 1000);
        } else {
            showMessage('Iniciando descarga y limpieza automática...', 'info');
        }

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
        if (animationsReady) {
            inventoryAnimations.updateSpinnerText('Verificando limpieza...', 'Eliminando archivos temporales');
        }

        fetch('includes/get_preview.php')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.statistics.total_registros === 0) {
                    if (animationsReady) {
                        inventoryAnimations.completeLoading(true, 'Descarga y limpieza completadas');
                        setTimeout(() => {
                            inventoryAnimations.showAnimatedMessage('Proceso completado exitosamente', 'success');
                        }, 2000);
                    } else {
                        showMessage('Descarga y limpieza completadas exitosamente', 'success');
                    }
                    resetearInterfaz();
                } else if (data.success && data.statistics.total_registros > 0) {
                    if (animationsReady) {
                        inventoryAnimations.updateSpinnerText('Completando limpieza...', 'Finalizando eliminación');
                    } else {
                        showMessage('Completando limpieza...', 'info');
                    }
                    setTimeout(() => {
                        realizarLimpiezaManual();
                    }, 1000);
                } else {
                    if (animationsReady) {
                        inventoryAnimations.completeLoading(true, 'Descarga completada');
                    } else {
                        showMessage('Descarga completada', 'success');
                    }
                    resetearInterfaz();
                }
            })
            .catch(error => {
                console.error('Error verificando limpieza:', error);
                if (animationsReady) {
                    inventoryAnimations.completeLoading(false, 'Error en verificación');
                } else {
                    showMessage('Descarga completada', 'success');
                }
                resetearInterfaz();
            });
    }

    function resetearInterfaz() {
        // Animar ocultación de elementos
        if (animationsReady) {
            inventoryAnimations.hideSection('results');
            inventoryAnimations.hideSection('preview');
        } else {
            resultsSection.style.display = 'none';
            previewSection.style.display = 'none';
        }

        downloadBtn.style.display = 'none';
        const cleanupBtn = document.getElementById('cleanupBtn');
        if (cleanupBtn) {
            cleanupBtn.style.display = 'none';
        }
        
        document.getElementById('csvFile').value = '';
        
        // Limpiar animaciones
        if (animationsReady) {
            setTimeout(() => {
                inventoryAnimations.clearAnimations();
            }, 500);
        }
    }

    function realizarLimpiezaManual() {
        if (animationsReady) {
            inventoryAnimations.showSpinner('Realizando limpieza manual...', 'Eliminando archivos y datos temporales');
        } else {
            showMessage('Realizando limpieza manual...', 'info');
        }

        fetch('includes/cleanup.php', {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (animationsReady) {
                        inventoryAnimations.completeLoading(true, `${data.archivos_eliminados} archivos y ${data.registros_eliminados} registros eliminados`);
                        setTimeout(() => {
                            resetearInterfaz();
                        }, 2000);
                    } else {
                        showMessage(`Limpieza completada: ${data.archivos_eliminados} archivos y ${data.registros_eliminados} registros eliminados`, 'success');
                        resetearInterfaz();
                    }
                } else {
                    if (animationsReady) {
                        inventoryAnimations.completeLoading(false, data.message);
                    } else {
                        showMessage(`Error en la limpieza: ${data.message}`, 'error');
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                if (animationsReady) {
                    inventoryAnimations.completeLoading(false, 'Error de conexión durante la limpieza');
                } else {
                    showMessage('Error de conexión durante la limpieza', 'error');
                }
            });
    }

    function mostrarVistPrevia() {
        if (animationsReady) {
            inventoryAnimations.showSpinner('Cargando vista previa...', 'Preparando datos para visualización');
        }

        fetch('includes/get_preview.php')
            .then(response => response.json())
            .then(data => {
                if (animationsReady) {
                    inventoryAnimations.hideSpinner();
                }

                if (data.success) {
                    const tableHead = document.getElementById('tableHead');
                    const tableBody = document.getElementById('tableBody');
                    
                    tableHead.innerHTML = '';
                    tableBody.innerHTML = '';

                    const headerRow = document.createElement('tr');
                    ['Código Elemento', 'Categoría/Descripción', 'Cantidad', 'Fecha', 'Centro Costo', 'Labor Original', 'Observaciones', 'Día Semana'].forEach((header, index) => {
                        const th = document.createElement('th');
                        th.textContent = header;
                        headerRow.appendChild(th);
                        
                        if (animationsReady) {
                            th.style.opacity = '0';
                            th.style.transform = 'translateY(-10px)';
                            setTimeout(() => {
                                th.style.transition = 'all 0.3s ease';
                                th.style.opacity = '1';
                                th.style.transform = 'translateY(0)';
                            }, index * 50);
                        }
                    });
                    tableHead.appendChild(headerRow);

                    data.data.forEach((row, index) => {
                        const tr = document.createElement('tr');
                        
                        if (animationsReady) {
                            tr.style.opacity = '0';
                            tr.style.transform = 'translateX(-20px)';
                        }

                        let diaSemana = '';
                        if (parseFloat(row.cantidad) > 0) {
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

                        Object.values(row).forEach(cell => {
                            const td = document.createElement('td');
                            td.textContent = cell || '';
                            tr.appendChild(td);
                        });

                        const tdDia = document.createElement('td');
                        tdDia.textContent = diaSemana;
                        tdDia.style.fontWeight = 'bold';
                        tdDia.style.color = '#2196F3';
                        tr.appendChild(tdDia);

                        tableBody.appendChild(tr);

                        if (animationsReady) {
                            setTimeout(() => {
                                tr.style.transition = 'all 0.4s ease';
                                tr.style.opacity = '1';
                                tr.style.transform = 'translateX(0)';
                            }, 500 + (index * 80));
                        }
                    });

                    if (data.distribucion_centros_costo) {
                        const distribucionDiv = document.getElementById('distribucion');
                        if (distribucionDiv) {
                            let distribucionHTML = '<h4>Distribución por Centro de Costo:</h4><ul>';
                            data.distribucion_centros_costo.forEach(item => {
                                distribucionHTML += `<li><strong>${item.centro_costo_asignado}:</strong> ${item.cantidad_registros} registros</li>`;
                            });
                            distribucionHTML += '</ul>';

                            if (data.statistics) {
                                distribucionHTML += '<h4>Distribución por Día de Semana:</h4><div class="day-distribution-preview">';
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

                            if (animationsReady) {
                                setTimeout(() => {
                                    distribucionDiv.style.opacity = '0';
                                    distribucionDiv.style.transform = 'translateY(20px)';
                                    distribucionDiv.style.transition = 'all 0.5s ease';
                                    
                                    setTimeout(() => {
                                        distribucionDiv.style.opacity = '1';
                                        distribucionDiv.style.transform = 'translateY(0)';
                                    }, 100);
                                }, 300);
                            }
                        }
                    }

                    if (animationsReady) {
                        setTimeout(() => {
                            inventoryAnimations.animateSection('preview', 'slide-down');
                            // Agregar efectos hover
                            setTimeout(() => {
                                inventoryAnimations.addHoverEffects('.stat-item, .day-badge, .day-stat');
                            }, 500);
                        }, 1000);
                    } else {
                        previewSection.style.display = 'block';
                    }
                }
            })
            .catch(error => {
                console.error('Error al obtener vista previa:', error);
                if (animationsReady) {
                    inventoryAnimations.hideSpinner();
                }
            });
    }

    function showMessage(message, type) {
        if (animationsReady) {
            inventoryAnimations.showAnimatedMessage(message, type);
        } else {
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
                    messageDiv.style.backgroundColor = '#2196F3';
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
    }

    const csvFileInput = document.getElementById('csvFile');
    if (csvFileInput) {
        csvFileInput.accept = '.csv,.xlsx,.xls';
        
        csvFileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0 && animationsReady) {
                const fileName = e.target.files[0].name;
                const fileSize = (e.target.files[0].size / 1024).toFixed(1) + ' KB';
                inventoryAnimations.showAnimatedMessage(
                    `Archivo seleccionado: ${fileName} (${fileSize})`, 
                    'info', 
                    3000
                );
            }
        });

        const fileContainer = csvFileInput.parentElement;
        if (fileContainer && animationsReady) {
            fileContainer.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.style.background = 'linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(33, 203, 243, 0.1))';
                this.style.transform = 'scale(1.02)';
                this.style.transition = 'all 0.2s ease';
            });

            fileContainer.addEventListener('dragleave', function(e) {
                e.preventDefault();
                this.style.background = '';
                this.style.transform = 'scale(1)';
            });

            fileContainer.addEventListener('drop', function(e) {
                e.preventDefault();
                this.style.background = '';
                this.style.transform = 'scale(1)';
                
                if (e.dataTransfer.files.length > 0) {
                    csvFileInput.files = e.dataTransfer.files;
                    csvFileInput.dispatchEvent(new Event('change'));
                }
            });
        }
    }

    const additionalStyles = document.createElement('style');
    additionalStyles.textContent = `
        .day-distribution {
            margin: 15px 0; 
            padding: 15px;
            background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
            border-radius: 12px;
            border-left: 4px solid #2196F3;
            box-shadow: 0 4px 15px rgba(33, 150, 243, 0.1);
        }
        
        .day-stats {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 8px;
        }
        
        .day-stat {
            background: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
            transition: transform 0.2s ease;
        }
        
        .day-stat:hover {
            transform: translateY(-2px);
        }
        
        .day-distribution-preview {
            margin-top: 10px;
        }
        
        .day-badge {
            display: inline-block;
            background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
            color: white;
            padding: 4px 12px;
            margin: 3px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
            transition: all 0.2s ease;
        }
        
        .day-badge:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .stat-item {
            padding: 15px;
            background: linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%);
            border-radius: 10px;
            border-left: 4px solid #4CAF50;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .stat-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, #4CAF50, #66BB6A);
            transform: translateX(-100%);
            transition: transform 0.6s ease;
        }
        
        .stat-item:hover::before {
            transform: translateX(0);
        }
        
        .stat-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        .counter {
            font-weight: bold;
            color: #2196F3;
        }

        /* Mejoras para la tabla */
        #dataTable {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border-radius: 10px;
            overflow: hidden;
        }

        #dataTable th {
            background: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%);
            color: white;
            padding: 12px;
            font-weight: 600;
        }

        #dataTable td {
            padding: 10px;
            border-bottom: 1px solid #f0f0f0;
            transition: background-color 0.2s ease;
        }

        #dataTable tr:hover td {
            background-color: rgba(33, 150, 243, 0.05);
        }

        /* Mejoras para mensajes */
        #globalMessage {
            backdrop-filter: blur(10px) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }

        /* Animación de carga para input file */
        .file-drop-zone.processing {
            background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                        linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                        linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            animation: move 1s linear infinite;
        }

        @keyframes move {
            0% { background-position: 0 0, 0 10px, 10px -10px, -10px 0px; }
            100% { background-position: 20px 20px, 20px 30px, 30px 10px, 10px 20px; }
        }

        /* Animaciones adicionales para elementos específicos */
        .bounce-in {
            animation: bounceIn 0.6s ease-out;
        }

        .fade-in {
            animation: fadeIn 0.5s ease-out;
        }

        .slide-down {
            animation: slideDown 0.5s ease-out;
        }

        .scale-in {
            animation: scaleIn 0.4s ease-out;
        }

        .shake {
            animation: shake 0.5s ease-in-out;
        }

        @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideDown {
            from { 
                opacity: 0; 
                transform: translateY(-30px); 
            }
            to { 
                opacity: 1; 
                transform: translateY(0); 
            }
        }

        @keyframes scaleIn {
            from { 
                transform: scale(0.8); 
                opacity: 0; 
            }
            to { 
                transform: scale(1); 
                opacity: 1; 
            }
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
            20%, 40%, 60%, 80% { transform: translateX(10px); }
        }

        /* Efecto de pulso para elementos importantes */
        .pulse-effect {
            animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        /* Mejoras visuales para el contenedor de upload */
        .file-input-container {
            transition: all 0.3s ease;
        }

        .file-input-container:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        /* Efectos para botones */
        button {
            transition: all 0.3s ease;
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
        }

        button:active {
            transform: translateY(0);
        }

        /* Mejoras para la tabla de resultados */
        .table-container {
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
        }

        /* Indicador de procesamiento */
        .processing-indicator {
            position: relative;
            overflow: hidden;
        }

        .processing-indicator::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(33, 150, 243, 0.2), transparent);
            animation: scan 2s linear infinite;
        }

        @keyframes scan {
            0% { left: -100%; }
            100% { left: 100%; }
        }
    `;
    
    if (!document.head.querySelector('#additional-styles')) {
        additionalStyles.id = 'additional-styles';
        document.head.appendChild(additionalStyles);
    }
});