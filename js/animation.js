// Sistema de Animaciones de Carga para Inventarios Ineditto → ContaPyme
// Archivo: js/animations.js

class InventoryAnimations {
    constructor() {
        this.currentSpinner = null;
        this.progressBar = null;
        this.isAnimating = false;
        this.messageQueue = [];
        this.progressInterval = null;
        this.blockedElements = new Set(); // NUEVO: rastrear elementos bloqueados
        this.init();
    }

    init() {
        this.createStyles();
        this.setupParticleSystem();
    }

    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Contenedor principal del spinner */
            .loading-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .loading-overlay.show {
                opacity: 1;
            }

            /* Contenedor del spinner */
            .spinner-container {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                text-align: center;
                transform: scale(0.8);
                transition: transform 0.3s ease;
                min-width: 300px;
                max-width: 500px;
            }

            .loading-overlay.show .spinner-container {
                transform: scale(1);
            }

            /* Animación de archivos girando */
            .file-spinner {
                width: 80px;
                height: 80px;
                margin: 0 auto 20px;
                position: relative;
            }

            .file-icon {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #2196F3, #21CBF3);
                border-radius: 10px;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                animation: fileRotate 2s linear infinite;
                box-shadow: 0 8px 25px rgba(33, 150, 243, 0.3);
            }

            .file-icon::before {
                content: '';
                position: absolute;
                top: 10px;
                left: 10px;
                right: 10px;
                height: 3px;
                background: rgba(255, 255, 255, 0.8);
                border-radius: 2px;
                box-shadow: 0 8px 0 rgba(255, 255, 255, 0.6),
                           0 16px 0 rgba(255, 255, 255, 0.4),
                           0 24px 0 rgba(255, 255, 255, 0.2);
            }

            /* Partículas orbitando */
            .orbit-particle {
                width: 8px;
                height: 8px;
                background: #4CAF50;
                border-radius: 50%;
                position: absolute;
                animation: orbit 3s linear infinite;
            }

            .orbit-particle:nth-child(2) { 
                animation-delay: -1s; 
                background: #FF9800; 
            }
            
            .orbit-particle:nth-child(3) { 
                animation-delay: -2s; 
                background: #E91E63; 
            }

            @keyframes fileRotate {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
            }

            @keyframes orbit {
                0% {
                    transform: rotate(0deg) translateX(40px) rotate(0deg);
                }
                100% {
                    transform: rotate(360deg) translateX(40px) rotate(-360deg);
                }
            }

            /* Barra de progreso animada */
            .progress-container {
                width: 100%;
                height: 8px;
                background: #f0f0f0;
                border-radius: 10px;
                overflow: hidden;
                margin: 20px 0;
                position: relative;
            }

            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #4CAF50, #66BB6A, #4CAF50);
                background-size: 200% 100%;
                border-radius: 10px;
                width: 0%;
                transition: width 0.5s ease;
                animation: progressShine 2s linear infinite;
                position: relative;
            }

            .progress-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, 
                    transparent, 
                    rgba(255, 255, 255, 0.4), 
                    transparent);
                animation: progressGlow 1.5s ease-in-out infinite;
            }

            @keyframes progressShine {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            @keyframes progressGlow {
                0%, 100% { transform: translateX(-100%); }
                50% { transform: translateX(100%); }
            }

            /* Texto de estado */
            .loading-text {
                font-size: 18px;
                color: #333;
                margin-bottom: 10px;
                font-weight: 600;
            }

            .loading-subtext {
                font-size: 14px;
                color: #666;
                margin-top: 10px;
                opacity: 0.8;
            }

            /* Contador de archivos procesados */
            .file-counter {
                display: flex;
                justify-content: space-around;
                margin: 20px 0;
                font-size: 14px;
                color: #555;
            }

            .counter-item {
                text-align: center;
                padding: 10px;
                background: rgba(33, 150, 243, 0.1);
                border-radius: 8px;
                min-width: 60px;
            }

            .counter-number {
                font-size: 20px;
                font-weight: bold;
                color: #2196F3;
                display: block;
            }

            /* Animaciones de estado final */
            .success-checkmark {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: #4CAF50;
                position: relative;
                margin: 0 auto 20px;
                animation: checkmarkScale 0.6s ease-out;
            }

            .success-checkmark::after {
                content: '✓';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 40px;
                font-weight: bold;
            }

            .error-cross {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: #f44336;
                position: relative;
                margin: 0 auto 20px;
                animation: errorShake 0.6s ease-out;
            }

            .error-cross::after {
                content: '✕';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 40px;
                font-weight: bold;
            }

            @keyframes checkmarkScale {
                0% { transform: scale(0); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }

            @keyframes errorShake {
                0%, 20%, 40%, 60%, 80%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            }

            /* Mensajes animados */
            .animated-message {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                border-radius: 12px;
                color: white;
                font-weight: 600;
                z-index: 10000;
                max-width: 400px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                transform: translateX(100%);
                transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }

            .animated-message.show {
                transform: translateX(0);
            }

            .animated-message.success {
                background: linear-gradient(135deg, #4CAF50, #66BB6A);
            }

            .animated-message.error {
                background: linear-gradient(135deg, #f44336, #ef5350);
            }

            .animated-message.info {
                background: linear-gradient(135deg, #2196F3, #42A5F5);
            }

            /* Efectos de pulso */
            .pulse-effect {
                animation: pulse 1s ease-in-out infinite;
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        `;
        
        if (!document.head.querySelector('#inventory-animations-styles')) {
            style.id = 'inventory-animations-styles';
            document.head.appendChild(style);
        }
    }

    setupParticleSystem() {
        // Mejorar el sistema de partículas existente si está presente
        const canvas = document.getElementById('particleCanvas');
        if (canvas) {
            canvas.style.transition = 'opacity 0.3s ease';
        }
    }

    // Mostrar spinner principal
    showSpinner(message = 'Procesando...', subtext = '') {
        this.hideSpinner(); // Remover spinner anterior si existe
        this.isAnimating = true;

        // Bloquear interacciones durante la carga
        this.blockInterfaceInteractions();

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner-container">
                <div class="file-spinner">
                    <div class="file-icon"></div>
                    <div class="orbit-particle"></div>
                    <div class="orbit-particle"></div>
                    <div class="orbit-particle"></div>
                </div>
                <div class="loading-text">${message}</div>
                <div class="progress-container">
                    <div class="progress-bar" id="mainProgressBar"></div>
                </div>
                <div class="file-counter">
                    <div class="counter-item">
                        <span class="counter-number" id="processedCount">0</span>
                        <span>Procesados</span>
                    </div>
                    <div class="counter-item">
                        <span class="counter-number" id="totalCount">---</span>
                        <span>Total</span>
                    </div>
                    <div class="counter-item">
                        <span class="counter-number" id="percentCount">0%</span>
                        <span>Completado</span>
                    </div>
                </div>
                <div class="loading-subtext">${subtext}</div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.currentSpinner = overlay;
        this.progressBar = overlay.querySelector('#mainProgressBar');

        // Animar entrada
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);

        // Simular progreso inicial
        this.simulateProgress();
        
        return overlay;
    }

    // Ocultar spinner
    hideSpinner() {
        if (this.currentSpinner) {
            this.currentSpinner.classList.remove('show');
            
            setTimeout(() => {
                if (this.currentSpinner && this.currentSpinner.parentNode) {
                    this.currentSpinner.parentNode.removeChild(this.currentSpinner);
                }
                this.currentSpinner = null;
                this.progressBar = null;
                
                // CRÍTICO: Reactivar todos los elementos después de ocultar
                this.reactivateInterface();
                
            }, 300);
        }
        
        // Limpiar intervalos
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        // Resetear estado de animación
        this.isAnimating = false;
    }

    // NUEVO: Método para reactivar la interfaz
    reactivateInterface() {
        // Reactivar todos los botones
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = false;
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
            // Remover cualquier overlay o z-index problemático
            button.style.position = '';
            button.style.zIndex = '';
        });

        // Reactivar formularios
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.style.pointerEvents = 'auto';
        });

        // Reactivar inputs
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.disabled = false;
            input.style.pointerEvents = 'auto';
        });

        // Asegurar que no hay overlays residuales
        const overlays = document.querySelectorAll('.loading-overlay');
        overlays.forEach(overlay => {
            if (overlay !== this.currentSpinner && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });

        // Limpiar elementos bloqueados
        this.blockedElements.clear();

        // Restaurar el scroll del body si estaba bloqueado
        document.body.style.overflow = '';
        
        console.log('✅ Interfaz reactivada - todos los botones deberían funcionar');
    }

    // NUEVO: Bloquear interacciones de la interfaz
    blockInterfaceInteractions() {
        // Bloquear todos los botones principales
        const buttons = document.querySelectorAll('button:not(.loading-overlay button)');
        buttons.forEach(button => this.blockElement(button));

        // Bloquear formularios
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.style.pointerEvents = 'none';
        });

        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
    }

    // NUEVO: Método para bloquear elementos durante carga
    blockElement(element) {
        if (element) {
            this.blockedElements.add(element);
            element.disabled = true;
            element.style.pointerEvents = 'none';
            element.style.opacity = '0.6';
        }
    }

    // NUEVO: Método para desbloquear elementos específicos
    unblockElement(element) {
        if (element) {
            this.blockedElements.delete(element);
            element.disabled = false;
            element.style.pointerEvents = 'auto';
            element.style.opacity = '1';
        }
    }

    updateProgress(percentage, processedCount = null, totalCount = null) {
        if (this.progressBar) {
            this.progressBar.style.width = `${Math.min(percentage, 100)}%`;
        }

        const percentElement = document.getElementById('percentCount');
        const processedElement = document.getElementById('processedCount');
        const totalElement = document.getElementById('totalCount');

        if (percentElement) {
            percentElement.textContent = `${Math.round(percentage)}%`;
        }

        if (processedCount !== null && processedElement) {
            processedElement.textContent = processedCount;
        }

        if (totalCount !== null && totalElement) {
            totalElement.textContent = totalCount;
        }
    }

    simulateProgress() {
        if (!this.progressBar) return;

        let progress = 0;
        this.progressInterval = setInterval(() => {
            progress += Math.random() * 3 + 1;
            
            if (progress >= 85) {
                progress = 85;
                clearInterval(this.progressInterval);
                this.progressInterval = null;
            }

            this.updateProgress(progress);
        }, 200);

        return this.progressInterval;
    }

    simulateFileProcessing(totalFiles = 100) {
        let processed = 0;
        const interval = setInterval(() => {
            processed += Math.floor(Math.random() * 5) + 1;
            
            if (processed >= totalFiles) {
                processed = totalFiles;
                clearInterval(interval);
            }

            const percentage = (processed / totalFiles) * 85; 
            this.updateProgress(percentage, processed, totalFiles);
            
            if (processed < totalFiles * 0.3) {
                this.updateSpinnerText('Leyendo archivo...', 'Validando formato y estructura');
            } else if (processed < totalFiles * 0.7) {
                this.updateSpinnerText('Procesando datos...', 'Asignando centros de costo y distribuyendo cantidades');
            } else if (processed < totalFiles * 0.9) {
                this.updateSpinnerText('Finalizando...', 'Generando números consecutivos y validando datos');
            } else {
                this.updateSpinnerText('Completando proceso...', 'Preparando archivo para descarga');
            }
        }, 150);

        this.progressInterval = interval;
        return interval;
    }

    completeLoading(success = true, message = '') {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        this.updateProgress(100);

        setTimeout(() => {
            if (this.currentSpinner) {
                const container = this.currentSpinner.querySelector('.spinner-container');
                const icon = success ? 'success-checkmark' : 'error-cross';
                const statusMessage = message || (success ? 'Proceso completado' : 'Error en el proceso');

                container.innerHTML = `
                    <div class="${icon}"></div>
                    <div class="loading-text">${statusMessage}</div>
                    <div class="loading-subtext">${success ? 'Los datos están listos para usar' : 'Por favor, revise el archivo e intente nuevamente'}</div>
                `;

                setTimeout(() => {
                    this.hideSpinner();
                }, success ? 2000 : 3000);
            }
        }, 500);
    }

    updateSpinnerText(message, subtext = '') {
        if (this.currentSpinner) {
            const textElement = this.currentSpinner.querySelector('.loading-text');
            const subtextElement = this.currentSpinner.querySelector('.loading-subtext');
            
            if (textElement) textElement.textContent = message;
            if (subtextElement) subtextElement.textContent = subtext;
        }
    }

    showAnimatedMessage(message, type = 'info', duration = 5000) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `animated-message ${type}`;
        messageDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">${this.getMessageIcon(type)}</span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.classList.add('show');
        }, 10);

        setTimeout(() => {
            messageDiv.classList.remove('show');
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 400);
        }, duration);

        return messageDiv;
    }

    getMessageIcon(type) {
        switch (type) {
            case 'success': return '';
            case 'error': return '';
            case 'info': return '';
            default: return '';
        }
    }

    animateSection(sectionId, animationType = 'fadeIn') {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            section.classList.add(animationType);
            
            setTimeout(() => {
                section.classList.remove(animationType);
            }, 600);
        }
    }

    hideSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.opacity = '0';
            section.style.transform = 'translateY(-20px)';
            section.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                section.style.display = 'none';
                section.style.opacity = '';
                section.style.transform = '';
                section.style.transition = '';
            }, 300);
        }
    }

    shakeElement(element) {
        if (element) {
            element.classList.add('shake');
            setTimeout(() => {
                element.classList.remove('shake');
            }, 500);
        }
    }

    pulseElement(element, duration = 2000) {
        if (element) {
            element.classList.add('pulse-effect');
            setTimeout(() => {
                element.classList.remove('pulse-effect');
            }, duration);
        }
    }

    animateStats(statsContainer) {
        const statItems = statsContainer.querySelectorAll('.stat-item');
        statItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('scale-in');

                const counter = item.querySelector('.counter');
                if (counter) {
                    this.animateNumber(counter);
                }
            }, index * 100);
        });
    }


    animateNumber(element) {
        const finalValue = parseFloat(element.textContent) || 0;
        const duration = 1000;
        const steps = 30;
        const stepValue = finalValue / steps;
        let currentValue = 0;
        let step = 0;

        const interval = setInterval(() => {
            step++;
            currentValue += stepValue;
            
            if (step >= steps) {
                currentValue = finalValue;
                clearInterval(interval);
            }

            if (finalValue % 1 === 0) {
                element.textContent = Math.round(currentValue);
            } else {
                element.textContent = currentValue.toFixed(2);
            }
        }, duration / steps);
    }

    addHoverEffects(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                element.style.transform = 'translateY(-3px)';
                element.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                element.style.transition = 'all 0.3s ease';
            });

            element.addEventListener('mouseleave', () => {
                element.style.transform = 'translateY(0)';
                element.style.boxShadow = '';
            });
        });
    }

    clearAnimations() {
        const animatedElements = document.querySelectorAll('.bounce-in, .fade-in, .slide-down, .scale-in, .shake, .pulse-effect');
        animatedElements.forEach(element => {
            element.classList.remove('bounce-in', 'fade-in', 'slide-down', 'scale-in', 'shake', 'pulse-effect');
        });

        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    observeElement(element) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        observer.observe(element);
    }

    forceReactivate() {
        this.isAnimating = false;
        
        const overlays = document.querySelectorAll('.loading-overlay');
        overlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        });
        
        this.currentSpinner = null;
        this.progressBar = null;
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        this.reactivateInterface();
        
        console.log(' Reactivación forzada completada');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.inventoryAnimations = new InventoryAnimations();
});

function showLoadingAnimation(message = 'Procesando...') {
    if (window.inventoryAnimations) {
        return window.inventoryAnimations.showSpinner(message);
    }
}

function hideLoadingAnimation() {
    if (window.inventoryAnimations) {
        window.inventoryAnimations.hideSpinner();
        setTimeout(() => {
            window.inventoryAnimations.reactivateInterface();
        }, 100);
    }
}

function updateLoadingProgress(percentage) {
    if (window.inventoryAnimations) {
        window.inventoryAnimations.updateProgress(percentage);
    }
}

function completeLoadingAnimation(success = true, message = '') {
    if (window.inventoryAnimations) {
        window.inventoryAnimations.completeLoading(success, message);
    }
}

function forceReactivateInterface() {
    if (window.inventoryAnimations) {
        window.inventoryAnimations.forceReactivate();
    }
}

function checkButtonsAndRepair() {
    const buttons = document.querySelectorAll('button');
    let blockedCount = 0;
    
    buttons.forEach(button => {
        if (button.disabled || button.style.pointerEvents === 'none') {
            blockedCount++;
        }
    });
    
    if (blockedCount > 0 && !document.querySelector('.loading-overlay')) {
        console.warn(` Detectados ${blockedCount} botones bloqueados sin spinner activo. Reparando...`);
        forceReactivateInterface();
    }
}

setInterval(checkButtonsAndRepair, 5000);

window.showLoadingAnimation = showLoadingAnimation;
window.hideLoadingAnimation = hideLoadingAnimation;
window.updateLoadingProgress = updateLoadingProgress;
window.completeLoadingAnimation = completeLoadingAnimation;
window.forceReactivateInterface = forceReactivateInterface;
window.checkButtonsAndRepair = checkButtonsAndRepair;