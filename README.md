# Reservierungen-PWA (iPad)
Minimal-MVP als PWA (React + TypeScript + Supabase).

## 1) Supabase einrichten
1. In Supabase ein neues Projekt erstellen.
2. **SQL Editor** öffnen und diese Dateien nacheinander ausführen:
   - `supabase/schema.sql`
   - `supabase/seed.sql`
3. Danach hast du:
   - Bereiche: Restaurant, Pizzastube, Terrasse
   - Tische inkl. Sitzplätze
   - RPC `find_free_tables(...)` (Auto-Tischvorschlag / Verfügbarkeit)

> Hinweis: Für ein internes MVP kannst du RLS (Row Level Security) zunächst auslassen.
> Sobald du online gehst, solltest du RLS + Login aktivieren.

## 2) Projekt lokal starten
Voraussetzung: Node.js (LTS)

```bash
npm install
cp .env.example .env
# In .env deine Supabase URL + ANON KEY eintragen
npm run dev
```

Dann im Browser öffnen: http://localhost:5173

## 3) Auf dem iPad nutzen (PWA)
Sobald du das Projekt deployt hast (z.B. Vercel/Netlify):
- Safari öffnen → deine URL
- Teilen → **Zum Home-Bildschirm**
- App startet wie eine native iPad-App

## Funktionen im MVP
- Heute-Liste: Filter nach Bereich, Service (Mittag/Abend), Suche
- Neue Reservierung: Zeit-Slots nur in Öffnungszeiten (11:30–14:00, 17:00–22:30)
- Verfügbarkeit: freie Tische via `find_free_tables`
- Auto-Vorschlag: kleinster passender Tisch (nach Sitzplätzen sortiert)
- Speichern inkl. „final check“, ob der Tisch noch frei ist
