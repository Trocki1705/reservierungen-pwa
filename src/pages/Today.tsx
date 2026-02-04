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

  // Modal
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
    const win =
      SERVICE_WINDOWS.find((w) => w.name === service) ??
      SERVICE_WINDOWS[1];
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
    try {
      await updateReservation(openRow.id, { status: newStatus });
      await load();
      closeModal();
    } finally {
      setLoading(false);
    }
  }

  async function saveTable() {
    if (!openRow) return;
    setLoading(true);
    try {
      await updateReservation(openRow.id, {
        table_id: editTableId || null,
      });
      await load();
      closeModal();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Heute</div>
          <div className="small">{formatDateDE(day)}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
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
          <label className="small">Suche</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name oder Telefon"
          />
        </div>
      </div>

      {err && <div className="badge bad">Fehler: {err}</div>}

      <hr />

      <table className="table">
        <thead>
          <tr>
            <th>Zeit</th>
            <th>Name</th>
            <th>Pers.</th>
            <th>Tisch</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => {
            const b = statusBadge(r.status);
            const rowClass =
              r.status === "arrived"
                ? "row-arrived"
                : r.status === "cancelled"
                ? "row-cancelled"
                : "";

            return (
              <tr
                key={r.id}
                className={rowClass}
                style={{ cursor: "pointer" }}
                onClick={() => openReservation(r)}
              >
                <td>{formatHHMM(new Date(r.start_time))}</td>
                <td>
                  <strong>{r.guest_name}</strong>
                  <div className="small">{r.phone ?? ""}</div>
                </td>
                <td>{r.party_size}</td>
                <td>
                  {r.table
                    ? `Tisch ${r.table.table_number} · ${r.area?.name ?? ""}`
                    : "—"}
                </td>
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
        title={openRow ? `Reservierung: ${openRow.guest_name}` : ""}
        onClose={closeModal}
      >
        {!openRow ? null : (
          <>
            <div className="small" style={{ marginBottom: 8 }}>
              {formatHHMM(new Date(openRow.start_time))} ·{" "}
              {openRow.party_size} Personen
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setStatus("confirmed")}>
                bestätigt
              </button>
              <button className="primary" onClick={() => setStatus("arrived")}>
                angekommen
              </button>
              <button onClick={() => setStatus("cancelled")}>
                storniert
              </button>
              <button onClick={() => setStatus("no_show")}>
                no-show
              </button>
            </div>

            <hr />

            <select
              value={editTableId}
              onChange={(e) => setEditTableId(e.target.value)}
            >
              <option value="">(ohne Tisch)</option>
              {areaTables.map((t) => (
                <option key={t.id} value={t.id}>
                  Tisch {t.table_number} · {t.seats} Plätze
                </option>
              ))}
            </select>

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button className="primary" onClick={saveTable}>
                Tisch speichern
              </button>
              <button onClick={closeModal}>Abbrechen</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
