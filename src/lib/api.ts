import { supabase } from "./supabase";
import type { Area, ReservationRow, TableRow } from "./types";

export async function fetchAreas(): Promise<Area[]> {
  const { data, error } = await supabase.from("areas").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Area[];
}

export async function fetchTodayReservations(opts: {
  day: Date;
  areaId?: string | null;
}): Promise<ReservationRow[]> {
  const start = new Date(opts.day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  let q = supabase
    .from("reservations")
    .select("*")
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString())
    .order("start_time", { ascending: true });

  if (opts.areaId) q = q.eq("area_id", opts.areaId);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ReservationRow[];
}

export async function rpcFindFreeTables(args: {
  areaId: string;
  newStartISO: string;
  partySize: number;
  durationMinutes: number;
  bufferMinutes: number;
}): Promise<TableRow[]> {
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
  fallback_area_id?: string | null;
}) {
  // Final check, wenn Tisch gesetzt ist
  if (input.table_id) {
    const free = await rpcFindFreeTables({
      areaId: input.area_id,
      newStartISO: input.start_time_iso,
      partySize: input.party_size,
      durationMinutes: input.duration_minutes,
      bufferMinutes: 15
    });
    const ok = free.some(t => t.id === input.table_id);
    if (!ok) throw new Error("Der gewählte Tisch ist in diesem Zeitraum nicht (mehr) frei.");
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
      table_id: input.table_id ?? null,
      fallback_area_id: input.fallback_area_id ?? null,
    }])
    .select("*")
    .single();

  if (error) throw error;
  return data as ReservationRow;
}
