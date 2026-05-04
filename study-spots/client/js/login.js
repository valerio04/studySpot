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
            credentials: 'include' // oppure 'include'
        });

        const data = await response.json();

        if (response.ok) {
            message.textContent = "Login effettuato con successo.";
            message.style.color = "green";
            window.location.href = '/';
        } else {
            message.textContent = data.error || "Errore durante il login.";
            message.style.color = "red";
        }
    } catch (error) {
        console.error('Errore durante il login:', error);
        message.textContent = "Si è verificato un errore. Riprova più tardi.";
        message.style.color = "red";
    }
}

function raccogliDatiUtente(form) {
    const formData = new FormData(form);
    return {
        email: formData.get('email').trim(),
        password: formData.get('password'),
    };
}