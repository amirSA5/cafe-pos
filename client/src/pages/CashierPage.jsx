import { useEffect, useMemo, useState } from "preact/hooks";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { route } from "preact-router";

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

function BackIcon() {
  // simple inline icon (no extra libs)
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "block" }}
    >
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export function CashierPage() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsErr, setProductsErr] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(""); // "" means category view
  const [cart, setCart] = useState([]); // [{product, qty}]
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
      const data = await api.products.list({ active: "true", limit: 500 });
      setProducts(data.items || []);
    } catch (e) {
      setProductsErr(e.message || "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(
      products.map((p) => String(p.category || "").trim()).filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products;

    if (selectedCategory) {
      list = list.filter(
        (p) => String(p.category || "").trim() === selectedCategory
      );
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const cat = String(p.category || "").toLowerCase();
      return name.includes(q) || cat.includes(q);
    });
  }, [products, selectedCategory, search]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, search]);

  // Totals
  const subtotal = useMemo(
    () =>
      round2(
        cart.reduce((s, x) => s + Number(x.product.price || 0) * x.qty, 0)
      ),
    [cart]
  );

  const tax = useMemo(() => {
    const tr = Number(taxRate);
    if (!Number.isFinite(tr) || tr < 0) return 0;
    return round2(subtotal * tr);
  }, [subtotal, taxRate]);

  const total = useMemo(() => round2(subtotal + tax), [subtotal, tax]);

  // Auto-fill paid amount with total unless cashier edited it
  useEffect(() => {
    if (!paidTouched) setPaidAmount(String(total));
  }, [total, paidTouched]);

  // Helpers
  function getProductFromList(id) {
    return products.find((p) => String(p._id) === String(id));
  }

  function addToCart(p) {
    setCheckoutErr("");
    setLastReceipt(null);

    const stock = Number(p.stockQty ?? 0);
    if (!Number.isFinite(stock) || stock <= 0) {
      return setCheckoutErr(`"${p.name}" is out of stock.`);
    }

    setCart((prev) => {
      const idx = prev.findIndex((x) => x.product._id === p._id);
      if (idx >= 0) {
        const current = prev[idx];
        const nextQty = current.qty + 1;

        if (nextQty > stock) return prev;

        const copy = prev.slice();
        copy[idx] = { ...current, qty: nextQty };
        return copy;
      }
      return [...prev, { product: p, qty: 1 }];
    });
  }

  function setQty(productId, qty) {
    setCheckoutErr("");
    setLastReceipt(null);

    setCart((prev) => {
      const q = parseInt(qty || "0", 10);
      if (!Number.isFinite(q) || q < 1) {
        return prev.filter((x) => x.product._id !== productId);
      }

      const pLatest = getProductFromList(productId);
      const stock = Number(pLatest?.stockQty ?? 0);
      const capped = Number.isFinite(stock) ? Math.min(q, stock) : q;

      return prev.map((x) =>
        x.product._id === productId ? { ...x, qty: capped } : x
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

  async function refreshProducts() {
    await loadProducts();
  }

  async function checkout() {
    setCheckoutErr("");
    setLastReceipt(null);

    if (cart.length === 0) return setCheckoutErr("Cart is empty.");

    const tr = Number(taxRate);
    if (!Number.isFinite(tr) || tr < 0 || tr > 1) {
      return setCheckoutErr("Tax rate must be between 0 and 1 (e.g. 0.19).");
    }

    for (const x of cart) {
      const pLatest = getProductFromList(x.product._id) || x.product;
      const stock = Number(pLatest.stockQty ?? 0);
      if (!Number.isFinite(stock) || stock < x.qty) {
        return setCheckoutErr(
          `Insufficient stock for ${pLatest.name} (have ${stock}, need ${x.qty}).`
        );
      }
    }

    const paid = paidAmount === "" ? NaN : Number(paidAmount);
    if (!Number.isFinite(paid) || paid < total) {
      return setCheckoutErr("Paid amount must be a number and >= total.");
    }

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

      await refreshProducts();

      route(`/receipt/${created._id || created.id}`);
    } catch (e) {
      setCheckoutErr(e.message || "Checkout failed");
      await refreshProducts();
    } finally {
      setCheckingOut(false);
    }
  }

  const cartCount = useMemo(() => cart.reduce((s, x) => s + x.qty, 0), [cart]);

  const isCategoryView = !selectedCategory;

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
          Items in cart: <b>{cartCount}</b>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "1.15fr .85fr",
        }}
      >
        {/* LEFT: categories or products */}
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "1fr auto",
            }}
          >
            <Input
              label={isCategoryView ? "Find category" : "Find product"}
              value={search}
              onInput={setSearch}
              placeholder={
                isCategoryView
                  ? "Search category..."
                  : "Search name/category..."
              }
            />
            <div style={{ alignSelf: "end", display: "flex", gap: 8 }}>
              {!isCategoryView && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedCategory("");
                    setSearch("");
                  }}
                  title="Back to categories"
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <BackIcon />
                    Back
                  </span>
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={refreshProducts}
                disabled={loadingProducts}
              >
                {loadingProducts ? "Loading..." : "Refresh"}
              </Button>
            </div>
          </div>

          {productsErr && <ErrorBox>{productsErr}</ErrorBox>}

          <div
            style={{
              border: "1px solid #eef0f3",
              borderRadius: 14,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div style={listHeader}>
              {isCategoryView
                ? "Categories (click to open)"
                : `Products — ${selectedCategory} (click to add)`}
            </div>

            <div style={{ maxHeight: 460, overflow: "auto" }}>
              {loadingProducts ? (
                <div style={{ padding: 12 }}>Loading...</div>
              ) : isCategoryView ? (
                filteredCategories.length === 0 ? (
                  <div style={{ padding: 12 }}>No categories.</div>
                ) : (
                  filteredCategories.map((c) => {
                    const count = products.filter(
                      (p) => String(p.category || "").trim() === c
                    ).length;

                    return (
                      <button
                        key={c}
                        onClick={() => setSelectedCategory(c)}
                        style={categoryRowBtn}
                        title="Open category"
                      >
                        <div style={{ display: "grid", gap: 2 }}>
                          <div style={{ fontWeight: 950 }}>{c}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {count} product{count === 1 ? "" : "s"}
                          </div>
                        </div>

                        <div style={{ color: "#64748b", fontWeight: 900 }}>
                          ›
                        </div>
                      </button>
                    );
                  })
                )
              ) : filteredProducts.length === 0 ? (
                <div style={{ padding: 12 }}>No products in this category.</div>
              ) : (
                filteredProducts.map((p) => {
                  const stock = Number(p.stockQty ?? 0);
                  const out = !Number.isFinite(stock) || stock <= 0;

                  return (
                    <button
                      key={p._id}
                      onClick={() => addToCart(p)}
                      style={{
                        ...productRowBtn,
                        opacity: out ? 0.55 : 1,
                        cursor: out ? "not-allowed" : "pointer",
                      }}
                      disabled={out}
                      title={out ? "Out of stock" : "Add to cart"}
                    >
                      <div>
                        <div style={{ fontWeight: 900 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          Stock: {Number.isFinite(stock) ? stock : 0}
                        </div>
                      </div>
                      <div style={{ fontWeight: 950 }}>{money(p.price)}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: cart + payment */}
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
                cart.map((x) => {
                  const pLatest =
                    getProductFromList(x.product._id) || x.product;
                  const stock = Number(pLatest.stockQty ?? 0);

                  return (
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
                          {money(x.product.price)} each • Stock:{" "}
                          {Number.isFinite(stock) ? stock : 0}
                        </div>
                      </div>

                      <input
                        value={String(x.qty)}
                        onInput={(e) => setQty(x.product._id, e.target.value)}
                        type="number"
                        min="1"
                        max={Number.isFinite(stock) ? String(stock) : undefined}
                        style={{
                          borderRadius: 12,
                          padding: "10px 12px",
                          border: "1px solid #e5e7eb",
                        }}
                      />

                      <div style={{ fontWeight: 950, textAlign: "right" }}>
                        {money(Number(x.product.price || 0) * x.qty)}
                      </div>
                    </div>
                  );
                })
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

const categoryRowBtn = {
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "#fff",
  padding: 12,
  borderTop: "1px solid #eef0f3",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
};

const productRowBtn = {
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "#fff",
  padding: 12,
  borderTop: "1px solid #eef0f3",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
};
