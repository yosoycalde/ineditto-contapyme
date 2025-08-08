setTimeout(function () {
    fetch('../includes/cleanup.php', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log(' Limpieza automática completada');
            }
        }).catch(error => {
            console.log(' Error en limpieza automática:', error);
        });
}, 3000);
