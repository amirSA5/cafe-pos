import { useEffect, useMemo, useState } from "preact/hooks";
import { api } from "./lib/api";

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return v.toFixed(2);
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
    fontWeight: 600,
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
      <span style={{ fontSize: 12, color: "#444", fontWeight: 600 }}>
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
      <span style={{ fontSize: 12, color: "#444", fontWeight: 600 }}>
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
          width: "min(720px, 100%)",
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
          <div style={{ fontWeight: 800 }}>{title}</div>
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
      {error && (
        <div
          style={{
            padding: 12,
            border: "1px solid #f2c2c2",
            borderRadius: 12,
            color: "#b00020",
          }}
        >
          {error}
        </div>
      )}

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
        <span style={{ fontWeight: 700 }}>Active</span>
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

export function App() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState(""); // "", "true", "false"

  // modal
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

  async function onCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  async function onEdit(p) {
    setEditing(p);
    setModalOpen(true);
  }

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
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18 }}>Café POS — Admin</div>
          <div style={{ flex: 1 }} />
          <Button onClick={onCreate}>+ New product</Button>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: 16,
          display: "grid",
          gap: 14,
        }}
      >
        <section
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 16,
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
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
                ...categories
                  .filter(Boolean)
                  .map((c) => ({ value: c, label: c })),
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

          {err && (
            <div
              style={{
                padding: 12,
                border: "1px solid #f2c2c2",
                borderRadius: 12,
                color: "#b00020",
              }}
            >
              {err}
            </div>
          )}

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
                      <td style={{ ...td }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Button variant="secondary" onClick={() => onEdit(p)}>
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
        </section>

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
      </main>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  color: "#555",
  borderBottom: "1px solid #eee",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const td = {
  padding: "12px",
  fontSize: 14,
  color: "#111",
  whiteSpace: "nowrap",
};
