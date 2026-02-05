import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Login from "../pages/Login";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="card">Lade…</div>;
  if (!authed) return <Login onLoggedIn={() => setAuthed(true)} />;
  return <>{children}</>;
}
