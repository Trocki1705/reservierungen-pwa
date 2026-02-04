export type Area = {
  id: string;
  name: "Restaurant" | "Pizzastube" | "Terrasse" | string;
  sort_order: number;
};

export type TableRow = {
  id: string;
  area_id: string;
  table_number: number;
  seats: number;
  active: boolean;
};

export type ReservationStatus = "requested" | "confirmed" | "arrived" | "cancelled" | "no_show";

export type ReservationRow = {
  id: string;
  guest_name: string;
  phone: string | null;
  party_size: number;
  start_time: string; // ISO
  duration_minutes: number;
  status: ReservationStatus;
  notes: string | null;
  area_id: string;
  table_id: string | null;
  fallback_area_id: string | null;
  created_at: string;
};
