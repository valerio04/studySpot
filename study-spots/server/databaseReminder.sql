-- Tabella profili collegata a Supabase auth.users
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  surname VARCHAR(255) NOT NULL,
  points INTEGER DEFAULT 0
);

CREATE TABLE spots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  type VARCHAR(255) NOT NULL
);

CREATE TABLE salvati (
  user_id UUID NOT NULL,
  spot_id INTEGER NOT NULL,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, spot_id),
  CONSTRAINT fk_salvati_profiles FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_salvati_spots FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
);

CREATE TABLE aggiunti (
  user_id UUID NOT NULL,
  spot_id INTEGER NOT NULL,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, spot_id),
  CONSTRAINT fk_aggiunti_profiles FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_aggiunti_spots FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
);

CREATE TABLE comments (
  comment TEXT NOT NULL,
  star INTEGER NOT NULL CHECK (star >= 1 AND star <= 5),
  user_id UUID NOT NULL,
  spot_id INTEGER NOT NULL,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, spot_id),
  CONSTRAINT fk_comments_profiles FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_spots FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
);

CREATE TABLE hours (
  id SERIAL PRIMARY KEY,
  day_of_week VARCHAR(20) NOT NULL,
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  UNIQUE (day_of_week, open_time, close_time)
);

CREATE TABLE spot_hours (
  spot_id INTEGER NOT NULL,
  hours_id INTEGER NOT NULL,
  PRIMARY KEY (spot_id, hours_id),
  CONSTRAINT fk_spotshours_hours
    FOREIGN KEY (hours_id) REFERENCES hours(id) ON DELETE CASCADE,
  CONSTRAINT fk_spotshours_spots
    FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE spot_tags (
  spot_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (spot_id, tag_id),
  CONSTRAINT fk_spottags_spots
    FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE,
  CONSTRAINT fk_spottags_tags
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);



-- 1) Funzione che crea profiles quando un utente viene creato in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, name, surname, points)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'surname',
    COALESCE((NEW.raw_user_meta_data->>'points')::int, 0)
  );

  RETURN NEW;
END;
$$;

-- 2) Trigger: scatta dopo l’inserimento di un nuovo utente in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();



/*
QUERY PER CLASSIFICA
select p.username, p.points, a.num_aggiunti, c.num_commenti
from profiles p join (select user_id, count(*) as num_aggiunti from aggiunti group by user_id) a on p.user_id = a.user_id join (select user_id, count(*) as num_commenti from commenti group by user_id) c on p.user_id = c.user_id
order by points desc
limit 100
/*

/* esempio da mettere in register
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      username,  // dal form
      name,       // dal form
      surname,    // dal form
      // points: ... (opzionale)
    }
  }
});

per login: usa supabase.auth.signInWithPassword


const email = "test.user@example.com";
const password = "StrongPassword!123";
const username = "mario_rossi";
const name = "Mario";
const surname = "Rossi";
const points = 25;

async function createUser() {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        name,
        surname,
        points,
      },
    },
  });

  if (error) {
    console.error("Errore signUp:", error);
    return;
  }

  console.log("Creato utente:", data);
}

createUser();


*/
//https://supabase.com/dashboard/project/rnawaanpgqdzccqqwtyp