import { useEffect, useMemo, useState } from "preact/hooks";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return v.toFixed(2);
}
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
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

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <div style={{ color: "#475569", fontWeight: 700 }}>{label}</div>
      <div style={{ fontWeight: 950 }}>{value}</div>
    </div>
  );
}

export function CashierPage() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsErr, setProductsErr] = useState("");

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]); // [{product, qty}]
  const [total, setTotal] = useState(0);
  const [taxRate, setTaxRate] = useState("0");
  const [paidAmount, setPaidAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState("");
  const [lastReceipt, setLastReceipt] = useState(null);

  const [paidTouched, setPaidTouched] = useState(false);

  async function loadProducts() {
    setLoadingProducts(true);
    setProductsErr("");
    try {
      const data = await api.products.list({ active: "true", limit: 300 });
      setProducts(data.items || []);
    } catch (e) {
      setProductsErr(e.message || "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    loadProducts();
    if (!paidTouched) {
      setPaidAmount(String(total));
    }
  }, [total, paidTouched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  function addToCart(p) {
    setCheckoutErr("");
    setLastReceipt(null);

    setCart((prev) => {
      const idx = prev.findIndex((x) => x.product._id === p._id);
      if (idx >= 0) {
        const copy = prev.slice();
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function setQty(productId, qty) {
    setCart((prev) => {
      const q = parseInt(qty || "0", 10);
      if (!Number.isFinite(q) || q < 1)
        return prev.filter((x) => x.product._id !== productId);
      return prev.map((x) =>
        x.product._id === productId ? { ...x, qty: q } : x
      );
    });
  }

  function clearCart() {
    setCart([]);
    setPaidTouched(false);
    setPaidAmount("");
    setCheckoutErr("");
    setLastReceipt(null);
  }

  const subtotal = useMemo(
    () => round2(cart.reduce((s, x) => s + x.product.price * x.qty, 0)),
    [cart]
  );
  const tax = useMemo(() => {
    const tr = Number(taxRate);
    if (!Number.isFinite(tr) || tr < 0) return 0;
    return round2(subtotal * tr);
  }, [subtotal, taxRate]);
  setTotal(useMemo(() => round2(subtotal + tax), [subtotal, tax]));

  async function checkout() {
    setCheckoutErr("");
    setLastReceipt(null);

    if (cart.length === 0) return setCheckoutErr("Cart is empty.");

    const tr = Number(taxRate);
    if (!Number.isFinite(tr) || tr < 0 || tr > 1)
      return setCheckoutErr("Tax rate must be between 0 and 1 (e.g. 0.19).");

    const paid = paidAmount === "" ? NaN : Number(paidAmount);
    if (!Number.isFinite(paid) || paid < total)
      return setCheckoutErr("Paid amount must be a number and >= total.");

    setCheckingOut(true);
    try {
      const payload = {
        items: cart.map((x) => ({ productId: x.product._id, qty: x.qty })),
        taxRate: tr,
        payment: { method: payMethod, paidAmount: paid },
        note: "",
      };
      const created = await api.orders.checkout(payload);
      setLastReceipt(created);
      clearCart();
    } catch (e) {
      setCheckoutErr(e.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <section style={card}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 16 }}>Cashier</div>
        <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
          Items in cart: <b>{cart.reduce((s, x) => s + x.qty, 0)}</b>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "1.15fr .85fr",
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Input
            label="Find product"
            value={search}
            onInput={setSearch}
            placeholder="Search name/category..."
          />
          {productsErr && <ErrorBox>{productsErr}</ErrorBox>}

          <div
            style={{
              border: "1px solid #eef0f3",
              borderRadius: 14,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div style={listHeader}>Products (click to add)</div>

            <div style={{ maxHeight: 460, overflow: "auto" }}>
              {loadingProducts ? (
                <div style={{ padding: 12 }}>Loading...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 12 }}>No products.</div>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => addToCart(p)}
                    style={productRowBtn}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {p.category}
                      </div>
                    </div>
                    <div style={{ fontWeight: 950 }}>{money(p.price)}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              border: "1px solid #eef0f3",
              borderRadius: 14,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div style={listHeader}>Cart</div>

            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              {cart.length === 0 ? (
                <div style={{ color: "#64748b" }}>No items yet.</div>
              ) : (
                cart.map((x) => (
                  <div
                    key={x.product._id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 90px 95px",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>{x.product.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {money(x.product.price)} each
                      </div>
                    </div>

                    <input
                      value={String(x.qty)}
                      onInput={(e) => setQty(x.product._id, e.target.value)}
                      type="number"
                      min="1"
                      style={{ borderRadius: 12, padding: "10px 12px" }}
                    />

                    <div style={{ fontWeight: 950, textAlign: "right" }}>
                      {money(x.product.price * x.qty)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #eef0f3",
              borderRadius: 14,
              padding: 12,
              background: "#fff",
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Input
                label="Tax rate (0..1)"
                value={taxRate}
                onInput={setTaxRate}
                placeholder="0.19"
                type="number"
              />
              <Select
                label="Payment method"
                value={payMethod}
                onChange={setPayMethod}
                options={[
                  { value: "cash", label: "Cash" },
                  { value: "card", label: "Card" },
                  { value: "other", label: "Other" },
                ]}
              />
            </div>

            <Input
              label="Paid amount"
              value={paidAmount}
              onInput={(v) => {
                setPaidTouched(true);
                setPaidAmount(v);
              }}
              placeholder={String(total)}
              type="number"
            />

            <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
              <Row label="Subtotal" value={money(subtotal)} />
              <Row label="Tax" value={money(tax)} />
              <div
                style={{
                  borderTop: "1px solid #eef0f3",
                  marginTop: 6,
                  paddingTop: 8,
                }}
              >
                <Row label={<b>Total</b>} value={<b>{money(total)}</b>} />
              </div>
            </div>

            {checkoutErr && <ErrorBox>{checkoutErr}</ErrorBox>}

            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <Button
                variant="secondary"
                onClick={clearCart}
                disabled={checkingOut}
              >
                Clear
              </Button>
              <Button
                onClick={checkout}
                disabled={checkingOut || cart.length === 0}
              >
                {checkingOut ? "Processing..." : "Checkout"}
              </Button>
            </div>
          </div>

          {lastReceipt && (
            <div
              style={{
                border: "1px solid #eef0f3",
                borderRadius: 14,
                padding: 12,
                background: "#fff",
              }}
            >
              <div style={{ fontWeight: 950 }}>Last receipt</div>
              <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                Order: <b>{lastReceipt.number}</b> — Total:{" "}
                <b>{money(lastReceipt.total)}</b> — Change:{" "}
                <b>{money(lastReceipt.payment?.change)}</b>
              </div>
            </div>
          )}
        </div>
      </div>
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

const listHeader = {
  background: "#f8fafc",
  padding: "10px 12px",
  fontWeight: 950,
  fontSize: 12,
  color: "#475569",
};

const productRowBtn = {
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "#fff",
  padding: 12,
  cursor: "pointer",
  borderTop: "1px solid #eef0f3",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
};
