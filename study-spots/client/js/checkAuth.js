async function checkAuth() {
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const btnLogout = document.getElementById('btn-logout');
    const userInfo = document.getElementById('user-info');
    const usernameSpan = document.getElementById('username');
    // Su alcune pagine il link profilo potrebbe non avere id="btn-profile".
    const profileBtn = document.getElementById('btn-profile');
    try {
        // Chiamiamo l'endpoint che abbiamo creato prima
        const response = await fetch('/api/me',
            { credentials: 'include' }
        );

        if (response.ok) {
            // L'utente è loggato (Stato 200)
            const user = await response.json();
            console.log("Utente autenticato:", user);
            if (usernameSpan) usernameSpan.textContent = user.profile.name; // o user.email
            
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

const btnLogout = document.getElementById('btn-logout');

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/'; // Ricarica la pagina o vai in home
        }
    });
}