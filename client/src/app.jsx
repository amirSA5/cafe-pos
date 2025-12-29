import { useEffect, useMemo, useState } from "preact/hooks";
import { api } from "./lib/api";

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

function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
}) {
  const base = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontWeight: 700,
  };

  const styles =
    variant === "primary"
      ? { ...base, background: "#111", color: "#fff", borderColor: "#111" }
      : variant === "danger"
      ? {
          ...base,
          background: "#fff",
          color: "#b00020",
          borderColor: "#f0c0c0",
        }
      : { ...base, background: "#fff", color: "#111" };

  return (
    <button type={type} onClick={onClick} style={styles} disabled={disabled}>
      {children}
    </button>
  );
}

function Input({ label, value, onInput, placeholder, type = "text" }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>
        {label}
      </span>
      <input
        value={value}
        onInput={(e) => onInput(e.target.value)}
        placeholder={placeholder}
        type={type}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #ddd",
          outline: "none",
        }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#444", fontWeight: 700 }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #ddd",
          outline: "none",
          background: "#fff",
        }}
      >
        {options.map((o) => (
          <option value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(860px, 100%)",
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #eee",
          boxShadow: "0 20px 80px rgba(0,0,0,.25)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #eee",
          }}
        >
          <div style={{ fontWeight: 900 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 18,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

/* ----------------------- Products Admin (same as before) ----------------------- */

function ProductForm({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [price, setPrice] = useState(
    initial?.price != null ? String(initial.price) : ""
  );
  const [sku, setSku] = useState(initial?.sku || "");
  const [active, setActive] = useState(initial?.active ?? true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    const p = Number(price);
    if (!name.trim() || !category.trim()) {
      setError("Name and category are required.");
      return;
    }
    if (!Number.isFinite(p) || p < 0) {
      setError("Price must be a non-negative number.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        category: category.trim(),
        price: p,
        sku: sku.trim(),
        active: Boolean(active),
      });
    } catch (err) {
      setError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      {error && <div style={errorBox}>{error}</div>}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <Input
          label="Name"
          value={name}
          onInput={setName}
          placeholder="Cappuccino"
        />
        <Input
          label="Category"
          value={category}
          onInput={setCategory}
          placeholder="Coffee"
        />
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <Input
          label="Price"
          value={price}
          onInput={setPrice}
          placeholder="8.50"
          type="number"
        />
        <Input
          label="SKU (optional)"
          value={sku}
          onInput={setSku}
          placeholder="CAP-001"
        />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <span style={{ fontWeight: 800 }}>Active</span>
      </label>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

function ProductsAdmin() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(items.map((p) => p.category).filter(Boolean));
    return ["", ...Array.from(set).sort()];
  }, [items]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await api.products.list({
        search,
        category,
        active,
        page: 1,
        limit: 50,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setErr(e.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDelete(p) {
    const ok = confirm(`Delete "${p.name}"?`);
    if (!ok) return;
    try {
      await api.products.remove(p._id);
      await load();
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  async function onSave(payload) {
    if (editing?._id) {
      await api.products.update(editing._id, payload);
    } else {
      await api.products.create(payload);
    }
    setModalOpen(false);
    setEditing(null);
    await load();
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
        <div style={{ fontWeight: 900, fontSize: 16 }}>Products</div>
        <div style={{ color: "#555", fontSize: 13 }}>
          Total: <b>{total}</b>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "2fr 1fr 1fr auto",
        }}
      >
        <Input
          label="Search"
          value={search}
          onInput={setSearch}
          placeholder="Search by name..."
        />

        <Select
          label="Category"
          value={category}
          onChange={setCategory}
          options={[
            { value: "", label: "All" },
            ...categories.filter(Boolean).map((c) => ({ value: c, label: c })),
          ]}
        />

        <Select
          label="Active"
          value={active}
          onChange={setActive}
          options={[
            { value: "", label: "All" },
            { value: "true", label: "Active only" },
            { value: "false", label: "Inactive only" },
          ]}
        />

        <div style={{ alignSelf: "end" }}>
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          + New product
        </Button>
      </div>

      {err && <div style={errorBox}>{err}</div>}

      <div
        style={{
          overflowX: "auto",
          border: "1px solid #eee",
          borderRadius: 14,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
          }}
        >
          <thead>
            <tr style={{ background: "#fbfbfb" }}>
              <th style={th}>Name</th>
              <th style={th}>Category</th>
              <th style={th}>Price</th>
              <th style={th}>SKU</th>
              <th style={th}>Active</th>
              <th style={{ ...th, width: 220 }}>Actions</th>
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
                  No products found.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p._id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={td}>{p.name}</td>
                  <td style={td}>{p.category}</td>
                  <td style={td}>{money(p.price)}</td>
                  <td style={td}>{p.sku || "-"}</td>
                  <td style={td}>{p.active ? "Yes" : "No"}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditing(p);
                          setModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => onDelete(p)}>
                        Delete
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
        open={modalOpen}
        title={editing ? `Edit: ${editing.name}` : "New product"}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      >
        <ProductForm
          initial={editing}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={onSave}
        />
      </Modal>
    </section>
  );
}

/* ------------------------------ Cashier Screen ------------------------------ */

function Cashier() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsErr, setProductsErr] = useState("");

  const [search, setSearch] = useState("");

  const [cart, setCart] = useState([]);
  const [taxRate, setTaxRate] = useState("0.19");
  const [paidAmount, setPaidAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState("");
  const [lastReceipt, setLastReceipt] = useState(null);

  async function loadProducts() {
    setLoadingProducts(true);
    setProductsErr("");
    try {
      const data = await api.products.list({
        search: "",
        active: "true",
        limit: 200,
      });
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
      if (!Number.isFinite(q) || q < 1) {
        return prev.filter((x) => x.product._id !== productId);
      }
      return prev.map((x) =>
        x.product._id === productId ? { ...x, qty: q } : x
      );
    });
  }

  function clearCart() {
    setCart([]);
    setPaidAmount("");
    setCheckoutErr("");
    setLastReceipt(null);
  }

  const subtotal = useMemo(() => {
    return round2(cart.reduce((s, x) => s + x.product.price * x.qty, 0));
  }, [cart]);

  const tax = useMemo(() => {
    const tr = Number(taxRate);
    if (!Number.isFinite(tr) || tr < 0) return 0;
    return round2(subtotal * tr);
  }, [subtotal, taxRate]);

  const total = useMemo(() => round2(subtotal + tax), [subtotal, tax]);

  async function checkout() {
    setCheckoutErr("");
    setLastReceipt(null);

    if (cart.length === 0) {
      setCheckoutErr("Cart is empty.");
      return;
    }

    const tr = Number(taxRate);
    if (!Number.isFinite(tr) || tr < 0 || tr > 1) {
      setCheckoutErr("Tax rate must be between 0 and 1 (e.g. 0.19).");
      return;
    }

    const paid = paidAmount === "" ? NaN : Number(paidAmount);
    if (!Number.isFinite(paid) || paid < total) {
      setCheckoutErr("Paid amount must be a number and >= total.");
      return;
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
        <div style={{ fontWeight: 900, fontSize: 16 }}>Cashier</div>
        <div style={{ color: "#555", fontSize: 13 }}>
          Items in cart: <b>{cart.reduce((s, x) => s + x.qty, 0)}</b>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 14 }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Input
            label="Find product"
            value={search}
            onInput={setSearch}
            placeholder="Search name/category..."
          />
          {productsErr && <div style={errorBox}>{productsErr}</div>}

          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div style={listHeader}>Products (click to add)</div>

            <div style={{ maxHeight: 420, overflow: "auto" }}>
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
                      <div style={{ fontWeight: 800 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {p.category}
                      </div>
                    </div>
                    <div style={{ fontWeight: 900 }}>{money(p.price)}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div style={listHeader}>Cart</div>

            <div style={{ padding: 12, display: "grid", gap: 10 }}>
              {cart.length === 0 ? (
                <div style={{ color: "#666" }}>No items yet.</div>
              ) : (
                cart.map((x) => (
                  <div
                    key={x.product._id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 90px",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{x.product.name}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {money(x.product.price)} each
                      </div>
                    </div>

                    <input
                      value={String(x.qty)}
                      onInput={(e) => setQty(x.product._id, e.target.value)}
                      type="number"
                      min="1"
                      style={qtyInput}
                    />

                    <div style={{ fontWeight: 900, textAlign: "right" }}>
                      {money(x.product.price * x.qty)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 12,
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
              onInput={setPaidAmount}
              placeholder={String(total)}
              type="number"
            />

            <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
              <Row label="Subtotal" value={money(subtotal)} />
              <Row label="Tax" value={money(tax)} />
              <div
                style={{
                  borderTop: "1px solid #eee",
                  marginTop: 6,
                  paddingTop: 8,
                }}
              >
                <Row label={<b>Total</b>} value={<b>{money(total)}</b>} />
              </div>
            </div>

            {checkoutErr && <div style={errorBox}>{checkoutErr}</div>}

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
                border: "1px solid #e7e7e7",
                borderRadius: 14,
                padding: 12,
                background: "#fff",
              }}
            >
              <div style={{ fontWeight: 900 }}>Last receipt</div>
              <div style={{ fontSize: 13, color: "#444", marginTop: 4 }}>
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

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <div style={{ color: "#555" }}>{label}</div>
      <div style={{ fontWeight: 800 }}>{value}</div>
    </div>
  );
}

/* ------------------------------ Orders History ------------------------------ */

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function OrdersHistory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [status, setStatus] = useState(""); // "", "paid", "open", "void"
  const [from, setFrom] = useState(startOfTodayISO().slice(0, 10)); // yyyy-mm-dd
  const [to, setTo] = useState(""); // yyyy-mm-dd

  const [selectedId, setSelectedId] = useState("");
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
    setSelectedId(id);
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

  const totalSum = useMemo(() => {
    return round2(items.reduce((s, o) => s + (Number(o.total) || 0), 0));
  }, [items]);

  return (
    <section style={card}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 16 }}>Orders</div>
        <div style={{ color: "#555", fontSize: 13 }}>
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

      {err && <div style={errorBox}>{err}</div>}

      <div
        style={{
          overflowX: "auto",
          border: "1px solid #eee",
          borderRadius: 14,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
          }}
        >
          <thead>
            <tr style={{ background: "#fbfbfb" }}>
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
                <tr key={o._id} style={{ borderTop: "1px solid #eee" }}>
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
                    <Button
                      variant="secondary"
                      onClick={() => openDetails(o._id)}
                    >
                      View
                    </Button>
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
          setSelectedId("");
          setDetails(null);
        }}
      >
        {detailsLoading ? (
          <div>Loading...</div>
        ) : detailsErr ? (
          <div style={errorBox}>{detailsErr}</div>
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
              <Info label="Created" value={formatDT(details.createdAt)} />
              <Info label="Status" value={details.status} />
              <Info
                label="Payment"
                value={`${details.payment?.method || "-"} | paid ${money(
                  details.payment?.paidAmount
                )} | change ${money(details.payment?.change)}`}
              />
              <Info
                label="Totals"
                value={`subtotal ${money(details.subtotal)} | tax ${money(
                  details.taxAmount
                )} | total ${money(details.total)}`}
              />
            </div>

            <div
              style={{
                overflowX: "auto",
                border: "1px solid #eee",
                borderRadius: 14,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fbfbfb" }}>
                    <th style={th}>Item</th>
                    <th style={th}>Qty</th>
                    <th style={th}>Price</th>
                    <th style={th}>Line</th>
                  </tr>
                </thead>
                <tbody>
                  {details.items?.map((it, idx) => (
                    <tr key={idx} style={{ borderTop: "1px solid #eee" }}>
                      <td style={td}>
                        <b>{it.name}</b>
                        <div style={{ fontSize: 12, color: "#666" }}>
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

            {details.note ? <Info label="Note" value={details.note} /> : null}

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

function Info({ label, value }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: 12, color: "#666", fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ fontWeight: 900, marginTop: 4 }}>{value}</div>
    </div>
  );
}

/* ---------------------------------- App ---------------------------------- */

export function App() {
  const [tab, setTab] = useState("cashier");

  return (
    <div
      style={{
        fontFamily: "system-ui",
        background: "#fafafa",
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          background: "#fff",
          borderBottom: "1px solid #eee",
          padding: "14px 16px",
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18 }}>Café POS</div>

          <nav style={{ display: "flex", gap: 8 }}>
            <Tab active={tab === "cashier"} onClick={() => setTab("cashier")}>
              Cashier
            </Tab>
            <Tab active={tab === "orders"} onClick={() => setTab("orders")}>
              Orders
            </Tab>
            <Tab active={tab === "products"} onClick={() => setTab("products")}>
              Products
            </Tab>
          </nav>

          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: "#666" }}>API: /api</div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: 16,
          display: "grid",
          gap: 14,
        }}
      >
        {tab === "cashier" ? (
          <Cashier />
        ) : tab === "orders" ? (
          <OrdersHistory />
        ) : (
          <ProductsAdmin />
        )}
      </main>
    </div>
  );
}

function Tab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #ddd",
        background: active ? "#111" : "#fff",
        color: active ? "#fff" : "#111",
        cursor: "pointer",
        fontWeight: 800,
      }}
    >
      {children}
    </button>
  );
}

const card = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 12,
};

const errorBox = {
  padding: 12,
  border: "1px solid #f2c2c2",
  borderRadius: 12,
  color: "#b00020",
  background: "#fff",
};

const th = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  color: "#555",
  borderBottom: "1px solid #eee",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const td = {
  padding: "12px",
  fontSize: 14,
  color: "#111",
  whiteSpace: "nowrap",
  verticalAlign: "top",
};

const listHeader = {
  background: "#fbfbfb",
  padding: "10px 12px",
  fontWeight: 900,
  fontSize: 12,
  color: "#555",
};

const productRowBtn = {
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "#fff",
  padding: 12,
  cursor: "pointer",
  borderTop: "1px solid #eee",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
};

const qtyInput = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  outline: "none",
};
