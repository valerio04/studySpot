'use strict';

// Elementi DOM
const rankingBody = document.getElementById('ranking-body');
const rankingUser = document.getElementById('ranking-user');

// Carica la classifica all'apertura della pagina
document.addEventListener('DOMContentLoaded', caricaClassifica);
document.addEventListener('DOMContentLoaded', caricaUtenteClassifica);

//=================Carica i dati della classifica da /api/ranking=================
 
async function caricaClassifica() {
    try {
        const response = await fetch('/api/ranking', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Errore durante il recupero della classifica.');
        }

        const ranking = await response.json();

        // Popola la tabella
        popolaClassifica(ranking);

    } catch (error) {
        console.error('Errore caricamento classifica:', error);
        if (rankingBody) {
            rankingBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Errore nel caricamento della classifica</td></tr>';
        }
    }
}


 // Popola le righe della tabella classifica
 //Array di oggetti {username, points, num_aggiunti, num_commenti}
 
function popolaClassifica(ranking) {
    if (!rankingBody) return;

    rankingBody.innerHTML = '';

    if (!Array.isArray(ranking) || ranking.length === 0) {
        rankingBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nessun dato disponibile</td></tr>';
        return;
    }

    ranking.forEach((profilo, index) => {
        const riga = document.createElement('tr');
        riga.innerHTML = `
            <td>${index + 1}</td>
            <td>${profilo.username || 'Anonimo'}</td>
            <td>${profilo.num_aggiunti ?? 0}</td>
            <td>${profilo.num_commenti ?? 0}</td>
            <td>${profilo.points ?? 0}</td>
        `;
        rankingBody.appendChild(riga);
    });
}
//===============================================

//=================Carica i dati dell'utente loggato per mostrare la posizione in classifica=================
async function caricaUtenteClassifica() {
    try {
        // Recupera la posizione dell'utente in classifica
        const userPositionResponse = await fetch('/api/ranking_user', {
            method: 'GET',
            credentials: 'include'
        });

        if (!userPositionResponse.ok) {
            throw new Error('Errore durante il recupero della posizione in classifica.');
        }

        const userPosition = await userPositionResponse.json();

        

        // Mostra la posizione e i punti dell'utente
        if (rankingUser) {
            rankingUser.textContent = `La tua posizione: ${userPosition.rank ?? 0} - Punti: ${userPosition.points ?? 0}`;
        }

    } catch (error) {
        console.error('Errore caricamento dati utente:', error);
    }
}
