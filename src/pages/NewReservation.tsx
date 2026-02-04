import { useEffect, useMemo, useState } from "react";
import { createReservationSafe, fetchAreas, rpcFindFreeTables } from "../lib/api";
import type { Area, TableRow } from "../lib/types";
import { BUFFER_MINUTES, DEFAULT_DURATION, SLOT_MINUTES, fitsServiceWindows, formatHHMM, generateSlotsForDay } from "../lib/settings";
import { useNavigate } from "react-router-dom";

export default function NewReservation() {
  const nav = useNavigate();
  const [areas, setAreas] = useState<Area[]>([]);

  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");

  const [areaId, setAreaId] = useState("");
  const [day, setDay] = useState<Date>(() => new Date());
  const slots = useMemo(() => generateSlotsForDay(day, SLOT_MINUTES), [day]);
  const [slotISO, setSlotISO] = useState<string>(() => slots[0]?.toISOString() ?? new Date().toISOString());

  const [duration, setDuration] = useState(DEFAULT_DURATION);

  const [freeTables, setFreeTables] = useState<TableRow[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    fetchAreas().then(a => {
      setAreas(a);
      if (!areaId && a[0]) setAreaId(a[0].id);
    }).catch(e => setErr(String(e.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const first = slots[0];
    if (first) setSlotISO(first.toISOString());
  }, [slots]);

  async function checkAvailability() {
    setErr(null); setOk(null);
    if (!areaId) return setErr("Bitte Bereich auswählen.");
    const start = new Date(slotISO);

    if (!fitsServiceWindows(start, duration, BUFFER_MINUTES)) {
      return setErr("Zeit liegt außerhalb der Öffnungszeiten (inkl. Dauer/Puffer).");
    }

    setLoading(true);
    try {
      const free = await rpcFindFreeTables({
        areaId,
        newStartISO: start.toISOString(),
        partySize,
        durationMinutes: duration,
        bufferMinutes: BUFFER_MINUTES
      });
      setFreeTables(free);
      setSelectedTableId(free[0]?.id ?? "");
      setOk(free.length ? `Freie Tische gefunden: ${free.length}. Vorschlag: kleinster passender Tisch.` : "Keine freien passenden Tische.");
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setErr(null); setOk(null);
    if (!guestName.trim()) return setErr("Name fehlt.");
    if (!areaId) return setErr("Bereich fehlt.");

    const start = new Date(slotISO);
    if (!fitsServiceWindows(start, duration, BUFFER_MINUTES)) {
      return setErr("Zeit liegt außerhalb der Öffnungszeiten (inkl. Dauer/Puffer).");
    }

    setLoading(true);
    try {
      await createReservationSafe({
        guest_name: guestName.trim(),
        phone: phone.trim() || undefined,
        party_size: partySize,
        start_time_iso: start.toISOString(),
        duration_minutes: duration,
        notes: notes.trim() || undefined,
        area_id: areaId,
        table_id: selectedTableId || null
      });
      setOk("Gespeichert ✅");
      // kurz reset und zurück zur Heute-Liste
      setTimeout(() => nav("/"), 400);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div style={{ fontSize: 22, fontWeight: 800 }}>Neue Reservierung</div>
      <div className="small">Öffnungszeiten: 11:30–14:00 & 17:00–22:30 · Raster {SLOT_MINUTES}min · Dauer {duration}min · Puffer {BUFFER_MINUTES}min</div>

      <hr />

      <div className="row">
        <div>
          <label className="small">Name *</label>
          <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="z.B. Müller" />
        </div>
        <div>
          <label className="small">Telefon</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="optional" />
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div>
          <label className="small">Personen</label>
          <input type="number" min={1} value={partySize} onChange={e => setPartySize(Math.max(1, Number(e.target.value || 1)))} />
        </div>
        <div>
          <label className="small">Dauer (Minuten)</label>
          <select value={duration} onChange={e => setDuration(Number(e.target.value))}>
            <option value={90}>90</option>
            <option value={120}>120</option>
            <option value={150}>150</option>
            <option value={180}>180</option>
          </select>
        </div>
        <div>
          <label className="small">Bereich</label>
          <select value={areaId} onChange={e => setAreaId(e.target.value)}>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div>
          <label className="small">Datum</label>
          <input
            type="date"
            value={new Date(day).toISOString().slice(0,10)}
            onChange={e => {
              const [y,m,d] = e.target.value.split("-").map(Number);
              const nd = new Date(day);
              nd.setFullYear(y, m-1, d);
              setDay(nd);
            }}
          />
        </div>
        <div>
          <label className="small">Uhrzeit</label>
          <select value={slotISO} onChange={e => setSlotISO(e.target.value)}>
            {slots.map(s => (
              <option key={s.toISOString()} value={s.toISOString()}>{formatHHMM(s)}</option>
            ))}
          </select>
          <div className="small">Nur Slots innerhalb der Servicezeiten.</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="small">Notiz</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="z.B. Kinderstuhl, Allergie, ruhiger Tisch..." />
      </div>

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

      <div className="row">
        <div>
          <label className="small">Tisch (Vorschlag = kleinster passender)</label>
          <select value={selectedTableId} onChange={e => setSelectedTableId(e.target.value)}>
            <option value="">(ohne Tisch)</option>
            {freeTables.map(t => (
              <option key={t.id} value={t.id}>
                Tisch {t.table_number} · {t.seats} Plätze
              </option>
            ))}
          </select>
          <div className="small">Wenn du „ohne Tisch“ speicherst, kannst du später im Tischplan zuweisen (nächster Schritt).</div>
        </div>
        <div>
          <div className="small" style={{ marginBottom: 8 }}>Freie Tische</div>
          <div className="card" style={{ padding: 12, maxHeight: 160, overflow: "auto", boxShadow: "none", border: "1px solid #edf0f4" }}>
            {freeTables.length === 0 ? (
              <div className="small">Noch keine Abfrage oder keine freien Tische.</div>
            ) : (
              freeTables.map(t => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f3f6" }}>
                  <div style={{ fontWeight: 700 }}>Tisch {t.table_number}</div>
                  <div className="small">{t.seats} Plätze</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
