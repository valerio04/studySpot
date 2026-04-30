const form = document.getElementById('register');

if (form){

    //per mostraere i messaggi di errore o successo
    let message = document.getElementById('register-message');
    if (!message) {
    message = document.createElement('div');
    message.id = 'register-message';
    // Inserisce il messaggio sopra il form
    form.insertBefore(message, form.firstChild);
    }

    form.addEventListener('submit', async function (event) {
        // Impedisce l'invio del form e la ricarica della pagina
        event.preventDefault();

        // Formdata è un oggetto che permette di raccogliere i dati del form in modo semplice, utilizzando i nomi degli input come chiavi
        const formData = new FormData(form);

        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm-password');
        const username = formData.get('username');
        const name = formData.get('name');
        const surname = formData.get('surname');
        const points = formData.get('points') || '0';

        if (password !== confirmPassword) {
        message.textContent = 'Le password non coincidono.';
        message.style.color = 'red';
        return;
        }
        // Invia i dati al server usando fetch, che è un'API moderna per fare richieste HTTP. In questo caso, stiamo facendo una richiesta POST a /register con i dati del form in formato JSON.
        try {
        console.log('Invio dati:', { email, password, username, name, surname, points });
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({
            email,
            password,
            username,
            name,
            surname,
            points
            })
        });
    // console.log('Risposta fetch:', response);
        const result = await response.json();
    // console.log('Risultato JSON:', result);
    
        if (!response.ok) {
            message.textContent = result.error || 'Errore durante la registrazione.';
            message.style.color = 'red';
            return;
        }
        
        message.textContent = 'Registrazione completata con successo.';
        //message.textContent = 'Registrazione completata. Controlla la tua email per confermare.';
        message.style.color = 'green';
        form.reset();
        } catch (error) {
        message.textContent = 'Errore di rete: ' + error.message;
        message.style.color = 'red';
        console.error('Errore catch:', error);
        }
    });
}else {
    console.warn('Register form not found');
}
