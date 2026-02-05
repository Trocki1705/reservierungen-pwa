import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const email = import.meta.env.VITE_LOGIN_EMAIL as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });

if (error) {
  setErr("Falsches Passwort.");
  return;
}
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>Login</div>
      <div className="small" style={{ marginTop: 6, color: "#6b7280" }}>
        Bitte Passwort eingeben.
      </div>

      <form onSubmit={submit} style={{ marginTop: 14 }}>
        <label className="small">Passwort</label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />

        {err && (
          <div className="badge bad" style={{ marginTop: 10 }}>
            {err}
          </div>
        )}

        <button className="primary" style={{ marginTop: 12 }} disabled={loading}>
          {loading ? "Prüfe…" : "Rein"}
        </button>
      </form>
    </div>
  );
}
