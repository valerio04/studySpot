-- Tabella profili collegata a Supabase auth.users
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  surname VARCHAR(255) NOT NULL,
  points INTEGER DEFAULT 0,
  role text not null default 'user'
);

CREATE TABLE spots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  type VARCHAR(255) NOT NULL,
  star_count integer NOT NULL DEFAULT 0,
  star_avg numeric(6,2) NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0
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
  PRIMARY KEY (spot_id),
  CONSTRAINT fk_aggiunti_profiles FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_aggiunti_spots FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
);

CREATE TABLE comments (
  comment TEXT ,
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

--==================================================

-- 1) Campi su spots
ALTER TABLE public.spots
ADD COLUMN IF NOT EXISTS star_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS star_avg numeric(6,2) NOT NULL DEFAULT 0;

-- 2) Funzione trigger (solo INSERT/DELETE) per modificar la media degli spot quando si aggiunge un commento.
-- RICORDA DI NONMMODIFICAREMAI I ICOMMENTI SOPRATTUTO LE VALUTAZIONI STELLE
CREATE OR REPLACE FUNCTION public.trg_comments_update_spot_star_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.spots s
    SET
      star_count = CASE
        WHEN s.star_count <= 1 THEN 0
        ELSE s.star_count - 1
      END,
      star_avg = CASE
        WHEN s.star_count <= 1 THEN 0
        ELSE ROUND(((s.star_avg * s.star_count) - OLD.star) / (s.star_count - 1), 2)
      END
    WHERE s.id = OLD.spot_id;

    RETURN OLD;

  ELSIF (TG_OP = 'INSERT') THEN
    UPDATE public.spots s
    SET
      star_count = s.star_count + 1,
      star_avg = ROUND(((s.star_avg * s.star_count) + NEW.star) / (s.star_count + 1), 2)
    WHERE s.id = NEW.spot_id;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- 3) Trigger
DROP TRIGGER IF EXISTS comments_star_stats_trigger ON public.comments;

CREATE TRIGGER comments_star_stats_trigger
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.trg_comments_update_spot_star_stats();


--=====================
ALTER TABLE public.spots
ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;

--per tenere aggiornati i num commenti in spot

CREATE OR REPLACE FUNCTION public.trg_comments_update_spot_comment_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.comment IS NOT NULL THEN
      UPDATE public.spots
      SET comment_count = comment_count - 1
      WHERE id = OLD.spot_id;

      UPDATE public.spots
      SET comment_count = 0
      WHERE id = OLD.spot_id AND comment_count < 0;
    END IF;

    RETURN OLD;

  ELSIF (TG_OP = 'INSERT') THEN
    IF NEW.comment IS NOT NULL THEN
      UPDATE public.spots
      SET comment_count = comment_count + 1
      WHERE id = NEW.spot_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS comments_comment_count_trigger ON public.comments;

CREATE TRIGGER comments_comment_count_trigger
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.trg_comments_update_spot_comment_count();




--trigger per punti----------

CREATE OR REPLACE FUNCTION public.trg_points_on_spot_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
  SET points = points + 5
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS points_on_spot_insert ON public.aggiunti;

CREATE TRIGGER points_on_spot_insert
AFTER INSERT ON public.aggiunti
FOR EACH ROW
EXECUTE FUNCTION public.trg_points_on_spot_insert();



CREATE OR REPLACE FUNCTION public.trg_points_on_comment_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  has_comment boolean;
  has_star boolean;
  delta int := 0;
BEGIN
  has_star := NEW.star IS NOT NULL; -- star è NOT NULL nel tuo schema, ma lo gestiamo comunque

  has_comment := (NEW.comment IS NOT NULL AND btrim(NEW.comment) <> '');

  -- +3 se lascia sia commento che recensione
  IF has_comment AND has_star THEN
    delta := 3;
  -- +1 se lascia solo recensione
  ELSIF has_star THEN
    delta := 1;
  END IF;

  IF delta <> 0 THEN
    UPDATE public.profiles
    SET points = points + delta
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS points_on_comment_insert ON public.comments;

CREATE TRIGGER points_on_comment_insert
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.trg_points_on_comment_insert();
DROP TRIGGER IF EXISTS points_on_comment_insert ON public.comments;

CREATE TRIGGER points_on_comment_insert
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.trg_points_on_comment_insert();

//===========================================000


update public.profiles set role='admin' where user_id='34189002-e36a-492a-81dd-35f889b4ddef'; vv, v@gmail.com

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



/*<script type="module">
  import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";

  const supabase = createClient(
    "https://<PROJECT_REF>.supabase.co",
    "<ANON_KEY>"
  );

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log("LOGGATO:", session.user.id);
      // mostra contenuti protetti
    } else {
      console.log("NON loggato");
      // mostra login
    }
  }

  // all'evento di login/logout
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("AUTH EVENT:", event);
    checkSession();
  });

  checkSession();
</script>
*/