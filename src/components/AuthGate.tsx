import { useEffect, useState } from "react";
import { supabase } from "../lib/api";
import Login from "../pages/Login";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [dbg, setDbg] = useState<string>("init");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setDbg("getSession…");
        const { data, error } = await supabase.auth.getSession();
        if (!alive) return;

        if (error) setDbg("getSession error: " + error.message);
        else setDbg("session: " + (data.session ? "YES" : "NO"));

        setAuthed(!!data.session);
      } catch (e: any) {
        if (!alive) return;
        setDbg("getSession threw: " + String(e?.message ?? e));
        setAuthed(false);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setDbg("auth change: " + (session ? "YES" : "NO"));
      setAuthed(!!session);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ✅ Damit du IMMER siehst, dass AuthGate läuft:
  return (
    <>
      <div style={{ padding: 8, fontSize: 12, opacity: 0.7 }}>
        AuthGate: loading={String(loading)} authed={String(authed)} dbg={dbg}
      </div>

      {loading ? (
        <div className="card">Auth wird geprüft…</div>
      ) : !authed ? (
        <Login onLoggedIn={() => setAuthed(true)} />
      ) : (
        <>{children}</>
      )}
    </>
  );
}
