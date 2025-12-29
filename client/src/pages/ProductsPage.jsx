import { useEffect, useMemo, useState } from "preact/hooks";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return v.toFixed(2);
}

function numOrNaN(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
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

function ProductForm({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [price, setPrice] = useState(
    initial?.price != null ? String(initial.price) : ""
  );
  const [sku, setSku] = useState(initial?.sku || "");
  const [active, setActive] = useState(initial?.active ?? true);

  // NEW: inventory + cost fields
  const [cost, setCost] = useState(
    initial?.cost != null ? String(initial.cost) : "0"
  );
  const [stockQty, setStockQty] = useState(
    initial?.stockQty != null ? String(initial.stockQty) : "0"
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initial?.lowStockThreshold != null ? String(initial.lowStockThreshold) : "0"
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    const p = numOrNaN(price);
    const c = numOrNaN(cost);
    const s = numOrNaN(stockQty);
    const l = numOrNaN(lowStockThreshold);

    if (!name.trim() || !category.trim())
      return setError("Name and category are required.");
    if (!Number.isFinite(p) || p < 0)
      return setError("Price must be a non-negative number.");
    if (!Number.isFinite(c) || c < 0)
      return setError("Cost must be a non-negative number.");
    if (!Number.isFinite(s) || s < 0)
      return setError("Stock qty must be a non-negative number.");
    if (!Number.isFinite(l) || l < 0)
      return setError("Low-stock threshold must be a non-negative number.");

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        category: category.trim(),
        price: p,
        sku: sku.trim(),
        active: Boolean(active),

        cost: c,
        stockQty: s,
        lowStockThreshold: l,
      });
    } catch (err) {
      setError(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      {error && <ErrorBox>{error}</ErrorBox>}

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

      <div
        style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr" }}
      >
        <Input
          label="Cost"
          value={cost}
          onInput={setCost}
          placeholder="0"
          type="number"
        />
        <Input
          label="Stock qty"
          value={stockQty}
          onInput={setStockQty}
          placeholder="0"
          type="number"
        />
        <Input
          label="Low-stock threshold"
          value={lowStockThreshold}
          onInput={setLowStockThreshold}
          placeholder="0"
          type="number"
        />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <span style={{ fontWeight: 900 }}>Active</span>
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

export function ProductsPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

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

  async function onSave(payload) {
    if (editing?._id) await api.products.update(editing._id, payload);
    else await api.products.create(payload);

    setModalOpen(false);
    setEditing(null);
    await load();
  }

  function onAskDelete(p) {
    setDeleting(p);
    setConfirmOpen(true);
  }

  async function onConfirmDelete() {
    if (!deleting?._id) return;
    setDeletingBusy(true);
    try {
      await api.products.remove(deleting._id);
      setConfirmOpen(false);
      setDeleting(null);
      await load();
    } catch (e) {
      alert(e.message || "Delete failed");
    } finally {
      setDeletingBusy(false);
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
        <div style={{ fontWeight: 950, fontSize: 16 }}>Products</div>
        <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
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
              <th style={th}>Name</th>
              <th style={th}>Category</th>
              <th style={th}>Price</th>
              <th style={th}>Cost</th>
              <th style={th}>Stock</th>
              <th style={th}>Low</th>
              <th style={th}>SKU</th>
              <th style={th}>Active</th>
              <th style={{ ...th, width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={td} colSpan={9}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td style={td} colSpan={9}>
                  No products found.
                </td>
              </tr>
            ) : (
              items.map((p) => {
                const low =
                  Number(p.lowStockThreshold || 0) > 0 &&
                  Number(p.stockQty || 0) <= Number(p.lowStockThreshold || 0);

                return (
                  <tr key={p._id}>
                    <td style={td}>{p.name}</td>
                    <td style={td}>{p.category}</td>
                    <td style={td}>{money(p.price)}</td>
                    <td style={td}>{money(p.cost ?? 0)}</td>
                    <td
                      style={{
                        ...td,
                        color: low ? "#b00020" : td.color,
                        fontWeight: low ? 950 : 700,
                      }}
                    >
                      {p.stockQty ?? 0}
                    </td>
                    <td style={td}>{p.lowStockThreshold ?? 0}</td>
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
                        <Button variant="danger" onClick={() => onAskDelete(p)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete product"
        message={
          deleting
            ? `Delete "${deleting.name}"? This cannot be undone.`
            : "Delete this product?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        danger
        loading={deletingBusy}
        onCancel={() => {
          if (deletingBusy) return;
          setConfirmOpen(false);
          setDeleting(null);
        }}
        onConfirm={onConfirmDelete}
      />

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
