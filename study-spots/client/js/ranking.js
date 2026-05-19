'use strict';

// Elementi DOM
const rankingBody = document.getElementById('ranking-body');
const rankingUser = document.getElementById('ranking-user');
const rankingUserNumber = document.getElementById('user-rank-number');
const UserPoints = document.getElementById('user-total-points');

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
 // Array di oggetti {username, points, num_aggiunti, num_commenti}
 
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
            <td class="text-center">
                <span class="rank-number ${index + 1 <= 3 ? 'rank-' + (index + 1) : ''}">
                    ${index + 1}
                </span>
            </td>
            <td>
                <div class="user-info-cell">
                    <div class="nav-avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">
                        ${profilo.username.charAt(0).toUpperCase()}
                    </div>
                    <span class="fw-bold">${profilo.username || 'Anonimo'}</span>
                </div>
            </td>
            <td class="text-center d-none d-md-table-cell">${profilo.num_aggiunti ?? 0}</td>
            <td class="text-center d-none d-md-table-cell">${profilo.num_commenti ?? 0}</td>
            <td class="text-end pe-4">
                <span class="points-text">${profilo.points ?? 0}</span>
            </td>
        `;
        rankingBody.appendChild(riga);
    });
}
//===============================================

//=================Carica i dati dell'utente loggato per mostrare la posizione in classifica=================
async function caricaUtenteClassifica() {
    try {
        //verifica se l'utente è loggato
        const response = await fetch('/api/me',
            { credentials: 'include' }
        );

        if (!response.ok) {
            if (rankingUser) {
                rankingUser.textContent = `Accedi per vedere la tua posizione in classifica`;
            }
        }

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
        rankingUserNumber.textContent = `# ${userPosition.rank ?? 0}`;
        UserPoints.textContent = userPosition.points ?? 0;
        
    } catch (error) {
        console.error('Errore caricamento dati utente:', error);
    }
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