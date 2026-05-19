const form = document.getElementById("login")

// Funzione per mostrare messaggi di errore o successo
let message = document.getElementById('login-message');
if (!message) {
    message = document.createElement('div');
    message.id = 'login-message';
    form.insertBefore(message, form.firstChild);
}

// Assegna la funzione gestisciSubmit all'evento submit del form
form.addEventListener("submit", gestisciSubmit);


// Funzione per gestire l'evento submit del form
async function gestisciSubmit(event) {
    event.preventDefault();

    // Raccogli i dati del modulo utilizzando la funzione dedicata
    const datiUtente = raccogliDatiUtente(form);

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datiUtente),
            credentials: 'include' 
        });

        const data = await response.json();

        if (response.ok) {
            showSystemSuccess("Login effettuato con successo.");
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        } else {
            const errorMsg = data.error || "Errore durante il login.";
            showSystemError(errorMsg);
        }
    } catch (error) {
        console.error('Errore durante il login:', error);
        showSystemError("Si è verificato un errore. Riprova più tardi.");
    }
}

function raccogliDatiUtente(form) {
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');

    // Controllo manuale robusto: se i campi sono vuoti o inesistenti
    if (!email || !password || email.trim() === "" || password.trim() === "") {
        throw new Error("Tutti i campi sono obbligatori.");
    }

    // Se è tutto ok, restituiamo l'oggetto (ora lo scope è corretto)
    return {
        email: email.trim(),
        password: password
    };
}

// 1. Intercetta tutti gli errori standard di JavaScript (es. variabili inesistenti, crash improvvisi)
window.addEventListener('error', function (event) {
    // Evita che l'errore standard blocchi tutto o appaia brutto, e usa il tuo popup!
    showSystemError(event.message);
    
});

// 2. Intercetta gli errori delle Promise/Chiamate asincrone non gestite (es. fetch che falliscono senza catch)
window.addEventListener('unhandledrejection', function (event) {
    // event.reason contiene l'oggetto Errore lanciato dentro la Promise
    const messaggio = event.reason.message || "Si è verificato un errore asincrono.";
    showSystemError(messaggio);
});