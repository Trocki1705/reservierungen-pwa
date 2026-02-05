import { useEffect, useState } from "react";
import { supabase } from "../lib/api";
import Login from "../pages/Login";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        setAuthed(!!data.session);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div className="card">Lade…</div>;
  if (!authed) return <Login onLoggedIn={() => setAuthed(true)} />;
  return <>{children}</>;
}
