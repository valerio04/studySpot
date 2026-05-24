const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const btnLogout = document.getElementById('btn-logout');
const userInfo = document.getElementById('user-info');
const usernameSpan = document.getElementById('username');
const adminMenuItem = document.getElementById('admin-menu-item');
// Su alcune pagine il link profilo potrebbe non avere id="btn-profile".
const profileBtn = document.getElementById('btn-profile');
async function checkAuth() {
    try {
        // Chiamiamo l'endpoint che abbiamo creato prima
        const response = await fetch('/api/me',
            { credentials: 'include' }
        );

        if (response.ok) {
            // L'utente è loggato (Stato 200)
            const user = await response.json();
            console.log("Utente autenticato:", user);

            if (adminMenuItem) adminMenuItem.style.visibility = user.profile.role === 'admin' ? 'visible' : 'hidden';
            
            if (usernameSpan) usernameSpan.textContent = user.profile.name; 
            
            if (userInfo) userInfo.style.display = 'inline';
            if (profileBtn) profileBtn.style.display = 'inline';
            if (btnLogout) btnLogout.style.display = 'inline';
            if (btnLogin) btnLogin.style.display = 'none';
            if (btnSignup) btnSignup.style.display = 'none';
        } else {
            // L'utente non è loggato (Stato 401)
            if (btnLogin) btnLogin.style.display = 'inline';
            if (btnSignup) btnSignup.style.display = 'inline';
            if (userInfo) userInfo.style.display = 'none';
            if (profileBtn) profileBtn.style.display = 'none';
            if (btnLogout) btnLogout.style.display = 'none';
        }
    } catch (error) {
        console.error("Errore durante il controllo autenticazione", error);
    }
}

checkAuth();

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/'; // vai in home
        }
    });
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