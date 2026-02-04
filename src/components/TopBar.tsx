import { Link, NavLink } from "react-router-dom";

export function TopBar() {
  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/" style={{ fontWeight: 800 }}>Reservierungen</Link>
          <span className="badge">iPad PWA</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <NavLink to="/" style={({isActive}) => ({ padding: "8px 12px", borderRadius: 12, background: isActive ? "#111" : "#fff", color: isActive ? "#fff" : "#111", border: "1px solid #cfd5df" })}>
            Heute
          </NavLink>
          <NavLink to="/neu" style={({isActive}) => ({ padding: "8px 12px", borderRadius: 12, background: isActive ? "#111" : "#fff", color: isActive ? "#fff" : "#111", border: "1px solid #cfd5df" })}>
            + Neu
          </NavLink>
        </div>
      </div>
    </div>
  );
}
