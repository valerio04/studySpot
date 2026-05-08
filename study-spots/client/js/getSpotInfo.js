document.addEventListener('DOMContentLoaded', caricaDati);

async function caricaDati() {
    // 1. Estrai l'ID dello spot dall'URL (es: /spot.html?id=123 o tramite parametri di rotta)
    const urlParams = new URLSearchParams(window.location.search);
    const spotId = urlParams.get('id');

    if (!spotId) {
        console.error("ID dello spot non trovato nell'URL");
        return;
    }

    try {
        const response = await fetch(`/api/info-spot/${spotId}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
			throw new Error('Errore durante il recupero degli spot più votati.');
		}

		const dataSpot = await response.json();
        console.log(dataSpot);

        popolaPagina(dataSpot);

    } catch (error) {
		console.error('Errore caricamento top rated:', error);
	}
}

async function popolaPagina(spot) {
    // Intestazione
    document.querySelector('.spot-header h1').textContent = spot.name;
    document.querySelector('.address').textContent = spot.address;
    document.querySelector('.rating-text').textContent = `${spot.spot_avg} (${spot.star_count} recensioni)`;

    const tagsContainer = document.querySelector('.micro-tags');
    tagsContainer.innerHTML = ''; // Pulisce i tag statici

    // ASSOCIARE AD OGNI VALUE IL TAG CORRETTO
    spot.tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        tagsContainer.appendChild(span);
    });


    // Link Google Maps
    const mapsLink = document.querySelector('.google-maps-link');
    mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.nome + " " + spot.indirizzo)}`;

    // Orari di apertura
    const hoursList = document.querySelector('.hours-card ul');
    hoursList.innerHTML = ''; // Pulisce la lista statica


    // Otteniamo il giorno della settimana corrente (0=Domenica, 1=Lunedì, ecc.)
    const oggiIndice = new Date().getDay();
    const giorniSettimana = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const giornoOggiTesto = giorniSettimana[oggiIndice];

    spot.hours.forEach(item => {
        const li = document.createElement('li');
        
        // Controlla se è il giorno corrente per applicare la classe CSS
        if (item.day_of_week === giornoOggiTesto) {
            li.className = 'current-day';
        }

        // Formattiamo l'orario (es. togliamo i secondi finali ':00' per renderlo più pulito)
        const apertura = item.open_time.substring(0, 5);
        const chiusura = item.close_time.substring(0, 5);
        
        // Gestione chiusura (se open e close sono uguali o nulli, scrivi "Chiuso")
        const orarioTesto = (apertura === chiusura) ? 'Chiuso' : `${apertura} - ${chiusura}`;
        const nomeGiorno =  item.day_of_week;

        li.innerHTML = `<span>${nomeGiorno}:</span> <span>${orarioTesto}</span>`;
        hoursList.appendChild(li);
    });

    const reviewList = document.querySelector('.review-list');
    reviewList.innerHTML = ''; // Svuota la recensione statica di esempio

    // Cicla sull'array delle recensioni ricevuto dall'API
    spot.recensioni.forEach(rec => {
        // 1. Crea il contenitore principale
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';

        // 2. Costruisci il contenuto HTML (usando i dati della singola recensione)
        // Generiamo le stelle in base al voto (voto 5 = 5 stelle)
        const stelle = '★'.repeat(rec.voto) + '☆'.repeat(5 - rec.voto);

        reviewItem.innerHTML = `
            <div class="review-user">
                <img src="${rec.user_img || 'assets/img/profile.png'}" alt="Avatar">
                <div>
                    <strong>${rec.username}</strong>
                    <span class="stars-small">${stelle}</span>
                </div>
            </div>
            <p>${rec.testo}</p>
        `;

        // 3. Aggiungilo alla lista nella pagina
        reviewList.appendChild(reviewItem);
    });
}