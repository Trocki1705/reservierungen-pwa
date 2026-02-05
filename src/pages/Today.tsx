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

function inWindow(day: Date, isoStart: string, winName: string) {
  const win = SERVICE_WINDOWS.find((w) => w.name === winName);
  if (!win) return false;
  const s = timeOnDate(day, win.start);
  const e = timeOnDate(day, win.end);
  const st = new Date(isoStart);
  return st >= s && st <= e;
}

export default function Today() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState<string>("");

  const [day, setDay] = useState<Date>(() => new Date());
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

  const baseFiltered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!qq) return true;
      return (
        r.guest_name.toLowerCase().includes(qq) ||
        (r.phone ?? "").toLowerCase().includes(qq)
      );
    });
  }, [rows, q]);

  const lunchRows = useMemo(
    () => baseFiltered.filter((r) => inWindow(day, r.start_time, "Mittag")),
    [baseFiltered, day]
  );

  const dinnerRows = useMemo(
    () => baseFiltered.filter((r) => inWindow(day, r.start_time, "Abend")),
    [baseFiltered, day]
  );
  const personsAll = useMemo(
  () => baseFiltered.reduce((sum, r) => sum + (r.party_size || 0), 0),
  [baseFiltered]
);

const personsLunch = useMemo(
  () => lunchRows.reduce((sum, r) => sum + (r.party_size || 0), 0),
  [lunchRows]
);

const personsDinner = useMemo(
  () => dinnerRows.reduce((sum, r) => sum + (r.party_size || 0), 0),
  [dinnerRows]
);


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
      await updateReservation(openRow.id, { table_id: editTableId || null });
      await load();
      closeModal();
    } finally {
      setLoading(false);
    }
  }

  function ReservationsTable(props: { title: string; data: ReservationWithJoins[] }) {
    const { title, data } = props;
    return (
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{title}</div>
          <span className="badge">{data.length} Reservierungen</span>
        </div>

        <div style={{ marginTop: 8 }}>
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
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="small">
                    Keine Reservierungen.
                  </td>
                </tr>
              ) : (
                data.map((r) => {
                  const b = statusBadge(r.status);
                  const tableLabel = r.table
                    ? `Tisch ${r.table.table_number} · ${r.area?.name ?? ""}`
                    : "—";

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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Heute</div>
          <div className="small">
  {formatDateDE(day)} · Personen heute: <strong>{personsAll}</strong>
  {" "}(<span className="kbd">Mittag</span> {personsLunch} / <span className="kbd">Abend</span> {personsDinner})
</div>
        </div>
        <button onClick={load} disabled={loading}>
          {loading ? "Lade…" : "Aktualisieren"}
        </button>
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
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="z.B. Müller oder 017..." />
        </div>
      </div>

      {err && (
        <div style={{ marginTop: 12 }} className="badge bad">
          Fehler: {err}
        </div>
      )}

      {/* Zwei Tabellen untereinander */}
      <ReservationsTable title="Mittag (11:30–14:00)" data={lunchRows} />
      <ReservationsTable title="Abend (17:00–22:30)" data={dinnerRows} />

      <Modal
        open={!!openId}
        title={openRow ? `Reservierung: ${openRow.guest_name}` : ""}
        onClose={closeModal}
      >
        {!openRow ? null : (
          <>
            <div className="small" style={{ marginBottom: 8 }}>
              {formatHHMM(new Date(openRow.start_time))} · {openRow.party_size} Personen
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setStatus("confirmed")} disabled={loading}>
                bestätigt
              </button>
              <button className="primary" onClick={() => setStatus("arrived")} disabled={loading}>
                angekommen
              </button>
              <button onClick={() => setStatus("cancelled")} disabled={loading}>
                storniert
              </button>
              <button onClick={() => setStatus("no_show")} disabled={loading}>
                no-show
              </button>
            </div>

            <hr />

            <div className="small" style={{ marginBottom: 8 }}>
              Tisch festlegen / wechseln
            </div>

            <select value={editTableId} onChange={(e) => setEditTableId(e.target.value)}>
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
          </>
        )}
      </Modal>
    </div>
  );
}
