import { Link, NavLink } from "react-router-dom";

const linkStyle = (isActive: boolean) => ({
  padding: "8px 12px",
  borderRadius: 12,
  background: isActive ? "#111" : "#fff",
  color: isActive ? "#fff" : "#111",
  border: "1px solid #cfd5df"
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
          <NavLink to="/" style={({isActive}) => linkStyle(isActive)}>Heute</NavLink>
          <NavLink to="/tische" style={({isActive}) => linkStyle(isActive)}>Tischplan</NavLink>
          <NavLink to="/neu" style={({isActive}) => linkStyle(isActive)}>+ Neu</NavLink>
        </div>
      </div>
    </div>
  );
}
