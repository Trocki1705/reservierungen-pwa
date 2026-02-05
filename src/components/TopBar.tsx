import { Link, NavLink } from "react-router-dom";

const baseLinkStyle = (isActive: boolean) => ({
  fontSize: 16,
  fontWeight: 700,
  padding: "12px 18px",
  borderRadius: 14,
  border: "1px solid #cfd5df",
  background: isActive ? "#111" : "#f8fafc",
  color: isActive ? "#fff" : "#111",
  textDecoration: "none",
});

export function TopBar() {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/" style={{ fontWeight: 800 }}>Reservierungen</Link>
          <span className="badge">iPad PWA</span>
        </div>
        
		<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
  <NavLink
    to="/"
    style={({ isActive }) => baseLinkStyle(isActive)}
  >
    Heute
  </NavLink>

  <NavLink
    to="/tische"
    style={({ isActive }) => baseLinkStyle(isActive)}
  >
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
