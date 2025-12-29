import { useEffect, useMemo, useState } from "preact/hooks";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { InfoCard } from "../components/ui/InfoCard";
import { route } from "preact-router";

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return v.toFixed(2);
}
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
function formatDT(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso || "");
    return d.toLocaleString();
  } catch {
    return String(iso || "");
  }
}
function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function ErrorBox({ children }) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #f1c3c8",
        borderRadius: 12,
        color: "#b00020",
        background: "#fff",
      }}
    >
      {children}
    </div>
  );
}

export function OrdersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [status, setStatus] = useState("");
  const [from, setFrom] = useState(startOfTodayISO().slice(0, 10));
  const [to, setTo] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsErr, setDetailsErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = { status, page: 1, limit: 50 };
      if (from) params.from = new Date(from).toISOString();
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        params.to = d.toISOString();
      }
      const data = await api.orders.list(params);
      setItems(data.items || []);
    } catch (e) {
      setErr(e.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openDetails(id) {
    setDetailsOpen(true);
    setDetails(null);
    setDetailsErr("");
    setDetailsLoading(true);
    try {
      const d = await api.orders.get(id);
      setDetails(d);
    } catch (e) {
      setDetailsErr(e.message || "Failed to load order");
    } finally {
      setDetailsLoading(false);
    }
  }

  const totalSum = useMemo(
    () => round2(items.reduce((s, o) => s + (Number(o.total) || 0), 0)),
    [items]
  );

  return (
    <section style={card}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 16 }}>Orders</div>
        <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
          Count: <b>{items.length}</b> — Sum: <b>{money(totalSum)}</b>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr 1fr 1fr auto",
        }}
      >
        <Select
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All" },
            { value: "paid", label: "Paid" },
            { value: "open", label: "Open" },
            { value: "void", label: "Void" },
          ]}
        />
        <Input label="From (date)" value={from} onInput={setFrom} type="date" />
        <Input label="To (date)" value={to} onInput={setTo} type="date" />
        <div style={{ alignSelf: "end" }}>
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </Button>
        </div>
      </div>

      {err && <ErrorBox>{err}</ErrorBox>}

      <div
        style={{
          overflowX: "auto",
          border: "1px solid #eef0f3",
          borderRadius: 14,
          background: "#fff",
        }}
      >
        <table>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={th}>Number</th>
              <th style={th}>Date</th>
              <th style={th}>Status</th>
              <th style={th}>Items</th>
              <th style={th}>Total</th>
              <th style={{ ...th, width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={td} colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td style={td} colSpan={6}>
                  No orders.
                </td>
              </tr>
            ) : (
              items.map((o) => (
                <tr key={o._id}>
                  <td style={td}>
                    <b>{o.number}</b>
                  </td>
                  <td style={td}>{formatDT(o.createdAt)}</td>
                  <td style={td}>{o.status}</td>
                  <td style={td}>
                    {o.items?.reduce((s, it) => s + (it.qty || 0), 0) ?? "-"}
                  </td>
                  <td style={td}>{money(o.total)}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        variant="secondary"
                        onClick={() => openDetails(o._id)}
                      >
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => route(`/receipt/${o._id}`)}
                      >
                        Reprint
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={detailsOpen}
        title={details ? `Order ${details.number}` : "Order details"}
        onClose={() => {
          setDetailsOpen(false);
          setDetails(null);
        }}
      >
        {detailsLoading ? (
          <div>Loading...</div>
        ) : detailsErr ? (
          <ErrorBox>{detailsErr}</ErrorBox>
        ) : !details ? (
          <div>No data.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <InfoCard label="Created" value={formatDT(details.createdAt)} />
              <InfoCard label="Status" value={details.status} />
              <InfoCard
                label="Payment"
                value={`${details.payment?.method || "-"} | paid ${money(
                  details.payment?.paidAmount
                )} | change ${money(details.payment?.change)}`}
              />
              <InfoCard
                label="Totals"
                value={`subtotal ${money(details.subtotal)} | tax ${money(
                  details.taxAmount
                )} | total ${money(details.total)}`}
              />
            </div>

            <div
              style={{
                overflowX: "auto",
                border: "1px solid #eef0f3",
                borderRadius: 14,
                background: "#fff",
              }}
            >
              <table>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={th}>Item</th>
                    <th style={th}>Qty</th>
                    <th style={th}>Price</th>
                    <th style={th}>Line</th>
                  </tr>
                </thead>
                <tbody>
                  {details.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ ...td, whiteSpace: "normal" }}>
                        <b>{it.name}</b>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {it.category}
                        </div>
                      </td>
                      <td style={td}>{it.qty}</td>
                      <td style={td}>{money(it.price)}</td>
                      <td style={td}>{money(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
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
  verticalAlign: "top",
};
