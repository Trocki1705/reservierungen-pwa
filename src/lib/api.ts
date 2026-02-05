import { createClient } from "@supabase/supabase-js";
import type { Area, ReservationRow, ReservationWithJoins, TableRow } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Areas ----------
export async function fetchAreas(): Promise<Area[]> {
  const { data, error } = await supabase
    .from("areas")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Area[];
}

// ---------- Tables ----------
export async function fetchTables(areaId: string): Promise<TableRow[]> {
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .eq("area_id", areaId)
    .order("table_number", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TableRow[];
}

// ---------- Reservations (today list w/ joins) ----------
export async function fetchTodayReservations(opts: {
  day: Date;
  areaId: string | null;
}): Promise<ReservationWithJoins[]> {
  const start = new Date(opts.day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(opts.day);
  end.setHours(23, 59, 59, 999);

  let q = supabase
    .from("reservations")
    // IMPORTANT: relationship names pinned to avoid "more than one relationship" issue
    .select(
      "*, area:areas!reservations_area_id_fkey(name), table:tables(table_number,seats)"
    )
    .gte("start_time", start.toISOString())
    .lte("start_time", end.toISOString())
    .order("start_time", { ascending: true });

  if (opts.areaId) q = q.eq("area_id", opts.areaId);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []) as ReservationWithJoins[];
}

// ---------- Create reservation ----------
export async function createReservationSafe(input: {
  guest_name: string;
  phone?: string;
  party_size: number;
  start_time_iso: string;
  duration_minutes: number;
  notes?: string;
  area_id: string;
  table_id: string | null;
}): Promise<ReservationRow> {
  const payload = {
    guest_name: input.guest_name,
    phone: input.phone ?? null,
    party_size: input.party_size,
    start_time: input.start_time_iso,
    duration_minutes: input.duration_minutes,
    notes: input.notes ?? null,
    area_id: input.area_id,
    table_id: input.table_id,
    status: "confirmed",
  };

  const { data, error } = await supabase
    .from("reservations")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as ReservationRow;
}

// ---------- Update reservation (edit fields) ----------
export async function updateReservation(
  id: string,
  patch: Partial<{
    guest_name: string;
    phone: string | null;
    party_size: number;
    start_time: string;
    duration_minutes: number;
    notes: string | null;
    status: string;
    table_id: string | null;
    area_id: string;
  }>
) {
  const { data, error } = await supabase
    .from("reservations")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// ---------- Delete reservation ----------
export async function deleteReservation(id: string) {
  const { error } = await supabase.from("reservations").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Search reservations by guest name (all days) ----------
export async function searchReservationsByGuestName(opts: {
  q: string;
  limit?: number;
}): Promise<ReservationWithJoins[]> {
  const query = opts.q.trim();
  if (!query) return [];

  const { data, error } = await supabase
    .from("reservations")
    .select("*, area:areas!reservations_area_id_fkey(name), table:tables(table_number,seats)")
    .ilike("guest_name", `%${query}%`)
    .order("start_time", { ascending: false })
    .limit(opts.limit ?? 50);

  if (error) throw error;
  return (data ?? []) as ReservationWithJoins[];
}

// ---------- RPC: find free tables ----------
export async function rpcFindFreeTables(opts: {
  areaId: string;
  newStartISO: string;
  partySize: number;
  durationMinutes: number;
  bufferMinutes: number;
}): Promise<TableRow[]> {
  // RPC name must match your Supabase function
  const { data, error } = await supabase.rpc("find_free_tables", {
    p_area_id: opts.areaId,
    p_new_start: opts.newStartISO,
    p_party_size: opts.partySize,
    p_duration_minutes: opts.durationMinutes,
    p_buffer_minutes: opts.bufferMinutes,
  });

  if (error) throw error;
  return (data ?? []) as TableRow[];
}

// ---------- Day Notes ----------
export async function fetchDayNote(dayISO: string): Promise<{ day: string; note: string } | null> {
  const { data, error } = await supabase
    .from("day_notes")
    .select("*")
    .eq("day", dayISO)
    .single();

  // PGRST116 = "Results contain 0 rows" -> treat as empty note
  if (error && (error as any).code === "PGRST116") return null;
  if (error) throw error;

  return data as { day: string; note: string } | null;
}

export async function upsertDayNote(dayISO: string, note: string) {
  const { error } = await supabase
    .from("day_notes")
    .upsert({ day: dayISO, note }, { onConflict: "day" });

  if (error) throw error;
}
