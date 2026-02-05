import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
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
});

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="topbar">
      <div
        className="topbar-inner"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/" style={{ fontWeight: 900, textDecoration: "none", color: "#111" }}>
            Reservierungen
          </Link>
          <span className="badge">iPad</span>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* HEUTE: immer ohne Query/Hash zurück */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              if (location.pathname === "/" && (location.search || location.hash)) {
                navigate({ pathname: "/", search: "", hash: "" }, { replace: true });
              } else {
                navigate({ pathname: "/", search: "", hash: "" });
              }
            }}
            style={baseLinkStyle(location.pathname === "/" && !location.search && !location.hash)}
          >
            Heute
          </a>

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

          {/* Logout klein */}
          <button
            onClick={() => supabase.auth.signOut()}
            title="Abmelden"
            style={{
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
