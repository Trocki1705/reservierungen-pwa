import { useEffect, useMemo, useState } from "react";
import {
  fetchTodayReservations,
  fetchTables,
  updateReservation,
  deleteReservation,
  searchReservationsByGuestName,
  fetchDayNote,
  upsertDayNote,
} from "../lib/api";
import type { ReservationWithJoins, TableRow } from "../lib/types";
import {
  SERVICE_WINDOWS,
  formatDateDE,
  formatHHMM,
  timeOnDate,
  toDateInputValue,
  fromDateInputValue,
} from "../lib/settings";
import { Modal } from "../components/Modal";
import { useNavigate } from "react-router-dom";

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
  const [day, setDay] = useState<Date>(() => new Date());
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const [rows, setRows] = useState<ReservationWithJoins[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Tagesnotiz
  const [dayNote, setDayNote] = useState("");
  const [editingDayNote, setEditingDayNote] = useState(false);
  const [dayNoteLoading, setDayNoteLoading] = useState(false);
  const [dayNoteErr, setDayNoteErr] = useState<string | null>(null);

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

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      setRows(await fetchTodayReservations({ day, areaId: null }));
      setLastRefreshAt(new Date());
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);
  
  useEffect(() => {
  const REFRESH_MS = 60_000; // 60 Sekunden

  const id = window.setInterval(() => {
    // nicht refreshen, wenn du gerade etwas bearbeitest/ offen hast
    const busy =
      loading ||
      !!openId ||
      editingDayNote ||
      searchOpen;

    // nicht refreshen, wenn Tab nicht sichtbar (iPad Safari etc.)
    const hidden = document.visibilityState !== "visible";

    if (busy || hidden) return;

    load();
  }, REFRESH_MS);

  return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [day, loading, openId, editingDayNote, searchOpen]);


  // Tagesnotiz laden bei Datumswechsel
  useEffect(() => {
    const iso = toDateInputValue(day);
    setDayNoteErr(null);
    setDayNoteLoading(true);
    fetchDayNote(iso)
      .then((d) => setDayNote(d?.note ?? ""))
      .catch((e) => {
        setDayNote("");
        setDayNoteErr(String(e?.message ?? e));
      })
      .finally(() => setDayNoteLoading(false));
  }, [day]);

  async function saveDayNote() {
    const iso = toDateInputValue(day);
    setDayNoteErr(null);
    setDayNoteLoading(true);
    try {
      await upsertDayNote(iso, dayNote.trim());
      setEditingDayNote(false);
    } catch (e: any) {
      setDayNoteErr(String(e?.message ?? e));
    } finally {
      setDayNoteLoading(false);
    }
  }

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

  return (
    <div className="card">
      <div style={{ fontSize: 22, fontWeight: 800 }}>Heute</div>
      <div className="small">
        {formatDateDE(day)} · Personen heute: <strong>{personsAll}</strong>{" "}
        (<span className="kbd">Mittag</span> {personsLunch} / <span className="kbd">Abend</span> {personsDinner})
      </div>

      <hr />

      <div className="row" style={{ marginTop: 12, justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {/* Datum-Feld */}
        <div style={{ flex: 1 }}>
          <label className="small">Datum</label>
          <input
            type="date"
            value={toDateInputValue(day)}
            onChange={(e) => setDay(fromDateInputValue(e.target.value))}
            style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", fontSize: "16px" }}
          />
        </div>

        {/* Heute-Button */}
        <button
          type="button"
          onClick={goToday}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: "12px",
            fontWeight: "bold",
            backgroundColor: "#1d4ed8",
            color: "white",
            border: "none",
            cursor: "pointer",
            flex: 1,
          }}
        >
          Heute
        </button>
      </div>

      {err && <div className="badge bad">{err}</div>}
      {ok && <div className="badge ok">{ok}</div>}
      <ReservationsTable title="Mittag (11:30–14:00)" data={lunchRows} />
      <ReservationsTable title="Abend (17:00–22:30)" data={dinnerRows} />

      <Modal
        open={!!openId}
        title={openRow ? `Reservierung: ${openRow.guest_name}` : ""}
        onClose={closeModal}
      >
        {/* Modal-Inhalt */}
      </Modal>
    </div>
  );
}
