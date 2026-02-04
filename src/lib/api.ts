import { supabase } from "./supabase";
import type { Area, ReservationRow, ReservationWithJoins, TableRow } from "./types";

export async function fetchAreas(): Promise<Area[]> {
  const { data, error } = await supabase.from("areas").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Area[];
}

export async function fetchTables(areaId: string): Promise<TableRow[]> {
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .eq("area_id", areaId)
    .eq("active", true)
    .order("table_number", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TableRow[];
}

export async function fetchTodayReservations(opts: { day: Date; areaId?: string | null; }): Promise<ReservationWithJoins[]> {
  const start = new Date(opts.day); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate() + 1);

  let q = supabase
    .from("reservations")
    .select("*, area:areas!reservations_area_id_fkey(name), fallback_area:areas!reservations_fallback_area_id_fkey(name), table:tables(table_number,seats)")
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString())
    .order("start_time", { ascending: true });

  if (opts.areaId) q = q.eq("area_id", opts.areaId);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ReservationWithJoins[];
}

export async function fetchReservationsForAreaDay(opts: { day: Date; areaId: string; }): Promise<ReservationWithJoins[]> {
  const start = new Date(opts.day); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate() + 1);

  const { data, error } = await supabase
    .from("reservations")
    .select("*, table:tables(table_number,seats)")
    .eq("area_id", opts.areaId)
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString())
    .in("status", ["requested","confirmed","arrived"])
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ReservationWithJoins[];
}

export async function rpcFindFreeTables(args: { areaId: string; newStartISO: string; partySize: number; durationMinutes: number; bufferMinutes: number; }): Promise<TableRow[]> {
  const { data, error } = await supabase.rpc("find_free_tables", {
    p_area_id: args.areaId,
    p_new_start: args.newStartISO,
    p_party_size: args.partySize,
    p_duration_minutes: args.durationMinutes,
    p_buffer_minutes: args.bufferMinutes,
  });
  if (error) throw error;
  return (data ?? []) as TableRow[];
}

export async function createReservationSafe(input: {
  guest_name: string;
  phone?: string;
  party_size: number;
  start_time_iso: string;
  duration_minutes: number;
  notes?: string;
  area_id: string;
  table_id?: string | null;
}) {
  if (input.table_id) {
    const free = await rpcFindFreeTables({
      areaId: input.area_id,
      newStartISO: input.start_time_iso,
      partySize: input.party_size,
      durationMinutes: input.duration_minutes,
      bufferMinutes: 15
    });
    if (!free.some(t => t.id === input.table_id)) throw new Error("Der gewählte Tisch ist in diesem Zeitraum nicht (mehr) frei.");
  }

  const { data, error } = await supabase
    .from("reservations")
    .insert([{
      guest_name: input.guest_name,
      phone: input.phone ?? null,
      party_size: input.party_size,
      start_time: input.start_time_iso,
      duration_minutes: input.duration_minutes,
      status: "confirmed",
      notes: input.notes ?? null,
      area_id: input.area_id,
      table_id: input.table_id ?? null
    }])
    .select("*")
    .single();

  if (error) throw error;
  return data as ReservationRow;
}
