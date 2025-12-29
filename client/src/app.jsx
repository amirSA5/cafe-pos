import { useEffect, useState } from "preact/hooks";

export function App() {
  const [health, setHealth] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: 16 }}>
      <h1>Café POS</h1>
      <p>API health check:</p>

      {err && <pre>{err}</pre>}
      {health ? <pre>{JSON.stringify(health, null, 2)}</pre> : <p>Loading…</p>}
    </main>
  );
}
