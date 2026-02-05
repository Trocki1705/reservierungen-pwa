import { Link, NavLink } from "react-router-dom";
import { supabase } from "../lib/api";

const baseLinkStyle = (isActive: boolean) => ({
  fontSize: 16,
  fontWeight: 700,
  padding: "12px 18px",
  borderRadius: 14,
  border: "1px solid #cfd5df",
  background: isActive ? "#111" : "#f8fafc",
  color: isActive ? "#fff" : "#111",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap" as const,
});

export function TopBar() {
  return (
    <div className="topbar">
      <div
        className="topbar-inner"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap", // ✅ darf umbrechen
        }}
      >
        {/* Links: darf umbrechen / auf eigene Zeile gehen */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: "1 1 320px", // ✅ nimmt Platz, darf kleiner werden, darf umbrechen
            minWidth: 0,
          }}
        >
          <Link
            to="/"
            style={{
              fontWeight: 900,
              fontSize: 18,
              textDecoration: "none",
              color: "#111",
              whiteSpace: "nowrap",
            }}
          >
            Reservierungen
          </Link>
          <span className="badge small">iPad</span>
        </div>

        {/* Rechts: Buttons bleiben in EINER Reihe, kein Scroll */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "nowrap", // ✅ Logout bleibt daneben
          }}
        >
          <NavLink to="/" style={({ isActive }) => baseLinkStyle(isActive)}>
            Heute
          </NavLink>

          <NavLink to="/tables" style={({ isActive }) => baseLinkStyle(isActive)}>
            Tischplan
          </NavLink>

          <NavLink
            to="/new"
            style={({ isActive }) => ({
              ...baseLinkStyle(isActive),
              fontWeight: 900,
              padding: "12px 20px",
              background: isActive ? "#1d4ed8" : "#2563eb",
              color: "#fff",
              border: "1px solid #1d4ed8",
            })}
          >
            + Neu
          </NavLink>

          {/* Logout: klein, direkt daneben */}
          <button
            onClick={() => supabase.auth.signOut()}
            title="Abmelden"
            style={{
              fontSize: 12,
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              color: "#374151",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
