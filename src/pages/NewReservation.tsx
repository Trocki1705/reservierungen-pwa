import { useEffect, useMemo, useState } from "react";
import { createReservationSafe, fetchAreas, rpcFindFreeTables } from "../lib/api";
import type { Area, TableRow } from "../lib/types";
import {
  BUFFER_MINUTES,
  DEFAULT_DURATION,
  SLOT_MINUTES,
  fitsServiceWindows,
  formatHHMM,
  generateSlotsForDay,
  toDateInputValue,
  fromDateInputValue,
} from "../lib/settings";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function NewReservation() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const preAreaId = params.get("areaId") ?? "";
  const preTableId = params.get("tableId") ?? "";

  const [areas, setAreas] = useState<Area[]>([]);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [day, setDay] = useState<Date>(() => new Date());
  const slots = useMemo(() => generateSlotsForDay(day, SLOT_MINUTES), [day]);
  const [slotISO, setSlotISO] = useState<string>(() => new Date().toISOString());
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [freeTables, setFreeTables] = useState<TableRow[]>([]);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]); // Array für die zugewiesenen Tische

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    fetchAreas()
      .then((a) => {
        setAreas(a);
        setAreaId(preAreaId || "");
      })
      .catch((e) => setErr(String(e.message ?? e)));
  }, []);

  useEffect(() => {
    const first = slots[0];
    if (first) setSlotISO(first.toISOString());
  }, [slots]);

  async function checkAvailability() {
    setErr(null);
    setOk(null);

    const start = new Date(slotISO);
    if (!areas.length) return setErr("Keine Bereiche gefunden (areas leer).");

    setLoading(true);
    try {
      let free: TableRow[] = [];

      if (areaId) {
        free = await rpcFindFreeTables({
          areaId,
          newStartISO: start.toISOString(),
          partySize,
          durationMinutes: duration,
          bufferMinutes: BUFFER_MINUTES,
        });
      } else {
        const all = await Promise.all(
          areas.map((a) =>
            rpcFindFreeTables({
              areaId: a.id,
              newStartISO: start.toISOString(),
              partySize,
              durationMinutes: duration,
              bufferMinutes: BUFFER_MINUTES,
            }).catch(() => [])
          )
        );
        free = all.flat();
        free.sort((a, b) => (a.seats - b.seats) || (a.table_number - b.table_number));
      }

      setFreeTables(free);

      if (selectedTableIds.length === 0) {
        setSelectedTableIds([free[0]?.id ?? ""]);
      }

      setOk(
        free.length
          ? `Freie Tische gefunden: ${free.length}. Vorschlag: kleinster passender Tisch.`
          : "Keine freien passenden Tische."
      );
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setErr(null);
    setOk(null);

    if (!guestName.trim()) return setErr("Name fehlt.");
    const start = new Date(slotISO);
    if (!areas.length) return setErr("Keine Bereiche gefunden (areas leer).");

    if (selectedTableIds.length === 0) return setErr("Kein Tisch ausgewählt.");

    const finalAreaId = areaId || areas[0]?.id;

    if (!finalAreaId) return setErr("Kein Bereich verfügbar (finalAreaId leer).");

    setLoading(true);
    try {
      await createReservationSafe({
        guest_name: guestName.trim(),
        phone: phone.trim() || undefined,
        party_size: partySize,
        start_time_iso: start.toISOString(),
        duration_minutes: duration,
        notes: notes.trim() || undefined,
        area_id: finalAreaId,
        table_ids: selectedTableIds, // Wir übergeben alle zugewiesenen Tische
      });

      setOk("Gespeichert ✅");
      setTimeout(() => nav("/"), 400);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  // Funktion zum Hinzufügen eines Tisches
  const addTable = (tableId: string) => {
    if (!selectedTableIds.includes(tableId)) {
      setSelectedTableIds([...selectedTableIds, tableId]);
    }
  };

  // Funktion zum Entfernen eines Tisches
  const removeTable = (tableId: string) => {
    setSelectedTableIds(selectedTableIds.filter((id) => id !== tableId));
  };

  return (
    <div className="card">
      <div style={{ fontSize: 22, fontWeight: 800 }}>Neue Reservierung</div>
      <div className="small">
        Öffnungszeiten: 11:30–14:00 & 17:00–22:30 · Raster {SLOT_MINUTES}min · Dauer {duration}min · Puffer {BUFFER_MINUTES}min
      </div>

      <hr />

      {/* Formularfelder für Name, Telefon, etc. */}
      <div className="row">
        <div>
          <label className="small">Name *</label>
          <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="z.B. Müller" />
        </div>
        <div>
          <label className="small">Telefon</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="optional" />
        </div>
      </div>

      {/* Personen und Dauer */}
      <div className="row" style={{ marginTop: 12 }}>
        <div>
          <label className="small">Personen</label>
          <input
            type="number"
            min={1}
            value={partySize}
            onChange={(e) => setPartySize(Math.max(1, Number(e.target.value || 1)))}
          />
        </div>
        <div>
          <label className="small">Dauer (Minuten)</label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={90}>90</option>
            <option value={120}>120</option>
            <option value={150}>150</option>
            <option value={180}>180</option>
          </select>
        </div>
      </div>

      {/* Bereich auswählen */}
      <div className="row" style={{ marginTop: 12 }}>
        <div>
          <label className="small">Bereich (optional)</label>
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">(egal / später)</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Datum und Uhrzeit */}
      <div className="row" style={{ marginTop: 12 }}>
        <div>
          <label className="small">Datum</label>
          <input
            type="date"
            value={toDateInputValue(day)}
            onChange={(e) => setDay(fromDateInputValue(e.target.value))}
          />
        </div>
        <div>
          <label className="small">Uhrzeit</label>
          <select value={slotISO} onChange={(e) => setSlotISO(e.target.value)}>
            {slots.map((s) => (
              <option key={s.toISOString()} value={s.toISOString()}>
                {formatHHMM(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notizen */}
      <div style={{ marginTop: 12 }}>
        <label className="small">Notiz</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="z.B. Kinderstuhl, Allergie, ruhiger Tisch..."
        />
      </div>

      {/* Buttons */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={checkAvailability} disabled={loading}>
          {loading ? "Prüfe…" : "Freie Tische anzeigen"}
        </button>
        <button className="primary" onClick={save} disabled={loading}>
          {loading ? "Speichere…" : "Speichern"}
        </button>
      </div>

      {err && <div style={{ marginTop: 12 }} className="badge bad">Fehler: {err}</div>}
      {ok && <div style={{ marginTop: 12 }} className="badge ok">{ok}</div>}

      <hr />

      {/* Tische hinzufügen */}
      <div className="row">
        <div>
          <label className="small">Tisch (Vorschlag = kleinster passender)</label>
          <select value={selectedTableIds[0] || ""} onChange={(e) => addTable(e.target.value)}>
            <option value="">(ohne Tisch)</option>
            {freeTables.map((t) => (
              <option key={t.id} value={t.id}>
                Tisch {t.table_number} · {t.seats} Plätze
              </option>
            ))}
          </select>
          <button onClick={() => addTable(freeTables[0]?.id)} disabled={loading}>Tisch hinzufügen</button>
        </div>
      </div>

      {/* Anzeigen der zugewiesenen Tische */}
      {selectedTableIds.length > 0 && (
        <div>
          <h3>Zu gewiesene Tische:</h3>
          <ul>
            {selectedTableIds.map((tableId) => {
              const table = freeTables.find((t) => t.id === tableId);
              return (
                <li key={tableId}>
                  {table ? `Tisch ${table.table_number} (${table.seats} Plätze)` : "Tisch nicht gefunden"}
                  <button onClick={() => removeTable(tableId)}>Entfernen</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
