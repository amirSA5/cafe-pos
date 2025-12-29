import { useState } from "preact/hooks";
import { route } from "preact-router";
import { api } from "../lib/api";
import { setAuth } from "../lib/auth";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const data = await api.auth.login({ username, password });
      setAuth(data);
      route("/");
    } catch (e2) {
      setErr(e2.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", padding: 16 }}>
      <div style={{ fontWeight: 950, fontSize: 22, marginBottom: 8 }}>
        Login
      </div>
      <div style={{ color: "#64748b", fontWeight: 700, marginBottom: 16 }}>
        Sign in to Café POS
      </div>

      {err && (
        <div
          style={{
            padding: 12,
            border: "1px solid #f1c3c8",
            borderRadius: 12,
            color: "#b00020",
            background: "#fff",
            marginBottom: 12,
          }}
        >
          {err}
        </div>
      )}

      <form
        onSubmit={submit}
        style={{
          display: "grid",
          gap: 12,
          background: "#fff",
          border: "1px solid #eef0f3",
          borderRadius: 16,
          padding: 14,
        }}
      >
        <Input
          label="Username"
          value={username}
          onInput={setUsername}
          placeholder="admin"
        />
        <Input
          label="Password"
          value={password}
          onInput={setPassword}
          placeholder="••••••"
          type="password"
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </Button>
      </form>
    </div>
  );
}
