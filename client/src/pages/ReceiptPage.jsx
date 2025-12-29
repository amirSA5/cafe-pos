import { useEffect, useMemo, useState } from "preact/hooks";
import { route } from "preact-router";
import { api } from "../lib/api";
import { getAuth } from "../lib/auth";
import { Button } from "../components/ui/Button";

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return v.toFixed(2);
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

export function ReceiptPage({ id }) {
  const auth = getAuth();
  const role = auth?.user?.role;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!auth) route("/login");
  }, [auth]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const o = await api.orders.get(id);
        setOrder(o);
      } catch (e) {
        setErr(e.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const itemCount = useMemo(() => {
    return order?.items?.reduce((s, it) => s + (it.qty || 0), 0) || 0;
  }, [order]);

  if (!auth) return null;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 16 }}>Receipt</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="secondary"
            onClick={() => route(role === "admin" ? "/orders" : "/")}
          >
            Back
          </Button>
          <Button
            onClick={() => window.print()}
            disabled={loading || !!err || !order}
          >
            Print
          </Button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : err ? (
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
      ) : !order ? (
        <div>No data.</div>
      ) : (
        <div class="print-area">
          <div class="receipt">
            <div class="receipt__header">
              <div class="receipt__title">CAFÉ POS</div>
              <div class="receipt__muted">Receipt #{order.number}</div>
              <div class="receipt__muted">{formatDT(order.createdAt)}</div>
            </div>

            <div class="receipt__section">
              <div class="receipt__row">
                <span>Cashier</span>
                <span>{auth.user.username}</span>
              </div>
              <div class="receipt__row">
                <span>Items</span>
                <span>{itemCount}</span>
              </div>
            </div>

            <div class="receipt__divider" />

            <div class="receipt__items">
              {order.items.map((it, idx) => (
                <div class="receipt__item" key={idx}>
                  <div class="receipt__itemTop">
                    <span class="receipt__itemName">{it.name}</span>
                    <span class="receipt__itemLine">{money(it.lineTotal)}</span>
                  </div>
                  <div class="receipt__itemBottom">
                    <span class="receipt__muted">
                      {it.qty} × {money(it.price)}
                    </span>
                    <span class="receipt__muted">{it.category}</span>
                  </div>
                </div>
              ))}
            </div>

            <div class="receipt__divider" />

            <div class="receipt__section">
              <div class="receipt__row">
                <span>Subtotal</span>
                <span>{money(order.subtotal)}</span>
              </div>
              <div class="receipt__row">
                <span>Tax</span>
                <span>{money(order.taxAmount)}</span>
              </div>
              <div class="receipt__row receipt__total">
                <span>Total</span>
                <span>{money(order.total)}</span>
              </div>
            </div>

            <div class="receipt__divider" />

            <div class="receipt__section">
              <div class="receipt__row">
                <span>Payment</span>
                <span style={{ textTransform: "capitalize" }}>
                  {order.payment?.method || "-"}
                </span>
              </div>
              <div class="receipt__row">
                <span>Paid</span>
                <span>{money(order.payment?.paidAmount)}</span>
              </div>
              <div class="receipt__row">
                <span>Change</span>
                <span>{money(order.payment?.change)}</span>
              </div>
            </div>

            <div class="receipt__footer">
              <div class="receipt__muted">Thank you!</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
