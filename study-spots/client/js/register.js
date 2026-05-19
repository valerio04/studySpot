const form = document.getElementById('register');
form.addEventListener('submit',registrazione);

// per mostraere i messaggi di errore o successo
let message = document.getElementById('register-message');
if (!message) {
    message = document.createElement('div');
    message.id = 'register-message';
    // Inserisce il messaggio sopra il form
    form.insertBefore(message, form.firstChild);
} 

// FUNZIONE CHE SI OCCUPA DELLA REGISTRAZIONE
async function registrazione(event) {
    // Impedisce l'invio del form e la ricarica della pagina
    event.preventDefault();

    // Formdata è un oggetto che permette di raccogliere i dati del form in modo semplice, utilizzando i nomi degli input come chiavi
    const formData = new FormData(form);

    const password = formData.get('password');
    const confirmPassword = formData.get('confirm-password');

    // controllo password
    if (password !== confirmPassword) {
        message.textContent = 'Le password non coincidono.';
        message.style.color = 'red';
        return;
    }

    const datiUtente = raccogliDatiUtente(form);
    console.log('Dati Utente', datiUtente);

    // Invia i dati al server usando fetch
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify(datiUtente),
            credentials: 'include'
        });
        
        if (!response.ok) {
            message.textContent = result.error || 'Errore durante la registrazione.';
            message.style.color = 'red';
            return;
        }

        const result = await response.json();
        // console.log('Risultato JSON:', result);
        
        message.textContent = 'Registrazione completata con successo.';
        //message.textContent = 'Registrazione completata. Controlla la tua email per confermare.';
        message.style.color = 'green';
        form.reset();
    } catch (error) {
        console.error('Errore durante la registrazione:', error.message);
        message.textContent = "Si è verificato un errore. Riprova più tardi.";
        message.style.color = "red";
    }
}

function raccogliDatiUtente(form) {
    const formData = new FormData(form);
    return {
        email: formData.get('email').trim(),
        password: formData.get('password'),
        username: formData.get('username'),
        name: formData.get('name'),
        surname: formData.get('surname'),
        points: formData.get('points') || 0
    };
}