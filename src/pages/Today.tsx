import { useEffect, useMemo, useState } from "react";
import {
  fetchAreas,
  fetchTodayReservations,
  fetchTables,
  updateReservation,
  deleteReservation,
  searchReservationsByGuestName,
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

// datetime-local helpers (lokal, kein UTC shift)
function toDateTimeLocalValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}
function fromDateTimeLocalValue(v: string): Date {
  const [datePart, timePart] = v.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export default function Today() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState<string>("");

  const [day, setDay] = useState<Date>(() => new Date());

  const [rows, setRows] = useState<ReservationWithJoins[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Modal: Reservierung bearbeiten
  const [openId, setOpenId] = useState<string>("");
  const [openRow, setOpenRow] = useState<ReservationWithJoins | null>(null);
  const [areaTables, setAreaTables] = useState<TableRow[]>([]);
  const [editTableId, setEditTableId] = useState<string>("");

  // Edit-Felder
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editParty, setEditParty] = useState(2);
  const [editStartLocal, setEditStartLocal] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Modal: Gast-Suche
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ReservationWithJoins[]>([]);

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

  function goToday() {
    const now = new Date();
    setDay(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0));
  }

  const lunchRows = useMemo(
    () => rows.filter((r) => inWindow(day, r.start_time, "Mittag")),
    [rows, day]
  );
  const dinnerRows = useMemo(
    () => rows.filter((r) => inWindow(day, r.start_time, "Abend")),
    [rows, day]
  );

  const personsAll = useMemo(
    () => rows.reduce((sum, r) => sum + (r.party_size || 0), 0),
    [rows]
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

    setEditName(r.guest_name ?? "");
    setEditPhone(r.phone ?? "");
    setEditParty(r.party_size ?? 2);
    setEditStartLocal(toDateTimeLocalValue(new Date(r.start_time)));
    setEditNotes(r.notes ?? "");

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

    setEditName("");
    setEditPhone("");
    setEditParty(2);
    setEditStartLocal("");
    setEditNotes("");
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

  async function saveEdits() {
    if (!openRow) return;
    const name = editName.trim();
    if (!name) return setErr("Name darf nicht leer sein.");

    setLoading(true);
    setErr(null);
    try {
      const start = fromDateTimeLocalValue(editStartLocal);
      await updateReservation(openRow.id, {
        guest_name: name,
        phone: editPhone.trim() ? editPhone.trim() : null,
        party_size: Math.max(1, Number(editParty || 1)),
        start_time: start.toISOString(),
        notes: editNotes.trim() ? editNotes.trim() : null,
      });
      await load();
      closeModal();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  async function doDelete() {
    if (!openRow) return;
    const ok = window.confirm(
      `Reservierung wirklich löschen?\n\n${openRow.guest_name} · ${formatHHMM(
        new Date(openRow.start_time)
      )}`
    );
    if (!ok) return;

    setLoading(true);
    setErr(null);
    try {
      await deleteReservation(openRow.id);
      await load();
      closeModal();
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  function NameCell({ r }: { r: ReservationWithJoins }) {
    return (
      <>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700 }}>{r.guest_name}</span>
          {r.notes ? (
            <span className="small" style={{ color: "#6b7280" }}>
              {r.notes}
            </span>
          ) : null}
        </div>
        <div className="small">{r.phone ?? ""}</div>
      </>
    );
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
                  <td colSpan={5} className="small">Keine Reservierungen.</td>
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
                      <td><NameCell r={r} /></td>
                      <td>{r.party_size}</td>
                      <td>{tableLabel}</td>
                      <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
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

  async function runGuestSearch() {
    setSearchErr(null);
    const q = searchQ.trim();
    if (!q) return setSearchErr("Bitte Name eingeben.");
    setSearchLoading(true);
    try {
      const res = await searchReservationsByGuestName({ q, limit: 50 });
      setSearchResults(res);
    } catch (e: any) {
      setSearchErr(String(e?.message ?? e));
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Home</div>
          <div className="small">
            {formatDateDE(day)} · Personen heute: <strong>{personsAll}</strong>{" "}
            (<span className="kbd">Mittag</span> {personsLunch} / <span className="kbd">Abend</span> {personsDinner})
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => { setSearchOpen(true); setSearchResults([]); setSearchErr(null); }}>
            Gast suchen
          </button>
          <button onClick={load} disabled={loading}>
            {loading ? "Lade…" : "Aktualisieren"}
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
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="small">Datum</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="date"
              value={toDateInputValue(day)}
              onChange={(e) => setDay(fromDateInputValue(e.target.value))}
            />
            <button type="button" onClick={goToday} style={{ padding: "12px 14px", borderRadius: 12 }}>
              Heute
            </button>
          </div>
        </div>
      </div>

      {err && (
        <div style={{ marginTop: 12 }} className="badge bad">
          Fehler: {err}
        </div>
      )}

      <ReservationsTable title="Mittag (11:30–14:00)" data={lunchRows} />
      <ReservationsTable title="Abend (17:00–22:30)" data={dinnerRows} />

      {/* Modal: Reservierung bearbeiten */}
      <Modal
        open={!!openId}
        title={openRow ? `Reservierung: ${openRow.guest_name}` : ""}
        onClose={closeModal}
      >
        {!openRow ? null : (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setStatus("confirmed")} disabled={loading}>bestätigt</button>
              <button className="primary" onClick={() => setStatus("arrived")} disabled={loading}>angekommen</button>
              <button onClick={() => setStatus("cancelled")} disabled={loading}>storniert</button>
              <button onClick={() => setStatus("no_show")} disabled={loading}>no-show</button>
            </div>

            <hr />

            <div style={{ fontWeight: 800, marginBottom: 8 }}>Bearbeiten</div>

            <div className="row">
              <div>
                <label className="small">Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="small">Telefon</label>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
            </div>

            <div className="row" style={{ marginTop: 12 }}>
              <div>
                <label className="small">Personen</label>
                <input
                  type="number"
                  min={1}
                  value={editParty}
                  onChange={(e) => setEditParty(Math.max(1, Number(e.target.value || 1)))}
                />
              </div>
              <div>
                <label className="small">Datum/Uhrzeit</label>
                <input
                  type="datetime-local"
                  value={editStartLocal}
                  onChange={(e) => setEditStartLocal(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label className="small">Notiz</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="primary" onClick={saveEdits} disabled={loading}>
                Änderungen speichern
              </button>
              <button onClick={doDelete} disabled={loading}>
                Löschen
              </button>
            </div>

            <hr />

            <div className="small" style={{ marginBottom: 8 }}>Tisch festlegen / wechseln</div>

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
                Schließen
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Modal: Gast suchen (alle Tage) */}
      <Modal
        open={searchOpen}
        title="Gast suchen (alle Tage)"
        onClose={() => setSearchOpen(false)}
      >
        <div className="row">
          <div>
            <label className="small">Name</label>
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="z.B. Müller"
            />
          </div>
          <div style={{ alignSelf: "end" }}>
            <button className="primary" onClick={runGuestSearch} disabled={searchLoading}>
              {searchLoading ? "Suche…" : "Suchen"}
            </button>
          </div>
        </div>

        {searchErr && (
          <div style={{ marginTop: 12 }} className="badge bad">
            Fehler: {searchErr}
          </div>
        )}

        <hr />

        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 130 }}>Datum</th>
              <th style={{ width: 80 }}>Zeit</th>
              <th>Name</th>
              <th style={{ width: 70 }}>Pers.</th>
              <th style={{ width: 170 }}>Tisch</th>
              <th style={{ width: 120 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {searchResults.length === 0 ? (
              <tr>
                <td colSpan={6} className="small">Keine Ergebnisse (oder noch nicht gesucht).</td>
              </tr>
            ) : (
              searchResults.map((r) => {
                const b = statusBadge(r.status);
                const d = new Date(r.start_time);
                const tableLabel = r.table
                  ? `Tisch ${r.table.table_number} · ${r.area?.name ?? ""}`
                  : "—";
                return (
                  <tr
                    key={r.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setSearchOpen(false);
                      openReservation(r);
                    }}
                    title="Tippen: Reservierung öffnen"
                  >
                    <td>{d.toLocaleDateString("de-DE")}</td>
                    <td>{formatHHMM(d)}</td>
                    <td><NameCell r={r} /></td>
                    <td>{r.party_size}</td>
                    <td>{tableLabel}</td>
                    <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Modal>
    </div>
  );
}
