/*permette di gestire la registrazione dell'utente, con validazione dei dati
 e gestione degli errori */


const form = document.getElementById('register');
form.addEventListener('submit',registrazione);



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
        showSystemError('Le password non coincidono.');
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
        
        const result = await response.json();
        
        if (!response.ok) {
            showSystemError(result.error || 'Errore durante la registrazione.');
            return;
        }
        
        // console.log('Risultato JSON:', result);
    showSystemSuccess('Registrazione completata con successo.');
    form.reset();
    window.location.href = '/index.html';
    } catch (error) {
        console.error('Errore durante la registrazione:', error.message);
        showSystemError("Si è verificato un errore. Riprova più tardi.");
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

//  Intercetta tutti gli errori standard di JavaScript (es. variabili inesistenti, crash improvvisi)
window.addEventListener('error', function (event) {
    // Evita che l'errore standard blocchi tutto o appaia brutto
    showSystemError(event.message);
    
});

//  Intercetta gli errori delle Promise/Chiamate asincrone non gestite (es. fetch che falliscono senza catch)
window.addEventListener('unhandledrejection', function (event) {
    // event.reason contiene l'oggetto Errore lanciato dentro la Promise
    const messaggio = event.reason.message || "Si è verificato un errore asincrono.";
    showSystemError(messaggio);
});