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
	console.log("TopBar render");
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="topbar">
      <div className="topbar-inner" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/" style={{ fontWeight: 800, textDecoration: "none", color: "#111" }}>
            Reservierungen
          </Link>
          <span className="badge">iPad PWA</span>
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
            Reservierungen
          </a>

          {/* ✅ passend zu App.tsx */}
          <NavLink to="/tables" style={({ isActive }) => baseLinkStyle(isActive)}>
            Tischplan
          </NavLink>

          {/* ✅ passend zu App.tsx */}
          <NavLink
            to="/new"
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

          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid #cfd5df",
              background: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Abmelden"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
