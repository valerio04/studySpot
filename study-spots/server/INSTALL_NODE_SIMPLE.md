# Install Node.js — Quick

Scarica Node.js dal sito ufficiale e segui le istruzioni per il tuo sistema operativo:

https://nodejs.org/en/download

Dopo aver installato Node, apri un terminale nella cartella del server del progetto e copia/incolla questi comandi:

Comandi base (nella cartella `server`):

```bash
cd /home/pc/Desktop/progetti/studySpot/study-spots/server
npm install
cp .env.example .env   # modifica .env con le tue chiavi (NON committare)

#PER AVVIARE SERVER E VEDERE HTML FAI:
npm start
```

Opzionale (sviluppo):

```bash
npm install --save-dev nodemon
npx nodemon server.js
```

Per usare Supabase e variabili d'ambiente locali:

```bash
npm install @supabase/supabase-js dotenv
```

---

Se vuoi, posso sovrascrivere `INSTALL_NODE.md` con questa versione semplice; dimmi se preferisci che lo faccia. Ti ho creato questo file nuovo per aver subito il blocco "pulito" con i comandi pronti da copiare. 