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
        {/* Links: Titel */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            to="/"
            style={{
              fontWeight: 900,
              fontSize: 18,
              textDecoration: "none",
              color: "#111",
            }}
          >
            Reservierungen
          </Link>
          <span className="badge small">iPad</span>
        </div>

        {/* Mitte: Navigation */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Heute */}
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
        </div>

        {/* Rechts: Logout (klein & ruhig) */}
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
  );
}
