import { useEffect, useState } from "preact/hooks";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { InfoCard } from "../components/ui/InfoCard";

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return v.toFixed(2);
}

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function DashboardPage() {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const fromISO = from ? new Date(from).toISOString() : "";
      const toD = new Date(to);
      toD.setHours(23, 59, 59, 999);
      const toISO = to ? toD.toISOString() : "";
      const res = await api.orders.summary({ from: fromISO, to: toISO });
      setData(res);
    } catch (e) {
      setErr(e.message || "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section style={card}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 16 }}>Dashboard</div>
        <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
          Sales Summary
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr 1fr auto",
        }}
      >
        <Input label="From" value={from} onInput={setFrom} type="date" />
        <Input label="To" value={to} onInput={setTo} type="date" />
        <div style={{ alignSelf: "end" }}>
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </Button>
        </div>
      </div>

      {err && (
        <div
          style={{
            padding: 12,
            border: "1px solid #f1c3c8",
            borderRadius: 12,
            color: "#b00020",
            background: "#fff",
          }}
        >
          {err}
        </div>
      )}

      {!loading && data ? (
        <>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(4, 1fr)",
            }}
          >
            <InfoCard label="Net sales" value={money(data.netSales)} />
            <InfoCard label="Paid orders" value={data.paid?.count ?? 0} />
            <InfoCard label="Void orders" value={data.void?.count ?? 0} />
            <InfoCard
              label="Void amount"
              value={money(data.void?.total ?? 0)}
            />
          </div>

          <div
            style={{
              border: "1px solid #eef0f3",
              borderRadius: 14,
              background: "#fff",
              overflowX: "auto",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                background: "#f8fafc",
                fontSize: 12,
                fontWeight: 950,
                color: "#475569",
              }}
            >
              By payment method (paid only)
            </div>
            <table>
              <thead>
                <tr style={{ background: "#fff" }}>
                  <th style={th}>Method</th>
                  <th style={th}>Count</th>
                  <th style={th}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.byPayment?.length ? (
                  data.byPayment.map((x) => (
                    <tr key={x.method}>
                      <td style={td}>{x.method}</td>
                      <td style={td}>{x.count}</td>
                      <td style={td}>{money(x.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={td} colSpan={3}>
                      No data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

const card = {
  background: "#fff",
  border: "1px solid #eef0f3",
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 12,
};

const th = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  color: "#475569",
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const td = {
  padding: "12px",
  fontSize: 14,
  color: "#0f172a",
  whiteSpace: "nowrap",
};
