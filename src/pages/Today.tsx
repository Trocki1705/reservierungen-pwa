import { useEffect, useMemo, useState } from "react";
import { fetchAreas, fetchTodayReservations } from "../lib/api";
import type { Area, ReservationWithJoins } from "../lib/types";
import { SERVICE_WINDOWS, formatDateDE, formatHHMM, timeOnDate } from "../lib/settings";

function statusBadge(s: ReservationWithJoins["status"]) {
  switch (s) {
    case "arrived": return { label: "angekommen", cls: "ok" };
    case "cancelled": return { label: "storniert", cls: "bad" };
    case "no_show": return { label: "no-show", cls: "bad" };
    case "requested": return { label: "angefragt", cls: "warn" };
    default: return { label: "bestätigt", cls: "" };
  }
}

export default function Today() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState<string>("");
  const [day, setDay] = useState<Date>(() => new Date());
  const [service, setService] = useState<string>("Abend");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ReservationWithJoins[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchAreas().then(setAreas).catch(e => setErr(String(e.message ?? e)));
  }, []);

  async function load() {
    setLoading(true); setErr(null);
    try {
      setRows(await fetchTodayReservations({ day, areaId: areaId || null }));
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [areaId, day]);

  const filtered = useMemo(() => {
    const win = SERVICE_WINDOWS.find(w => w.name === service) ?? SERVICE_WINDOWS[1];
    const s = timeOnDate(day, win.start);
    const e = timeOnDate(day, win.end);

    return rows.filter(r => {
      const st = new Date(r.start_time);
      const inService = st >= s && st <= e;
      const matches = !q.trim()
        || r.guest_name.toLowerCase().includes(q.toLowerCase())
        || (r.phone ?? "").toLowerCase().includes(q.toLowerCase());
      return inService && matches;
    });
  }, [rows, q, service, day]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Heute</div>
          <div className="small">{formatDateDE(day)}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => setService("Mittag")} className={service === "Mittag" ? "primary" : ""}>Mittag</button>
          <button onClick={() => setService("Abend")} className={service === "Abend" ? "primary" : ""}>Abend</button>
        </div>
      </div>

      <hr />

      <div className="row">
        <div>
          <label className="small">Bereich</label>
          <select value={areaId} onChange={e => setAreaId(e.target.value)}>
            <option value="">Alle</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
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
          <label className="small">Suche (Name/Telefon)</label>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="z.B. Müller oder 017..." />
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={load} disabled={loading}>{loading ? "Lade…" : "Aktualisieren"}</button>
        <span className="small">Tipp: Tischplan findest du oben unter <span className="kbd">Tischplan</span>.</span>
      </div>

      {err && <div style={{ marginTop: 12 }} className="badge bad">Fehler: {err}</div>}

      <hr />

      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 90 }}>Zeit</th>
            <th>Name</th>
            <th style={{ width: 90 }}>Pers.</th>
            <th style={{ width: 170 }}>Tisch</th>
            <th style={{ width: 120 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={5} className="small">Keine Reservierungen im ausgewählten Zeitraum.</td></tr>
          )}
          {filtered.map(r => {
            const b = statusBadge(r.status);
            const t = r.table?.table_number;
            const area = r.area?.name;
            const tableLabel = t ? `Tisch ${t}${area ? " · " + area : ""}` : "—";
            return (
              <tr key={r.id}>
                <td>{formatHHMM(new Date(r.start_time))}</td>
                <td>
                  <div style={{ fontWeight: 700 }}>{r.guest_name}</div>
                  <div className="small">{r.phone ?? ""}</div>
                </td>
                <td>{r.party_size}</td>
                <td>{tableLabel}</td>
                <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
