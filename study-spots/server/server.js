require('dotenv').config({ path: require('path').join(__dirname, 'key.env') }); // carica key.env in process.env
const express = require('express') //importiamo express
const app = express() //app è un oggetto con cui poi chiamiamo alcuni metodi


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


// ======== API: ADD SPOT ========

app.post('/api/add-spot', async (req, res) =>{
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
        if (schedule) {
            for (const [day, info] of Object.entries(schedule)) {

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


        // Inserisce il commento e la valutazione se forniti
        if (comment && rating) {
            const { error: commentError } = await supabaseClient
                .from('comments')
                .insert([
                    {
                        comment,
                        star: rating,
                        user_id: user.id, // Assumendo che l'utente sia autenticato
                        spot_id: spotId
                    }
                ]);

            if (commentError) {
                console.error('Errore durante l\'inserimento del commento:', commentError);
                return res.status(500).json({ error: 'Errore durante l\'inserimento del commento' });
            }
        }

        const { error: aggiuntiError } = await supabaseClient
            .from('aggiunti')
            .insert({ user_id: user.id, spot_id: spotId });
            
        if (aggiuntiError) {
            console.error('Errore durante l\'inserimento in aggiunti:', aggiuntiError);
            return res.status(500).json({ error: 'Errore durante l\'inserimento in aggiunti' });
        }

        res.status(201).json({ message: 'Spot aggiunto con successo!', spot });

    } catch (error) {
        console.error('Errore inatteso:', error);
        res.status(500).json({ error: 'Errore inatteso durante l\'aggiunta dello spot' });
    }
});



// FINIRE DI IMPLEMENTARE. QUALI SONO LE INFORMAZIONI CHE VENGONO PASSATE PER DELETE SPOT?
/*
app.post('/api/remove-spot', async (req, res) =>{
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

    const {

    } = req.body;
});
*/

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
app.listen(PORT, HOST, ()=>{
    console.log(`server in esecuzione su http://localhost:${PORT}`)
})

// VEDI SE RIESCI A USARE ANCHE LOCALSTORAGE





