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
      <div className="topbar-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/" style={{ fontWeight: 800, textDecoration: "none", color: "#111" }}>
            Reservierungen
          </Link>
          <span className="badge">iPad PWA</span>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* HEUTE: immer ohne Query/Hash zurück */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              // navigiert IMMER sauber zurück auf "/" ohne ?open=...
              if (location.pathname === "/" && (location.search || location.hash)) {
                navigate({ pathname: "/", search: "", hash: "" }, { replace: true });
              } else {
                navigate({ pathname: "/", search: "", hash: "" });
              }
            }}
            style={baseLinkStyle(location.pathname === "/" && !location.search && !location.hash)}
          >
            Reservierungen
          </a>

          <NavLink to="/tische" style={({ isActive }) => baseLinkStyle(isActive)}>
            Tischplan
          </NavLink>

          <NavLink
            to="/neu"
            style={({ isActive }) => ({
              ...baseLinkStyle(isActive),
              fontSize: 18,
              fontWeight: 900,
              padding: "14px 24px",
              background: isActive ? "#1d4ed8" : "#2563eb",
              color: "#fff",
              border: "1px solid #1d4ed8",
              boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
            })}
          >
            + Neu
          </NavLink>
        </div>
      </div>
    </div>
  );
}
