class InventoryAnimations {
    constructor() {
        this.initializeStyles();
        this.setupGlobalAnimations();
        this.createLoadingSpinner();
        this.createProgressBar();
        this.setupIntersectionObserver();
    }

    // Inicializar estilos CSS mediante JavaScript
    initializeStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Animaciones de transición base */
            .fade-in {
                animation: fadeIn 0.5s ease-out forwards;
            }

            .fade-out {
                animation: fadeOut 0.3s ease-in forwards;
            }

            .slide-down {
                animation: slideDown 0.4s ease-out forwards;
            }

            .slide-up {
                animation: slideUp 0.4s ease-out forwards;
            }

            .scale-in {
                animation: scaleIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
            }

            .bounce-in {
                animation: bounceIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
            }

            .pulse {
                animation: pulse 2s infinite;
            }

            .shake {
                animation: shake 0.5s ease-in-out;
            }

            .glow {
                animation: glow 1.5s ease-in-out infinite alternate;
            }

            /* Definiciones de keyframes */
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes fadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-10px); }
            }

            @keyframes slideDown {
                from { 
                    opacity: 0; 
                    transform: translateY(-30px);
                    max-height: 0;
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0);
                    max-height: 1000px;
                }
            }

            @keyframes slideUp {
                from { 
                    opacity: 1; 
                    transform: translateY(0);
                    max-height: 1000px;
                }
                to { 
                    opacity: 0; 
                    transform: translateY(-30px);
                    max-height: 0;
                }
            }

            @keyframes scaleIn {
                from { 
                    opacity: 0; 
                    transform: scale(0.8);
                }
                to { 
                    opacity: 1; 
                    transform: scale(1);
                }
            }

            @keyframes bounceIn {
                0% { opacity: 0; transform: scale(0.3); }
                50% { opacity: 1; transform: scale(1.05); }
                70% { transform: scale(0.9); }
                100% { opacity: 1; transform: scale(1); }
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }

            @keyframes glow {
                from { box-shadow: 0 0 5px rgba(33, 150, 243, 0.5); }
                to { box-shadow: 0 0 20px rgba(33, 150, 243, 0.8), 0 0 30px rgba(33, 150, 243, 0.6); }
            }

            /* Spinner de carga */
            .loading-spinner {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                background: rgba(255, 255, 255, 0.95);
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                display: none;
                text-align: center;
            }

            .spinner-circle {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #2196F3;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Barra de progreso */
            .progress-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: rgba(0, 0, 0, 0.1);
                z-index: 9998;
                display: none;
            }

            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #2196F3, #21CBF3);
                width: 0%;
                transition: width 0.3s ease;
                box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);
            }

            /* Animaciones específicas para elementos */
            .file-drop-zone {
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .file-drop-zone::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: linear-gradient(45deg, transparent, rgba(33, 150, 243, 0.1), transparent);
                transform: rotate(45deg);
                transition: all 0.6s ease;
                opacity: 0;
            }

            .file-drop-zone.drag-over::before {
                animation: shimmer 1.5s ease-in-out infinite;
                opacity: 1;
            }

            @keyframes shimmer {
                0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
            }

            /* Animaciones de botones */
            .animated-button {
                transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                position: relative;
                overflow: hidden;
            }

            .animated-button::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                transition: width 0.6s, height 0.6s;
            }

            .animated-button:hover::before {
                width: 300px;
                height: 300px;
            }

            .animated-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            }

            .animated-button:active {
                transform: translateY(0);
            }

            /* Animaciones de tablas */
            .table-row-enter {
                animation: tableRowSlide 0.4s ease-out forwards;
            }

            @keyframes tableRowSlide {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                    background-color: rgba(33, 150, 243, 0.1);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                    background-color: transparent;
                }
            }

            /* Animaciones de mensajes */
            .message-slide-in {
                animation: messageSlideIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
            }

            .message-slide-out {
                animation: messageSlideOut 0.3s ease-in forwards;
            }

            @keyframes messageSlideIn {
                from {
                    opacity: 0;
                    transform: translateX(100px) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
            }

            @keyframes messageSlideOut {
                from {
                    opacity: 1;
                    transform: translateX(0) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translateX(100px) scale(0.8);
                }
            }

            /* Efectos de hover mejorados */
            .hover-lift {
                transition: all 0.3s ease;
            }

            .hover-lift:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            }

            /* Animación de conteo */
            .counter-animation {
                font-variant-numeric: tabular-nums;
            }
        `;
        document.head.appendChild(style);
    }

    setupGlobalAnimations() {
        document.addEventListener('DOMContentLoaded', () => {
            this.animatePageLoad();
        });

        this.setupFormAnimations();

        this.setupButtonAnimations();

        this.setupDragDropAnimations();
    }

    createLoadingSpinner() {
        const spinner = document.createElement('div');
        spinner.id = 'loadingSpinner';
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <div class="spinner-circle"></div>
            <div class="loading-text">Procesando archivo...</div>
        `;
        document.body.appendChild(spinner);
    }

    createProgressBar() {
        const progressContainer = document.createElement('div');
        progressContainer.id = 'progressContainer';
        progressContainer.className = 'progress-container';
        progressContainer.innerHTML = '<div class="progress-bar" id="progressBar"></div>';
        document.body.appendChild(progressContainer);
    }

    showSpinner(text = 'Procesando...') {
        const spinner = document.getElementById('loadingSpinner');
        const loadingText = spinner.querySelector('.loading-text');
        loadingText.textContent = text;
        spinner.style.display = 'block';
        spinner.classList.add('fade-in');
    }

    hideSpinner() {
        const spinner = document.getElementById('loadingSpinner');
        spinner.classList.remove('fade-in');
        spinner.classList.add('fade-out');
        setTimeout(() => {
            spinner.style.display = 'none';
            spinner.classList.remove('fade-out');
        }, 300);
    }

    showProgressBar() {
        const container = document.getElementById('progressContainer');
        container.style.display = 'block';
        container.classList.add('fade-in');
    }

    updateProgress(percentage) {
        const bar = document.getElementById('progressBar');
        bar.style.width = percentage + '%';
    }

    hideProgressBar() {
        const container = document.getElementById('progressContainer');
        container.classList.add('fade-out');
        setTimeout(() => {
            container.style.display = 'none';
            container.classList.remove('fade-out', 'fade-in');
            this.updateProgress(0);
        }, 300);
    }

    animatePageLoad() {
        const elements = document.querySelectorAll('h1, h2, .upload-container, .info-section');
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';

            setTimeout(() => {
                element.classList.add('fade-in');
            }, index * 100);
        });
    }

    setupFormAnimations() {
        const form = document.getElementById('uploadForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                this.animateFormSubmission();
            });
        }
    }

    animateFormSubmission() {
        this.showSpinner('Procesando archivo de inventario...');
        this.showProgressBar();

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) {
                progress = 90;
                clearInterval(interval);
            }
            this.updateProgress(progress);
        }, 200);

        setTimeout(() => {
            clearInterval(interval);
        }, 5000);
    }

    completeLoading(success = true) {
        this.updateProgress(100);
        setTimeout(() => {
            this.hideSpinner();
            this.hideProgressBar();
        }, 500);
    }

    setupButtonAnimations() {
        const buttons = document.querySelectorAll('button, input[type="submit"]');
        buttons.forEach(button => {
            if (!button.classList.contains('animated-button')) {
                button.classList.add('animated-button');
            }
        });
    }

    setupDragDropAnimations() {
        const fileInput = document.getElementById('csvFile');
        if (fileInput && fileInput.parentElement) {
            const dropZone = fileInput.parentElement;
            dropZone.classList.add('file-drop-zone');

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.add('drag-over', 'glow');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.remove('drag-over', 'glow');
                });
            });
        }
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, { threshold: 0.1 });

        const observeElement = (element) => {
            if (element) observer.observe(element);
        };

        this.observeElement = observeElement;
    }

    animateSection(sectionId, animationType = 'slide-down') {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            section.classList.add(animationType);
        }
    }

    hideSection(sectionId, callback = null) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('fade-out');
            setTimeout(() => {
                section.style.display = 'none';
                section.classList.remove('fade-out');
                if (callback) callback();
            }, 300);
        }
    }

    animateTable(tableId) {
        const table = document.getElementById(tableId);
        if (table) {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach((row, index) => {
                row.style.opacity = '0';
                row.style.transform = 'translateX(-20px)';

                setTimeout(() => {
                    row.classList.add('table-row-enter');
                }, index * 50);
            });
        }
    }

    animateCounter(element, finalValue, duration = 1000) {
        const startValue = 0;
        const increment = finalValue / (duration / 16);
        let currentValue = startValue;

        const updateCounter = () => {
            currentValue += increment;
            if (currentValue >= finalValue) {
                element.textContent = finalValue;
                element.classList.remove('counter-animation');
            } else {
                element.textContent = Math.floor(currentValue);
                requestAnimationFrame(updateCounter);
            }
        };

        element.classList.add('counter-animation');
        updateCounter();
    }

    animateStats(statsContainer) {
        const statItems = statsContainer.querySelectorAll('.stat-item');
        statItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('scale-in');

                const numberElement = item.querySelector('strong + text, strong');
                if (numberElement) {
                    const match = numberElement.textContent.match(/\d+/);
                    if (match) {
                        const number = parseInt(match[0]);
                        this.animateCounter(numberElement, number, 800);
                    }
                }
            }, index * 100);
        });
    }

    showAnimatedMessage(message, type = 'info', duration = 6000) {
        let messageDiv = document.getElementById('globalMessage');

        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'globalMessage';
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: bold;
                z-index: 1000;
                max-width: 400px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
                display: none;
            `;
            document.body.appendChild(messageDiv);
        }

        // Colores según el tipo
        const colors = {
            success: '#00b92bff',
            error: '#ff0000ff',
            info: '#2196F3',
            warning: '#ff9800'
        };

        messageDiv.style.background = colors[type] || colors.info;
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';

        messageDiv.classList.add('message-slide-in');

        setTimeout(() => {
            messageDiv.classList.remove('message-slide-in');
            messageDiv.classList.add('message-slide-out');

            setTimeout(() => {
                messageDiv.style.display = 'none';
                messageDiv.classList.remove('message-slide-out');
            }, 300);
        }, duration);
    }

    shakeElement(element) {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    }

    pulseElement(element, duration = 2000) {
        element.classList.add('pulse');
        setTimeout(() => {
            element.classList.remove('pulse');
        }, duration);
    }

    addHoverEffects(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.classList.add('hover-lift');
        });
    }

    clearAnimations() {
        const animatedElements = document.querySelectorAll('[class*="fade"], [class*="slide"], [class*="scale"], [class*="bounce"]');
        animatedElements.forEach(element => {
            element.classList.forEach(className => {
                if (className.includes('fade') || className.includes('slide') ||
                    className.includes('scale') || className.includes('bounce')) {
                    element.classList.remove(className);
                }
            });
        });
    }
}

const inventoryAnimations = new InventoryAnimations();

function integrateAnimations() {
    window.originalShowMessage = window.showMessage;
    window.showMessage = function (message, type) {
        inventoryAnimations.showAnimatedMessage(message, type);
    };

    const originalMostrarVistPrevia = window.mostrarVistPrevia;
    if (originalMostrarVistPrevia) {
        window.mostrarVistPrevia = function () {
            originalMostrarVistPrevia.call(this);
            setTimeout(() => {
                inventoryAnimations.animateSection('preview', 'slide-down');
                inventoryAnimations.animateTable('previewTable');
            }, 100);
        };
    }

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        const originalSubmitHandler = uploadForm.onsubmit;
        uploadForm.onsubmit = function (e) {
            inventoryAnimations.animateFormSubmission();
            if (originalSubmitHandler) {
                return originalSubmitHandler.call(this, e);
            }
        };
    }
}

// Auto-integrar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', integrateAnimations);
} else {
    integrateAnimations();
}

window.inventoryAnimations = inventoryAnimations;