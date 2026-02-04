import { useEffect, useMemo, useState } from "react";
import {
  fetchAreas,
  fetchTodayReservations,
  fetchTables,
  updateReservation,
} from "../lib/api";
import type { Area, ReservationWithJoins, TableRow } from "../lib/types";
import {
  SERVICE_WINDOWS,
  formatDateDE,
  formatHHMM,
  timeOnDate,
  toDateInputValue,
  fromDateInputValue,
} from "../lib/settings";
import { Modal } from "../components/Modal";

function statusBadge(s: ReservationWithJoins["status"]) {
  switch (s) {
    case "arrived":
      return { label: "angekommen", cls: "ok" };
    case "cancelled":
      return { label: "storniert", cls: "bad" };
    case "no_show":
      return { label: "no-show", cls: "bad" };
    case "requested":
      return { label: "angefragt", cls: "warn" };
    default:
      return { label: "bestätigt", cls: "" };
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

  // Modal/Edit State
  const [openId, setOpenId] = useState<string>("");
  const [openRow, setOpenRow] = useState<ReservationWithJoins | null>(null);
  const [areaTables, setAreaTables] = useState<TableRow[]>([]);
  const [editTableId, setEditTableId] = useState<string>("");

  useEffect(() => {
    fetchAreas()
      .then(setAreas)
      .catch((e) => setErr(String(e.message ?? e)));
  }, []);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      setRows(await fetchTodayReservations({ day, areaId: areaId || null }));
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId, day]);

  const filtered = useMemo(() => {
    const win = SERVICE_WINDOWS.find((w) => w.name === service) ?? SERVICE_WINDOWS[1];
    const s = timeOnDate(day, win.start);
    const e = timeOnDate(day, win.end);

    return rows.filter((r) => {
      const st = new Date(r.start_time);
      const inService = st >= s && st <= e;
      const matches =
        !q.trim() ||
        r.guest_name.toLowerCase().includes(q.toLowerCase()) ||
        (r.phone ?? "").toLowerCase().includes(q.toLowerCase());
      return inService && matches;
    });
  }, [rows, q, service, day]);

  async function openReservation(r: ReservationWithJoins) {
    setOpenId(r.id);
    setOpenRow(r);
    setEditTableId(r.table_id ?? "");

    try {
      const t = await fetchTables(r.area_id);
      setAreaTables(t);
    } catch {
      setAreaTables([]);
    }
  }

  function closeModal() {
    setOpenId("");
    setOpenRow(null);
    setAreaTables([]);
    setEditTableId("");
  }

  async function setStatus(newStatus: ReservationWithJoins["status"]) {
    if (!openRow) return;
    setLoading(true);
    setErr(null);
    try {
      await updateReservation(openRow.id, { status: newStatus });
      await load();
      closeModal();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  async function saveTable() {
    if (!openRow) return;
    setLoading(true);
    setErr(null);
    try {
      await updateReservation(openRow.id, { table_id: editTableId || null });
      await load();
      closeModal();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Heute</div>
          <div className="small">{formatDateDE(day)}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setService("Mittag")}
            className={service === "Mittag" ? "primary" : ""}
          >
            Mittag
          </button>
          <button
            onClick={() => setService("Abend")}
            className={service === "Abend" ? "primary" : ""}
          >
            Abend
          </button>
        </div>
      </div>

      <hr />

      <div className="row">
        <div>
          <label className="small">Bereich</label>
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">Alle</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="small">Datum</label>
          <input
            type="date"
            value={toDateInputValue(day)}
            onChange={(e) => setDay(fromDateInputValue(e.target.value))}
          />
        </div>

        <div>
          <label className="small">Suche (Name/Telefon)</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="z.B. Müller oder 017..."
          />
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={load} disabled={loading}>
          {loading ? "Lade…" : "Aktualisieren"}
        </button>
        <span className="small">
          Tipp: Tippe auf eine Reservierung, um Status oder Tisch zu ändern.
        </span>
      </div>

      {err && (
        <div style={{ marginTop: 12 }} className="badge bad">
          Fehler: {err}
        </div>
      )}

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
            <tr>
              <td colSpan={5} className="small">
                Keine Reservierungen im ausgewählten Zeitraum.
              </td>
            </tr>
          )}
          {filtered.map((r) => {
            const b = statusBadge(r.status);
            const t = r.table?.table_number;
            const area = r.area?.name;
            const tableLabel = t ? `Tisch ${t}${area ? " · " + area : ""}` : "—";

            return (
              <tr
                key={r.id}
                style={{ cursor: "pointer" }}
                onClick={() => openReservation(r)}
              >
                <td>{formatHHMM(new Date(r.start_time))}</td>
                <td>
                  <div style={{ fontWeight: 700 }}>{r.guest_name}</div>
                  <div className="small">{r.phone ?? ""}</div>
                </td>
                <td>{r.party_size}</td>
                <td>{tableLabel}</td>
                <td>
                  <span className={`badge ${b.cls}`}>{b.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Modal
        open={!!openId}
        title={openRow ? `Reservierung: ${openRow.guest_name}` : "Reservierung"}
        onClose={closeModal}
      >
        {!openRow ? null : (
          <>
            <div className="small" style={{ marginBottom: 8 }}>
              {formatHHMM(new Date(openRow.start_time))} · {openRow.party_size} Personen
            </div>

            <div>
              <div className="small">Status</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                <button onClick={() => setStatus("confirmed")} disabled={loading}>
                  bestätigt
                </button>
                <button onClick={() => setStatus("arrived")} className="primary" disabled={loading}>
                  angekommen
                </button>
                <button onClick={() => setStatus("cancelled")} disabled={loading}>
                  storniert
                </button>
                <button onClick={() => setStatus("no_show")} disabled={loading}>
                  no-show
                </button>
              </div>
            </div>

            <hr />

            <div>
              <div className="small">Tisch wechseln</div>
              <select
                value={editTableId}
                onChange={(e) => setEditTableId(e.target.value)}
                style={{ marginTop: 8 }}
              >
                <option value="">(ohne Tisch)</option>
                {areaTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Tisch {t.table_number} · {t.seats} Plätze
                  </option>
                ))}
              </select>

              <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                <button className="primary" onClick={saveTable} disabled={loading}>
                  Tisch speichern
                </button>
                <button onClick={closeModal} disabled={loading}>
                  Abbrechen
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
