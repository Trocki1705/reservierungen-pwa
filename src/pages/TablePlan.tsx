import { useEffect, useMemo, useState } from "react";
import { fetchAreas, fetchReservationsForAreaDay, fetchTables } from "../lib/api";
import type { Area, ReservationWithJoins, TableRow } from "../lib/types";
import { formatDateDE, formatHHMM, timeOnDate } from "../lib/settings";
import { useNavigate } from "react-router-dom";
import { toDateInputValue, fromDateInputValue } from "../lib/settings";

function isOverlapping(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

export default function TablePlan() {
  const nav = useNavigate();
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState<string>("");
  const [day, setDay] = useState<Date>(() => new Date());

  const [tables, setTables] = useState<TableRow[]>([]);
  const [res, setRes] = useState<ReservationWithJoins[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedTableReservations, setSelectedTableReservations] = useState<ReservationWithJoins[] | null>(null); // Für die angezeigten Reservierungen

  useEffect(() => {
    fetchAreas().then(a => {
      setAreas(a);
      if (!areaId && a[0]) setAreaId(a[0].id);
    }).catch(e => setErr(String(e.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    if (!areaId) return;
    setLoading(true); setErr(null);
    try {
      const [t, r] = await Promise.all([
        fetchTables(areaId),
        fetchReservationsForAreaDay({ day, areaId })
      ]);
      setTables(t);
      setRes(r.filter(x => !!x.table_id));
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [areaId, day]);

  const windowRange = useMemo(() => {
    // Wir entfernen hier die Unterscheidung zwischen "Mittag" und "Abend" und nehmen den gesamten Tag
    return { start: timeOnDate(day, "00:00"), end: timeOnDate(day, "23:59") };
  }, [day]);

  const tableInfo = useMemo(() => {
    const now = new Date();
    const infos = new Map<string, { next?: ReservationWithJoins; now?: ReservationWithJoins; count: number }>();
    for (const t of tables) infos.set(t.id, { count: 0 });

    for (const r of res) {
      if (!r.table_id) continue;
      const s = new Date(r.start_time);
      const e = new Date(s.getTime() + r.duration_minutes * 60_000);
      if (!isOverlapping(s, e, windowRange.start, windowRange.end)) continue;

      const entry = infos.get(r.table_id) ?? { count: 0 };
      entry.count += 1;
      if (isOverlapping(s, e, now, now)) entry.now = r;
      if (!entry.next || s < new Date(entry.next.start_time)) entry.next = r;
      infos.set(r.table_id, entry);
    }
    return infos;
  }, [tables, res, windowRange.start, windowRange.end]);

  const handleTableClick = (tableId: string) => {
    // Beim Klicken auf einen Tisch werden alle Reservierungen für diesen Tisch angezeigt
    const reservationsForTable = res.filter(r => r.table_id === tableId);
    setSelectedTableReservations(reservationsForTable);
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Tischplan</div>
          <div className="small">{formatDateDE(day)}</div> {/* Hier keine Service-Auswahl mehr */}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Die Buttons für "Mittag" und "Abend" wurden entfernt */}
        </div>
      </div>

      <hr />

      <div className="row">
        <div>
          <label className="small">Bereich</label>
          <select value={areaId} onChange={e => setAreaId(e.target.value)}>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="small">Datum</label>
          <input
            type="date"
            value={toDateInputValue(day)}
            onChange={e => setDay(fromDateInputValue(e.target.value))}
          />
        </div>
        <div>
          <label className="small">Aktionen</label>
          <button onClick={load} disabled={loading}>{loading ? "Lade…" : "Aktualisieren"}</button>
        </div>
      </div>

      {err && <div style={{ marginTop: 12 }} className="badge bad">Fehler: {err}</div>}

      <hr />

      <div className="grid">
        {tables.map(t => {
          const info = tableInfo.get(t.id);
          const isNow = !!info?.now;
          const hasAny = (info?.count ?? 0) > 0;
          const cls = isNow ? "tile now" : (hasAny ? "tile busy" : "tile");
          const next = info?.next;
          return (
            <div
              key={t.id}
              className={cls}
              onClick={() => handleTableClick(t.id)} // Ändere dies, um die Reservierungen anzuzeigen
              style={{ cursor: "pointer" }}
              title="Tippen: Zeige Reservierungen für diesen Tisch"
            >
              <h3>Tisch {t.table_number}</h3>
              <div className="small">{t.seats} Plätze</div>
              <div style={{ marginTop: 8 }}>
                {isNow && <span className="badge ok">jetzt belegt</span>}
                {!isNow && hasAny && <span className="badge warn">Reservierungen: {info?.count}</span>}
                {!hasAny && <span className="badge">frei</span>}
              </div>
              <div className="small" style={{ marginTop: 8 }}>
                {next ? <>Nächste: {formatHHMM(new Date(next.start_time))} · {next.guest_name}</> : "Keine Reservierung im Zeitraum"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Falls Reservierungen für einen Tisch angezeigt werden sollen */}
      {selectedTableReservations && (
        <div className="reservations-list">
          <h3>Reservierungen für diesen Tisch:</h3>
          <ul>
            {selectedTableReservations.map((reservation) => (
              <li key={reservation.id}>
                {reservation.guest_name} - {formatHHMM(new Date(reservation.start_time))}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="small" style={{ marginTop: 12 }}>
        Tipp: Tippe einen Tisch, um alle Reservierungen für diesen Tisch anzuzeigen.
      </div>
    </div>
  );
}
