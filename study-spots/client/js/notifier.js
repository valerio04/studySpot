// notifier.js

function _ensureToastExists() {
    if (!document.getElementById('custom-toast')) {
        const toastDiv = document.createElement('div');
        toastDiv.id = 'custom-toast';
        toastDiv.className = 'toast-hidden';
        toastDiv.innerHTML = '<span id="toast-message"></span>';
        document.body.appendChild(toastDiv);
    }
}

let toastTimeout;

// Funzione core privata (gestisce la logica comune)
function _showToast(message, type) {
    _ensureToastExists();

    const toast = document.getElementById('custom-toast');
    const toastMessage = document.getElementById('toast-message');
    
    // Scegliamo l'icona in base al tipo
    const icon = type === 'success' ? '✅' : '⚠️';
    toastMessage.textContent = `${icon} ${message}`;
    
    // Applichiamo le classi corrette (es: "toast-visible toast-success")
    toast.className = `toast-visible toast-${type}`;
    
    clearTimeout(toastTimeout);
    
    toastTimeout = setTimeout(() => {
        toast.className = "toast-hidden";
    }, 4000);
}

/**
 * Mostra un popup di ERRORE (Rosso)
 * @param {string} message 
 */
function showSystemError(message) {
    _showToast(message, 'error');
}

/**
 * Mostra un popup di SUCCESSO (Verde)
 * @param {string} message 
 */
function showSystemSuccess(message) {
    _showToast(message, 'success');
}