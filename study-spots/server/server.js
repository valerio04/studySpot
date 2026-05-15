require('dotenv').config({ path: require('path').join(__dirname, 'key.env') }); // carica key.env in process.env
const express = require('express') //importiamo express
const app = express() //app è un oggetto con cui poi chiamiamo alcuni metodi

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
// Prova questa specifica sintassi se la precedente è fallita:
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configurazione Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configurazione Storage per multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'study_spots',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    // Ulteriore compressione lato server (trasformazione Cloudinary)
    transformation: [{ width: 1000, crop: "limit", quality: "auto", fetch_format: "auto" }]
  },
});

// Middleware multer configurato
const upload = multer({ storage });

// Legge il corpo delle richieste in formato JSON e lo mette in req.body
app.use(express.json());
// Legge il corpo delle richieste inviate da form HTML (application/x-www-form-urlencoded)
// e lo mette in req.body
app.use(express.urlencoded({ extended: true }));


const PORT = process.env.PORT; //Imposto la prota 
const HOST = '0.0.0.0' //Per consentire accesso da tutti i dispositivi nella rete locale


//IMPOSTIAMO LE ROTTE
const path = require("path") //importiamo path, serve per gestire le directory nel file system in modo univoco per ogni sistema operativo
const ROOT = path.join(__dirname,'..','client') //join serve per unire delle directory in modo univoco per ogni sistema operativo, __dirname sarebbe la directory del file attuale, salviamo una varibile ROOT che punta ai file del front end
// express.static serve tutti i file nella cartella public come risorse statiche.
// Ad esempio public/bootstrap.css diventa accessibile tramite l'URL /bootstrap.css.
// Questo permette al browser di scaricare il CSS quando la pagina HTML include <link href="/bootstrap.css">.
app.use(express.static(ROOT));






//NAVIGAZIONE 

//Pagina home
app.get('/',(req,res)=>{
    res.sendFile(path.join(ROOT,'index.html')) //sendFile serve a inviare un file al client, in questo caso html
})

//Pagina aggiunta spot
app.get('/add-spot', (req, res) => {
    res.sendFile(path.join(ROOT, 'pages', 'add-spot.html'));
});

//Pagina spot
app.get('/spot', (req, res) => {
    res.sendFile(path.join(ROOT, 'pages', 'spot.html'));
});

//pagina login
app.get("/login",(req,res)=>{
    res.sendFile(path.join(ROOT,'pages','login.html')) 
})

// pagina registrazione
app.get("/register",(req,res)=>{
    res.sendFile(path.join(ROOT,'pages','register.html')) 
})

//pagina profilo
app.get("/profile",(req,res)=>{
    res.sendFile(path.join(ROOT,'pages','profile.html'))
})

//pagina admin
app.get("/admin",(req,res)=>{
    res.sendFile(path.join(ROOT,'pages','admin.html'))
})

//pagina ranking
app.get("/ranking",(req,res)=>{
    res.sendFile(path.join(ROOT,'pages','ranking.html'))
})

// pagina lista
app.get("/list",(req,res)=>{
    res.sendFile(path.join(ROOT,'pages','list.html'))
})


//QUERY SU DATABASE
//Queste righe sono di setup, dipendono dal servizio di DB

const { createClient, SupabaseClient } = require('@supabase/supabase-js');
const { createServerClient, parseCookieHeader, serializeCookieHeader } = require('@supabase/ssr');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
// chiave non privata: sb_publishable_Q6-6Iq8U7ZgPVfUyTIzHTA_bCoS9E2q

let supabase;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Supabase client inizializzato.');
}
else {
  console.warn('SUPABASE_URL o SUPABASE_KEY non configurati. Le funzionalità del database non saranno disponibili.');
}



// Funzione helper per creare il client Supabase per ogni richiesta
const getSupabase = (req, res) => {
  return createServerClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(req.headers.cookie ?? '')
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.appendHeader('Set-Cookie', serializeCookieHeader(name, value, options))
          )
        },
      },
    }
  )
}


// ==========API: ME (Ottieni i dati dell'utente corrente)===========
app.get('/api/me', async (req, res) => {

    console.log('GET /api/me');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }  

    const supabaseClient = getSupabase(req, res);
    //const supabaseClient = supabase;

    // prendo i dati dell'utente loggato tramite auth.getUser()
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error || !user) {
        return res.status(401).json({ error: "Non sei loggato" });
    }

    // Recuperiamo i dati extra dalla tabella profiles
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();


    if (error) {
        console.error("Errore nel caricamento profilo:", error.message);
    } else {
        console.log("Profilo trovato:", profile);
    }

    res.json({ user, profile });
})
//===============================================================

// =============API: REGISTER ================================
app.post('/api/register', async (req, res) => {
    // Log leggero: non stampiamo password o dati sensibili
    console.log('POST /register');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }

    // estraiamo i campi passati in input alla richiesta, essi sono disponibili in req.body grazie al middleware express.json() registrato prima.
    const { email, password, username, name, surname, points } = req.body;
    
    const supabaseClient = getSupabase(req, res);
    console.log('POST /register ricevuto:', { email, password, username, name, surname, points });

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            // questi campi vengono inviati a Supabase come metadata dell'utente,
            // non come colonne dirette di auth.users. Il trigger sul DB legge
            // NEW.raw_user_meta_data e crea la riga corrispondente in profiles.
            options: {
                data: {
                    username,
                    name,
                    surname,
                    points
                }
            }
        });

    // Se vuoi, puoi stampare `data.user?.id` per tracciare gli utenti creati.
    // console.log('Supabase signUp userId:', data?.user?.id);

        if (error) {
            console.error('Errore registrazione Supabase:', error.message);
            return res.status(400).json({ error: error.message });
        }

        // imposto status a 201 (successo) e invio un JSON contente i dati dell'utente appena registrato
        return res.status(201).json({ ok: true, data });
    } catch (e) {
        console.error('Errore inatteso in /register:', e);
        return res.status(500).json({ error: 'Errore server' });
    }
});
//===============================================================

// ========================= API: LOGIN =========================
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    const supabaseClient = getSupabase(req, res);

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email, 
        password 
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ ok: true, data });
});


// ======== API: LOGOUT ========
app.post('/api/logout', async (req, res) => {
    const supabaseClient = getSupabase(req, res);
    const { error } = await supabaseClient.auth.signOut();
    if (error) return res.status(500).json({ error: "Errore logout" });
    res.status(200).json({ message: "Logout effettuato" });
});


// ======== API: RANKING ========
app.get('/api/ranking', async (req, res) => {

    console.log('GET /api/ranking');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            username,
            points,
            aggiunti_count: aggiunti(count),
            comments_count: comments(count)
        `)
        .order('points', { ascending: false })
        .limit(100);
    
    
    if (error) {
        res.status(500).json({error: 'Errore durante il recupero della classifica:'}); 
        console.error('Errore durante il recupero della classifica:', error);
        return;
    }
    
    if (!data) {
      return res.status(200).json({ success: true, data: [] });
    }
    
    // 3. Formattiamo i dati trasformando la struttura nidificata
    // se vuoi capire meglio vedi funzionamento di .map() in JS

    const formattedData = data.map(profile => ({
        username: profile.username,
        points: profile.points,
        num_aggiunti: profile.aggiunti_count?.[0]?.count || 0,
        num_commenti: profile.comments_count?.[0]?.count || 0
    }));

    res.json(formattedData)

});
//===============================================================

// ======== API: RANKING (posizione dell'utente loggato) ========

app.get('/api/ranking_user' , async (req, res) => {
    console.log('GET /api/ranking_user');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }

    const supabaseClient = getSupabase(req, res);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
        return res.status(401).json({ error: "Non sei loggato" });
    }

    // Recupera il profilo dell'utente loggato per ottenere i punti
    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('points')
        .eq('user_id', user.id)
        .single();

    if (profileError || !profile) {
        console.error('Errore durante il recupero del profilo:', profileError);
        return res.status(500).json({ error: 'Errore durante il recupero del profilo utente' });
    }

    const userPoints = profile.points;

    // Conta gli utenti con un punteggio maggiore
    const { count, error: countError } = await supabaseClient
        .from('profiles')
        .select('points', { count: 'exact', head: true })
        .gt('points', userPoints);

    if (countError) {
        console.error('Errore durante il recupero della classifica:', countError);
        return res.status(500).json({ error: 'Errore durante il recupero della classifica' });
    }

    res.json({ rank: count + 1, points: userPoints , user_id: user.id }); // +1 perché il conteggio è zero-based
});


// ======== API: PROFILE (dati completi del profilo dell'utente loggato) ========
app.get('/api/profile',async (req,res)=>{

    console.log('GET /api/profile');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }
    
    const supabaseClient = getSupabase(req, res);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
        return res.status(401).json({ error: "Non sei loggato" });
    }

    const userId = user.id;

    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select(`
                username,
                name,
                surname,
                points,
                
                salvati (
                    data,
                    spots (
                        id,
                        name,
                        address,
                        type
                    )
                ),
                
                aggiunti (
                    data,
                    spots (
                        id,
                        name,
                        address,
                        type
                    )
                ),
                
                comments (
                    comment,
                    star,
                    data,
                    spots (
                        id,
                        name
                    )
                )
            `)
            
            .eq('user_id', userId)
            .single();

        // 3. Gestione degli errori lato database
        if (error) {
            console.error("Errore Supabase:", error.message);
            // Restituisco uno status 500 (Internal Server Error) e un JSON con l'errore
            return res.status(500).json({ error: "Errore durante il recupero dei dati dal database." });
        }

        // 4. Controllo se l'utente esiste effettivamente
        if (!profile) {
            return res.status(404).json({ error: "Profilo non trovato." });
        }

        const completeProfile = {
            //i tre puntini servono a copiare tutte le proprietà di profile dentro completeProfile, in questo modo non dobbiamo riscrivere username, name, surname, points, salvati, aggiunti e comments
            ...profile,
            email: user.email, // L'email viene da auth.getUser()
            aggiunti_count: profile.aggiunti?.length || 0,
            commenti_count: profile.comments?.length || 0,
            salvati_count: profile.salvati?.length || 0
        };
        // 5. Tutto è andato bene: restituisco l'oggetto JSON completo al frontend
        res.status(200).json(completeProfile);

    } catch (err) {
        // Gestione degli errori imprevisti del server
        console.error("Errore del server:", err);
        res.status(500).json({ error: "Errore interno del server." });
    }
});

// FORMATO CON IL QUALE VENGONO RESTITUITI I DATI DELL'UTENTE LOGGATO NELL'ENDPOINT /api/profile
/*
{
  "username": "MarioRossi99",
  "name": "Mario",
  "surname": "Rossi",
  "points": 1250,
  "salvati": [
    {
      "data": "2026-05-01T10:00:00.000Z",
      "spots": {
        "id": 14,
        "name": "Biblioteca Centrale",
        "address": "Via Roma 10",
        "type": "library"
      }
    },
    {
      "data": "2026-04-28T15:30:00.000Z",
      "spots": {
        "id": 8,
        "name": "Caffè Letterario",
        "address": "Piazza Dante 2",
        "type": "cafe"
      }
    }
  ],
  "aggiunti": [
    {
      "data": "2026-04-20T09:00:00.000Z",
      "spots": {
        "id": 3,
        "name": "Parco della Musica",
        "address": "Viale della Musica 20",
        "type": "park"
      }
    }
  ],
  "comments": [
    {
      "comment": "Ottimo posto per studiare, molto silenzioso!",
      "star": 5,
      "data": "2026-05-02T09:15:00.000Z",
      "spots": {
        "id": 14,
        "name": "Biblioteca Centrale"
      }
    },
    {
      "comment": "Troppo rumoroso.",
      "star": 2,
      "data": "2026-04-30T16:00:00.000Z",
      "spots": {
        "id": 8,
        "name": "Caffè Letterario"
      }
    }
  ],
  "salvati_count": 2,
  "comments_count": 2,
  "aggiunti_count": 1
}
*/

//=================API: modifica profilo ================

app.post('/api/modify-profile', async (req, res) => {
    console.log('POST /api/modify-profile');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato' });
    }

    const supabaseClient = getSupabase(req, res);
    
    // 1. Recupera l'utente autenticato
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        return res.status(401).json({ error: "Utente non autenticato" });
    }

    const {nome, cognome, username, email, password} = req.body;

    try {
        // --- PARTE 1: Aggiornamento Email e Password (Auth) ---
        const authUpdates = {};
        if (email) authUpdates.email = email;
        if (password) authUpdates.password = password;

        if (Object.keys(authUpdates).length > 0) {
            const { error: updateAuthError } = await supabaseClient.auth.updateUser(authUpdates);
            if (updateAuthError) {
                console.error('Errore inserimento commento:', updateAuthError);
                return res.status(500).json({ error: 'Errore durante l\'inserimento del commento' });
            }
        }

        // --- PARTE 2: Aggiornamento Nome, Cognome, Username (Tabella Profiles) ---
        const profileUpdates = {};
        if (nome !== undefined) profileUpdates.nome = nome;
        if (cognome !== undefined) profileUpdates.cognome = cognome;
        if (username !== undefined) profileUpdates.username = username;

        if (Object.keys(profileUpdates).length > 0) {
            const { error: updateProfileError } = await supabaseClient
                .from('profiles')
                .update(profileUpdates)
                .eq('id', user.id); // L'ID del profilo coincide con l'ID di Auth

            if (updateProfileError) {
                console.error('Errore inserimento commento:', updateProfileError);
                return res.status(500).json({ error: 'Errore durante l\'inserimento del commento' });
            }
        }

        res.json({ message: "Profilo aggiornato con successo" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

//=================API: add commento e valutazione a uno spot ================

app.post('/api/add-comment', async (req, res) => {
    console.log('POST /api/add-comment');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato' });
    }

    const supabaseClient = getSupabase(req, res);
    
    // 1. Recupera l'utente autenticato
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        return res.status(401).json({ error: "Utente non autenticato" });
    }

    const { spotId, comment, rating } = req.body;

    // Validazione minima
    if (!spotId || !rating) {
        return res.status(400).json({ error: "ID spot e valutazione sono obbligatori" });
    }

    try {
        // 2. Prepariamo i dati per la tabella 'comments'
        const insertData = {
            star: rating,
            user_id: user.id,
            spot_id: spotId
        };

        // Aggiungiamo il commento solo se è presente nella richiesta
        if (comment && comment.trim() !== "") {
            insertData.comment = comment;
        }

        const { error: commentError } = await supabaseClient
            .from('comments')
            .insert([insertData]);

        if (commentError) {
            console.error('Errore inserimento commento:', commentError);
            return res.status(500).json({ error: 'Errore durante l\'inserimento del commento' });
        }

        
        

        // 4. Risposta al client
        return res.status(201).json({ 
            message: 'Valutazione aggiunta con successo!',
            data: { spotId, rating, comment } 
        });

    } catch (e) {
        console.error('Errore inatteso:', e);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
});
            


// ======== API: ADD SPOT ========

app.post('/api/add-spot', upload.array('photos', 5), async (req, res) =>{
    console.log('POST /api/add-spot');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }

    const supabaseClient = getSupabase(req, res);
    
    // Recupera l'utente autenticato
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        return res.status(401).json({ error: "Utente non autenticato" });
    }

    const {
        name,
        address,
        latitude,
        longitude,
        type,
        price,
        environment,
        outlets,
        quiet,
        crowd,
        schedule,
        rating,
        comment
    } = req.body;
    

    try {
        // Parsa schedule da stringa JSON a oggetto
        let parsedSchedule = null;
        if (schedule && schedule !== 'null') {
            try {
                parsedSchedule = JSON.parse(schedule);
            } catch (parseErr) {
                console.warn('Errore nel parsing di schedule:', parseErr);
                parsedSchedule = null;
            }
        }

        let spotId;
        // Inserisce il nuovo spot nel database
        const { data: spot, error: spotError } = await supabaseClient
            .from('spots')
            .insert(
                {
                    name,
                    address,
                    latitude,
                    longitude,
                    type
                }
            )
            .select()
            .single();
            
        if (spotError) {
            console.error('Errore durante l\'inserimento dello spot:', spotError);
            return res.status(500).json({ error: 'Errore durante l\'inserimento dello spot' });
        }
        
        spotId = spot.id;

        // 3. INSERIMENTO FOTO (Tabella spot_photos)
        if (req.files && req.files.length > 0) {
            const photosToInsert = req.files.map((file, index) => ({
                spot_id: spotId,
                numero_foto: index + 1,
                link_foto: file.path // URL fornito da Cloudinary via multer-storage-cloudinary
            }));

            const { error: photosError } = await supabaseClient
                .from('spot_photos')
                .insert(photosToInsert);

            if (photosError) console.error('Errore salvataggio foto:', photosError);
        }

        // --- SEZIONE TAG CORRETTA ---
        const tags = [price, environment, outlets, quiet, crowd].filter(tag => tag !== undefined && tag !== null);

        if (tags.length > 0) {
            // Inseriamo i tag con 'upsert' per evitare duplicati, se il tag esiste già lo recuperiamo, altrimenti lo creiamo. In entrambi i casi otteniamo l'id del tag.
            // Oppure, creiamo quelli mancanti:
            
            for (const tagName of tags) {
                // Cerchiamo o creiamo il tag
                const { data: tagRow, error: tError } = await supabaseClient
                    .from('tags')
                    .upsert({ name: tagName }, { onConflict: 'name' })
                    .select('id')
                    .single();

                if (!tError && tagRow) {
                    // 2. Associamo il tag allo spot
                    await supabaseClient
                        .from('spot_tags')
                        .insert({ spot_id: spotId, tag_id: tagRow.id });
                }
            }
        }
        /*FORMATO DEGLI ORARI DA USARE NEL FRONTEND:
        {
            "monday": { "open": "09:00", "close": "18:00" },
            "tuesday": { "open": "09:00", "close": "18:00" },
            "wednesday": { "open": "09:00", "close": "13:00" },
            "thursday": { "open": "09:00", "close": "18:00" },
            "friday": { "open": "09:00", "close": "22:00" },
            "saturday": { "open": "10:00", "close": "16:00" },
            "sunday": { "open": "00:00", "close": "00:00" }
        }
        */


        // Inserisce gli orari associati allo spot
        if (parsedSchedule) {
            for (const [day, info] of Object.entries(parsedSchedule)) {

                let hourId;

                // Cerchiamo l'orario esistente
                const { data: existingHour, error: selectError } = await supabaseClient
                    .from('hours')
                    .select('id')
                    .eq('day_of_week', day)
                    .eq('open_time', info.open)
                    .eq('close_time', info.close)
                    .maybeSingle(); // Ritorna null se non lo trova, senza dare errore

                if (selectError) {
                    console.error(`Errore ricerca orario per ${day}:`, selectError);
                    continue; // Salta questo giorno in caso di errore
                }

                if (existingHour) {
                    hourId = existingHour.id;
                } else {
                    // Se non esiste, lo creiamo
                    const { data: newHour, error: insertError } = await supabaseClient
                        .from('hours')
                        .insert({
                            day_of_week: day,
                            open_time: info.open,
                            close_time: info.close
                        })
                        .select('id')
                        .single();

                    if (insertError) {
                        console.error(`Errore creazione orario per ${day}:`, insertError);
                        return res.status(500).json({ error: `Errore durante l'inserimento dell'orario per ${day}` });
                    }
                    hourId = newHour.id;
                }

                if (hourId) {
                    const { error: spotHourError } = await supabaseClient
                        .from('spot_hours')
                        .insert({ spot_id: spotId, hours_id: hourId });

                    if (spotHourError) {
                        console.error(`Errore associazione orario ${day} allo spot ${spotId}:`, spotHourError);
                        return res.status(500).json({ error: `Errore durante l'associazione dell'orario per ${day}` });
                    }
                }
            }
        }


        
        // NUOVA LOGICA: Inserisce la valutazione (e il commento se c'è)
        
        if (rating) { 
            // Costruiamo dinamicamente l'oggetto da inserire, proprio come in add-comment
            const insertData = {
                star: rating,
                user_id: user.id,
                spot_id: spotId
            };

            // Aggiungiamo il testo del commento solo se non è vuoto
            if (comment && comment.trim() !== "") {
                insertData.comment = comment;
            }

            const { error: commentError } = await supabaseClient
                .from('comments')
                .insert([insertData]);

            if (commentError) {
                console.error('Errore durante l\'inserimento del commento iniziale:', commentError);
                // Nota: potresti decidere di non restituire errore 500 qui. 
                // Lo spot è stato creato con successo, è fallito solo il commento.
            }
        }

        
        // INSERIMENTO IN AGGIUNTI (Traccia che l'utente ha creato questo spot)
        
        const { error: aggiuntiError } = await supabaseClient
            .from('aggiunti')
            .insert({ user_id: user.id, spot_id: spotId });
            
        if (aggiuntiError) {
            console.error('Errore durante l\'inserimento in aggiunti:', aggiuntiError);
            return res.status(500).json({ error: 'Errore durante la registrazione dello spot creato' });
        }

        // Tutto completato con successo!
        res.status(201).json({ message: 'Spot creato e valutato con successo!', spotId });

    } catch (error) {
        console.error('Errore inatteso:', error);
        res.status(500).json({ error: 'Errore inatteso durante l\'aggiunta dello spot' });
    }
});
//===================================================================

//=============================================



//============== API: ottieni spot piu attivi==============
//(spot con piu voti indipendentemnte dal voto )
app.get('/api/spots/top-activ', async (req, res) => {
    console.log('GET /api/spots/top-activ');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);

    try {
        // 1. Recuperiamo i dati (senza ordinamento SQL perché ci serve la somma di due colonne)
        const { data, error } = await supabase
            .from('spots')
            .select(`
                id, 
                name, 
                address, 
                type, 
                star_avg, 
                star_count, 
                comment_count,
                spot_photos (link_foto) 
            `)
            .eq('spot_photos.numero_foto', 1); // Prende solo la foto principale

        if (error) {
            console.error('Errore Supabase:', error);
            return res.status(500).json({ error: 'Errore durante il recupero degli spot' });
        }

        // 2. Calcoliamo l'attività totale e ordiniamo
        const sortedSpots = (data || [])
            .map(spot => ({
                ...spot,
                copertina: spot.spot_photos?.[0]?.link_foto || null,
                // Rimuoviamo l'oggetto originale se non ci serve più
                spot_photos: undefined,
                // Assicuriamoci che siano numeri per evitare errori (es. null + null)
                total_activity: (Number(spot.star_count) || 0) + (Number(spot.comment_count) || 0)
            }))
            .sort((a, b) => b.total_activity - a.total_activity) // Ordina per attività decrescente
            .slice(0, limit); // Taglia i risultati secondo il limite richiesto

        return res.json(sortedSpots);

    } catch (err) {
        console.error('Errore inatteso:', err);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
});

//============== API: ottieni spot piu votati (rating pesato)==============

app.get('/api/spots/top-rated', async (req, res) => {
    console.log('GET /api/spots/top-rated');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 100);
    const minVotes = Math.max(parseInt(req.query.minVotes, 10) || 10, 0);

    try {
        const { data, error } = await supabase
            .from('spots')
            .select(`
                id, 
                name, 
                address, 
                type, 
                star_avg, 
                star_count, 
                spot_photos (link_foto) 
            `)
            .eq('spot_photos.numero_foto', 1); // Prende solo la foto principale

        if (error) {
            console.error('Errore durante il recupero spot piu votati:', error);
            return res.status(500).json({ error: 'Errore durante il recupero spot piu votati' });
        }

        //serve solo a garantire che star_avg e star_count siano numeri, in modo da evitare problemi 
        const spots = (data || []).map(spot => ({
            ...spot,
            copertina: spot.spot_photos?.[0]?.link_foto || null,
            // Rimuoviamo l'oggetto originale se non ci serve più
            spot_photos: undefined,
            star_avg: Number(spot.star_avg) || 0,
            star_count: Number(spot.star_count) || 0
        }));
        /* attivare se vuoi piu precisone ma  un po pesante per il db
        const totalVotes = spots.reduce((sum, spot) => sum + spot.star_count, 0);
        const totalStars = spots.reduce((sum, spot) => sum + (spot.star_avg * spot.star_count), 0);
        const globalAvg = totalVotes > 0 ? totalStars / totalVotes : 0;
        */
        const globalAvg = 3.5; // Valore di riferimento fisso per non appesantire troppo il db

        //aggiunge il calcolo del punteggio pesato a ogni spot, usando la formula di Bayes: weighted_score = (v / (v + m)) * R + (m / (v + m)) * globalAvg
        // Calcoliamo il punteggio per ogni spot
        const rankedSpots = spots.map(spot => {
            const v = spot.star_count;    // Numero di voti
            const R = spot.star_avg;      // Media voti dello spot
            const m = minVotes;           // Voti minimi richiesti (es. 5)
            const C = globalAvg;          // Media globale di riferimento (es. 3.5)

            // Applichiamo la formula di Bayes
            // Se non ci sono voti, il punteggio è 0
            const weightedScore = v === 0 
                ? 0 
                : (v / (v + m) * R) + (m / (v + m) * C);

            return {
                ...spot,
                weighted_score: Number(weightedScore.toFixed(3))
            };
        });

        // Ordiniamo i risultati (dal più alto al più basso)
        const sortedResults = rankedSpots.sort((a, b) => b.weighted_score - a.weighted_score);

        // Prendiamo solo i primi (rispettando il limite scelto)
        const finalSelection = sortedResults.slice(0, limit);

        return res.json(finalSelection);
    } catch (err) {
        console.error('Errore inatteso in /api/spots/top-rated:', err);
        return res.status(500).json({ error: 'Errore inatteso nel recupero spot piu votati' });
    }
});

/*esempio di risposta di /api/spots/top-rated
[
  {
    "id": 12,
    "name": "Biblioteca Centrale",
    "address": "Via Università 1",
    "type": "Biblioteca",
    "star_avg": 4.8,
    "star_count": 45,
    "weighted_score": 4.67    <---punteggio su cui si basa ordine
  },
  {
    "id": 5,
    "name": "Cafè dello Studente",
    "address": "Piazza delle Erbe 3",
    "type": "Aula Studio",
    "star_avg": 5.0,
    "star_count": 2,
    "weighted_score": 3.929
  },
  {
    "id": 8,
    "name": "Parco Ducale (Zona Wi-Fi)",
    "address": "Viale del Parco",
    "type": "All'aperto",
    "star_avg": 3.2,
    "star_count": 12,
    "weighted_score": 3.288
  }
]*/










//=============================================
// FINIRE DI IMPLEMENTARE. QUALI SONO LE INFORMAZIONI CHE VENGONO PASSATE PER DELETE SPOT?

app.delete('/api/remove-spot/:id', async (req, res) =>{
    console.log('POST /api/remove-spot');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }

    const supabaseClient = getSupabase(req, res);
    
    // Recupera l'utente autenticato
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        return res.status(401).json({ error: "Utente non autenticato" });
    }

    const idSpot = req.params.id;
    console.log(idSpot);
    console.log(user.id);
    // controllo che lo spot da rimuovere sia stato aggiunto dall'utente loggato, altrimenti non ha il permesso di rimuoverlo
    const { data: controllo, error: controlloError } = await supabaseClient
        .from('aggiunti')
        .select('*')
        .eq('spot_id', idSpot)
        .eq('user_id', user.id)
        .maybeSingle();

    if (controlloError || !controllo) {
        console.error('Errore durante il controllo dello spot:', controlloError);
        return res.status(404).json({ error: 'Spot non trovato' });
    }

    // Rimuove lo spot dal database
    const { error: deleteError } = await supabaseClient
        .from('spots')
        .delete()
        .eq('id', idSpot);
    
    if (deleteError) {
        console.error('Errore durante la rimozione dello spot:', deleteError);
        return res.status(500).json({ error: 'Errore durante la rimozione dello spot' });
    }

    res.status(200).json({ message: 'Spot rimosso con successo!' });
});
//=============================================

//=================API: ottieni tutte le informazioni di uno spot (per la pagina di dettaglio) ===============
app.get('/api/info-spot/:id', async (req, res) =>{
    console.log('POST /api/info-spot');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }

    const supabaseClient = getSupabase(req, res);
    
    // Recupera l'utente autenticato
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    const userId = user?.id || null;
    //dovrebbero essere accessibili a tutti anche ai non leggati
    /*if (userError || !user) {
        return res.status(401).json({ error: "Utente non autenticato" });
    }*/

    const idSpot = req.params.id; // Recupera l'id dello spot dai parametri dell'URL

    const responseData = {
        id: idSpot,
        tags: [],
        hours: [],
        recensioni: []
    };

    const { data: spot, error: spotError } = await supabaseClient
            .from('spots')
            .select(`aggiunti(user_id), spot_photos (link_foto), 
                latitude, longitude, name, address, type, star_avg, star_count`)
            .eq('id', idSpot)
            .maybeSingle();

     if (!spot) {
        return res.status(404).json({ error: 'Spot non trovato' });
    }
            
    if (spotError) {
        console.error('Errore durante l\'inserimento dello spot:', spotError);
        return res.status(500).json({ error: 'Errore durante l\'inserimento dello spot' });
    }
    
    console.log(spot.aggiunti);
    // Aggiunge il campo isOwner per verificare se l'utente loggato è il creatore dello spot
    if (spot && spot.aggiunti) {
        console.log('trovato');
        spot.isOwner = user && user.id === spot.aggiunti.user_id ? true : false;
    }

    if (spot) {
        Object.assign(responseData, spot);
    }

    const { data: tags, error: tagError } = await supabaseClient
        .from('spot_tags')
        .select(`
            tags ( name )
        `)
        .eq('spot_id', idSpot)
        
    if (tagError) {
        console.error('Errore durante il recupero dei tag dello spot:', tagError);
        return res.status(500).json({ error: 'Errore durante il recupero dei tag dello spot' });
    }

    if (tags) {
        responseData.tags = tags.map(t => t.tags?.name).filter(Boolean);
    }

    const { data: hours, error: hoursError } = await supabaseClient
        .from('spot_hours')
        .select(`
            hours (day_of_week, open_time, close_time)
        `)
        .eq('spot_id', idSpot)
    
    if (hoursError) {
        console.error('Errore durante il recupero delle ore dello spot:', hoursError);
        return res.status(500).json({ error: 'Errore durante il recupero delle ore dello spot' });
    }

    if (hours) {
        responseData.hours = hours.map(h => h.hours);
    }

    const { data: comments, error: commentsError } = await supabaseClient
    .from('comments')
    .select(`
        comment, 
        star, 
        profiles (
            username
        )
    `)
    .eq('spot_id', idSpot);

    if (commentsError) {
        console.error('Errore durante il recupero dei commenti:', commentsError);
    }

    if (comments) {
        
        responseData.recensioni = comments.map(c => ({
            comment: c.comment,
            star: c.star,
            username: c.profiles?.username || 'Utente anonimo'
        }));
    }

    return res.status(200).json(responseData);
});
//===================================================================


//=================API: salva spot (per la lista dei preferiti) ===============
app.post('/api/salva-spot', async (req, res) =>{
    console.log('POST /api/salva-spot');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }

    const supabaseClient = getSupabase(req, res);
    
    // Recupera l'utente autenticato
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        return res.status(401).json({ error: "Utente non autenticato" });
    }

    const {
        idSpot
    } = req.body;


    const { error: commentError } = await supabaseClient
        .from('salvati')
        .insert(
            {
            user_id: user.id,
            spot_id: idSpot
            }
        );

    if (commentError) {
        console.error('Errore durante l\'inserimento del commento:', commentError);
        return res.status(500).json({ error: 'Errore durante l\'inserimento del commento' });
    }

    res.status(201).json({ message: 'Spot salvato con successo!' });
});

//=================API: controlla se uno spot è già stato salvato dall'utente (per mostrare il cuoricino pieno o vuoto) ===============
app.get('/api/is-saved/:idSpot', async (req, res) => {
 
    console.log('GET /api/is-saved/:idSpot');
     if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }
    
    const supabaseClient = getSupabase(req, res);
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return res.status(401).json({ isSaved: false });

    const { data } = await supabaseClient
        .from('salvati')
        .select('*')
        .eq('user_id', user.id)
        .eq('spot_id', req.params.idSpot)
        .maybeSingle();

    res.json({ isSaved: !!data });
});

//=================API: rimuovi spot salvato dalla lista dei preferiti ===============
app.delete('/api/rimuovi-spot-salvato', async (req, res) => {
    
     console.log('DELETE /api/rimuovi-spot-salavto');
     if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }
    
    const supabaseClient = getSupabase(req, res);
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return res.status(401).json({ error: "Non autorizzato" });

    const { error } = await supabaseClient
        .from('salvati')
        .delete()
        .eq('user_id', user.id)
        .eq('spot_id', req.body.idSpot);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: "Rimosso" });
});


//=================API: ottieni lista degli spot salvati (per la pagina del profilo) ===============
app.get('/api/salvati', async (req, res) => {
    console.log('GET /api/salvati');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }
    
    const supabaseClient = getSupabase(req,res);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        return res.status(401).json({ error: "Utente non autenticato" });
    }

    const {data: spot_salvati, error: salvatiError } = await supabaseClient
        .from('salvati')
        .select(`
            spots (id, name, address, type, star_avg)
            `)
        .eq('user_id',user.id)

    if (salvatiError) {
        console.error('Errore durante la ricerca degli spot:', salvatiError);
        return res.status(500).json({ error: 'Errore durante la ricerca degli spot' });
    }

    // Nota: spot_salvati sarà un array di oggetti tipo: [{ spots: {...} }, { spots: {...} }]
    res.json(spot_salvati)
});


app.get('/api/aggiunti', async (req, res) => {
    console.log('GET /api/aggiunti');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }
    
    const supabaseClient = getSupabase(req,res);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        return res.status(401).json({ error: "Utente non autenticato" });
    }

    const {data: spot_aggiunti, error: aggiuntiError } = await supabaseClient
        .from('aggiunti')
        .select(`
            spots (id, name, address, type, star_avg)
            `)
        .eq('user_id',user.id)

    if (aggiuntiError) {
        console.error('Errore durante la ricerca degli spot:', aggiuntiError);
        return res.status(500).json({ error: 'Errore durante la ricerca degli spot' });
    }

    // Nota: spot_salvati sarà un array di oggetti tipo: [{ spots: {...} }, { spots: {...} }]
    res.json(spot_aggiunti)
});

app.get('/api/commenti-aggiunti', async (req, res) => {
    console.log('GET /api/commenti-aggiunti');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }
    
    const supabaseClient = getSupabase(req,res);

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        return res.status(401).json({ error: "Utente non autenticato" });
    }

    const {data: commenti_aggiunti, error: commentiError } = await supabaseClient
        .from('comments')
        .select(`
            comment,
            star,
            spot_id
        `)
        .eq('user_id',user.id)

    if (commentiError) {
        console.error('Errore durante la ricerca degli spot:', commentiError);
        return res.status(500).json({ error: 'Errore durante la ricerca degli spot' });
    }

    // Nota: spot_salvati sarà un array di oggetti tipo: [{ spots: {...} }, { spots: {...} }]
    res.json(commenti_aggiunti)
});

app.get('/api/spots_search', async (req, res) => {
    console.log('GET /api/spots_search');
    
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }

    const supabaseClient = getSupabase(req, res);

    // 1. Convertiamo i parametri da stringhe a numeri
    const type = req.query.type;
    const latitude = parseFloat(req.query.latitude);
    const longitude = parseFloat(req.query.longitude);
    const radiusKm = 5; // Puoi renderlo dinamico passandolo dalla query

    // Validazione base
    if (isNaN(latitude) || isNaN(longitude) || !type) {
        return res.status(400).json({ error: 'Parametri type, latitude o longitude mancanti o non validi' });
    }

    // Calcolo dell'offset per il rettangolo (Bounding Box)
    const latOffset = (radiusKm / 111); 
    const lonOffset = (radiusKm / (111 * Math.cos(latitude * (Math.PI / 180))));

    // Query a Supabase 
    const { data: spots, error } = await supabaseClient
        .from('spots')
        .select('*')
        .eq('type', type)
        .gte('latitude', latitude - latOffset)
        .lte('latitude', latitude + latOffset)
        .gte('longitude', longitude - lonOffset)
        .lte('longitude', longitude + lonOffset);

    if (error) {
        console.error('Errore durante la ricerca degli spot:', error);
        return res.status(500).json({ error: 'Errore durante la ricerca degli spot' });
    }

    res.json(spots);
}); 

app.get('/api/spots_search_all', async (req, res) => {
    console.log('GET /api/spots_search_all');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }

    const supabaseClient = getSupabase(req, res);

    const latitude = parseFloat(req.query.latitude);
    const longitude = parseFloat(req.query.longitude);
    const radiusKm = 5;

    if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Parametri latitude o longitude mancanti o non validi' });
    }

    const latOffset = (radiusKm / 111); 
    const lonOffset = (radiusKm / (111 * Math.cos(latitude * (Math.PI / 180))));

    const { data: spots, error } = await supabaseClient
    .from('spots')
    .select(`
        id,
        name,
        address,
        latitude,
        longitude,
        type,
        star_count,
        star_avg,
        comment_count,
        spot_photos (
            numero_foto,
            link_foto
        )
    `)
    .gte('latitude', latitude - latOffset)
    .lte('latitude', latitude + latOffset)
    .gte('longitude', longitude - lonOffset)
    .lte('longitude', longitude + lonOffset);

    if (error) {
        console.error('Errore durante la ricerca degli spot:', error);
        return res.status(500).json({ error: 'Errore durante la ricerca degli spot' });
    }

    const formattedSpots = (spots || []).map(spot => {
        const photos = spot.spot_photos || [];

        const mainPhoto =
            photos.find(photo => photo.numero_foto === 1) ||
            photos[0];

        return {
            ...spot,
            copertina: mainPhoto ? mainPhoto.link_foto : null,
            spot_photos: undefined
        };
    });

    res.json(formattedSpots);

   
}); 


//=================API: report problemi per utenti================
app.post('/api/reports', async (req, res) => {
    const supabaseClient = getSupabase(req, res);

    // 1. Verifica autenticazione
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) return res.status(401).json({ error: "Effettua il login per segnalare" });

    const { spot_id, reported_user_id, message, report_type } = req.body;

    // 2. Inserimento nel DB
    const { error } = await supabaseClient
        .from('reports')
        .insert([{
            reporter_user_id: user.id,
            spot_id: spot_id || null,
            reported_user_id: reported_user_id || null,
            message: message,
            report_type: report_type || 'generale'
        }]);

    if (error) {
        console.error('Errore invio report:', error);
        return res.status(500).json({ error: "Errore durante l'invio della segnalazione" });
    }

    res.json({ success: true, message: "Segnalazione inviata con successo" });
});


//=================API: gestione report per admin================

app.get('/api/admin/reports', async (req, res) => {
    const supabaseClient = getSupabase(req, res);

    // 1. Verifica autenticazione e ruolo admin (in un'unica fase o sequenziale)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
        return res.status(401).json({ error: "Effettua il login per accedere" });
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (profileError || !profile || profile.role !== 'admin') {
        return res.status(403).json({ error: "Accesso negato" });
    }

    const { data, error } = await supabaseClient
        .from('reports')
        .select(`
            *,
            reporter:profiles!left!fk_report_creator(username, user_id),
            target_user:profiles!left!fk_reported_user(username, user_id),
            spot:spots!left(id, name)
        `)
        .in('status', ['pendente', 'inviato'])
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Errore recupero report:', error);
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

//=================API: aggiorna stato report (admin)================

app.patch('/api/admin/reports/:id', async (req, res) => {
    const supabaseClient = getSupabase(req, res);

    // 1. Verifica autenticazione e ruolo admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
        return res.status(401).json({ error: "Effettua il login per accedere" });
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (profileError || !profile || profile.role !== 'admin') {
        return res.status(403).json({ error: "Accesso negato" });
    }

    const reportId = req.params.id;
    const { status } = req.body; 

    if (!status) {
        return res.status(400).json({ error: "Stato non specificato" });
    }

    // 2. Aggiornamento dello status
    const { data: updatedData, error } = await supabaseClient
        .from('reports')
        .update({ 
            status: status,
            updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .select();

    if (error) {
        console.error('Errore aggiornamento report:', error);
        return res.status(500).json({ error: "Errore durante l'aggiornamento della segnalazione" });
    }
    
    if (!updatedData || updatedData.length === 0) {
        return res.status(404).json({ error: "Segnalazione non trovata" });
    }

    res.json({ success: true, message: "Segnalazione aggiornata con successo" });
});

//=================API: ricerca spot creati da un utente (admin)================
app.get('/api/admin/search-user-spots', async (req, res) => {
    const supabaseClient = getSupabase(req, res);
    const { query } = req.query; // Ora si aspetta solo lo username

    if (!query) return res.status(400).json({ error: "Query mancante" });

    // 1. Verifica autenticazione e ruolo admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: "Non autorizzato" });

    const { data: adminProfile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
        return res.status(403).json({ error: "Accesso negato" });
    }

    // 2. Trova l'utente target (solo per username)
    const { data: targetProfile, error: pError } = await supabaseClient
        .from('profiles')
        .select('user_id, username')
        .eq('username', query) // Ricerca esatta per username
        .maybeSingle();

    if (pError || !targetProfile) return res.status(404).json({ error: "Utente non trovato" });

    // 3. Prendi gli spot creati da lui tramite la tabella 'aggiunti'
    const { data: spots, error: sError } = await supabaseClient
        .from('aggiunti')
        .select('spots(id, name, address, type, star_avg)')
        .eq('user_id', targetProfile.user_id);

    if (sError) return res.status(500).json({ error: sError.message });

    res.json({ user: targetProfile, spots: spots.map(s => s.spots).filter(Boolean) });
});

//=================API: cancellazione massiva spot di un utente (admin)================
app.delete('/api/admin/delete-all-user-spots', async (req, res) => {
    const supabaseClient = getSupabase(req, res);
    const { username } = req.body;

    if (!username) return res.status(400).json({ error: "Username mancante" });

    // 1. Verifica autenticazione e ruolo admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: "Non autorizzato" });

    const { data: adminProfile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
        return res.status(403).json({ error: "Accesso negato" });
    }
    
    // 2. Trova l'ID dell'utente target
    const { data: targetProfile } = await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('username', username)
        .single();

    if (!targetProfile) return res.status(404).json({ error: "Utente non trovato" });

    // 3. Ottieni gli ID degli spot da cancellare
    const { data: userSpots } = await supabaseClient
        .from('aggiunti')
        .select('spot_id')
        .eq('user_id', targetProfile.user_id);

    if (!userSpots || userSpots.length === 0) {
        return res.json({ success: true, message: "L'utente non ha spot creati" });
    }

    const spotIds = userSpots.map(s => s.spot_id);

    // 4. Cancella gli spot (il CASCADE si occupa del resto)
    const { error: delError } = await supabaseClient
        .from('spots')
        .delete()
        .in('id', spotIds);

    if (delError) {
        console.error('Errore cancellazione massiva:', delError);
        return res.status(500).json({ error: "Errore durante la cancellazione massiva" });
    }

    res.json({ success: true, message: `Rimossi ${spotIds.length} spot creati da ${username}` });
});

/*   
PRENDERE LATITUDINE E LONGITUDINE TRAMITE API DI OPENSTREETMAP. L'UTENTE DEVE INSERIRE SOLO L'INDIRZZO.
*/




/*
//ESEMPIO DI POST
//il metodo post fa la stessa cosa del metodo get, ma solo per chiamate POST
// i due punti (:id) servono a indicare un parametro variabile (utile per passare dati)
app.post('/api/ordina-frullato/:id', async (req, res) => {
    const idFrullato = req.params.id; //usiamo req per recuperare il codice del frullato (il parametro variabile di cui parlavamo)

    const idOrdineCasuale = Math.floor(Math.random() * 9000) + 1000; //un numero casuale come id dell'ordine 


    if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ error: 'Database non configurato in questo ambiente' });
    }
    const { data, error } = await supabase
        .from('ordini')
        .insert([
            { 
                id: idOrdineCasuale, 
                frullato: idFrullato 
            }
        ])
        .select(); //select serve a ritornare la riga inserita nel database
        //anche qui usiamo await per aspettare che la query abbia finito

    if (error) {
        console.error(error);
        return res.status(500).json({ error: "Errore durante l'ordine" });
    }

    //201 è un codice di successo
    //mandiamo anche un JSON contente un messaggio testuale di successo e la riga inserita nel DB
    res.status(201).json({ 
        message: "Ordine effettuato con successo!", 
        ordine: data[0] 
    });
});
*/






//AVVIO 
const server = app.listen(3004, '0.0.0.0', ()=>{
    console.log(`server in esecuzione su http://localhost:${PORT}`)
})

// ================= Gestione chiusura graceful con Ctrl+C =================
process.on('SIGINT', () => {
    console.log('\n✋ Ricezione segnale SIGINT. Chiusura server in corso...');
    server.close(() => {
        console.log('✅ Server chiuso correttamente');
        process.exit(0);
    });
    
    // Forza l'uscita dopo 10 secondi se il server rimane appeso
    setTimeout(() => {
        console.error('⚠️  Timeout di chiusura, forzatura dell\'uscita');
        process.exit(1);
    }, 10000);
});

// VEDI SE RIESCI A USARE ANCHE LOCALSTORAGE





