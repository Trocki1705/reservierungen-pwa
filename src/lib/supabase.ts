import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // Klarer Fehler im Dev-Modus
  // (In Produktion wird das durch Build/Env ohnehin gesetzt)
  console.warn("Supabase ENV fehlt. Bitte .env anlegen (siehe .env.example).");
}

export const supabase = createClient(url ?? "", anon ?? "");
