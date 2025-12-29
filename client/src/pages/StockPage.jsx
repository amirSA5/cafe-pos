import { useEffect, useMemo, useState } from "preact/hooks";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return v.toFixed(2);
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

// ─────────────────────────────────────────────────────────────────────────────
// XLS Export (Excel-readable HTML table saved as .xls)
// ─────────────────────────────────────────────────────────────────────────────
function escHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toXlsHtml(rows) {
  const header = [
    "Date",
    "Type",
    "Product",
    "Category",
    "Qty",
    "Unit cost",
    "Supplier",
    "Note",
  ];

  const body = rows
    .map((r) => {
      const date = r.createdAt ? new Date(r.createdAt).toLocaleString() : "";
      const type = r.type || "";
      const product = r.productId?.name || "";
      const category = r.productId?.category || "";
      const qty = r.qty ?? "";
      const unitCost = r.unitCost ?? 0;
      const supplier = r.supplier || "";
      const note = r.note || "";

      return `
        <tr>
          <td>${escHtml(date)}</td>
          <td>${escHtml(type)}</td>
          <td>${escHtml(product)}</td>
          <td>${escHtml(category)}</td>
          <td>${escHtml(qty)}</td>
          <td>${escHtml(unitCost)}</td>
          <td>${escHtml(supplier)}</td>
          <td>${escHtml(note)}</td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body>
  <table border="1">
    <thead>
      <tr>${header.map((h) => `<th>${escHtml(h)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${body}
    </tbody>
  </table>
</body>
</html>`;
}

function downloadXls(filename, html) {
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function RestockForm({ products, onCancel, onDone }) {
  const [productId, setProductId] = useState(products?.[0]?._id || "");
  const [qty, setQty] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [updateCost, setUpdateCost] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");

    const q = parseInt(qty, 10);
    if (!productId) return setErr("Select a product.");
    if (!Number.isFinite(q) || q < 1) return setErr("qty must be >= 1");

    const c = unitCost === "" ? null : Number(unitCost);
    if (c != null && (!Number.isFinite(c) || c < 0))
      return setErr("unitCost must be >= 0");

    setSaving(true);
    try {
      await api.stock.restock({
        productId,
        qty: q,
        unitCost: c,
        updateCost,
        supplier,
        note,
      });
      onDone();
    } catch (e2) {
      setErr(e2.message || "Restock failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      {err && <ErrorBox>{err}</ErrorBox>}

      <Select
        label="Product"
        value={productId}
        onChange={setProductId}
        options={products.map((p) => ({
          value: p._id,
          label: `${p.name} (${p.category})`,
        }))}
      />

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <Input label="Qty" value={qty} onInput={setQty} type="number" />
        <Input
          label="Unit cost (optional)"
          value={unitCost}
          onInput={setUnitCost}
          type="number"
        />
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={updateCost}
          onChange={(e) => setUpdateCost(e.target.checked)}
        />
        <span style={{ fontWeight: 900 }}>
          Update product cost with this unit cost
        </span>
      </label>

      <Input
        label="Supplier (optional)"
        value={supplier}
        onInput={setSupplier}
        placeholder="Supplier name"
      />
      <Input
        label="Note (optional)"
        value={note}
        onInput={setNote}
        placeholder="Invoice ref / comments"
      />

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Restock"}
        </Button>
      </div>
    </form>
  );
}

export function StockPage() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [productId, setProductId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      // products (admin)
      const p = await api.products.list({ limit: 500 });
      setProducts(p.items || []);

      // movements
      const m = await api.stock.movements({ limit: 50, productId });
      setMovements(m.items || []);
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function loadMovements() {
    setLoading(true);
    setErr("");
    try {
      const m = await api.stock.movements({ limit: 50, productId });
      setMovements(m.items || []);
    } catch (e) {
      setErr(e.message || "Failed to load movements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    // refresh movements when filter changes
    loadMovements();
  }, [productId]);

  const productOptions = useMemo(() => {
    return [
      { value: "", label: "All products" },
      ...products.map((p) => ({
        value: p._id,
        label: `${p.name} (${p.category})`,
      })),
    ];
  }, [products]);

  function exportXls() {
    const html = toXlsHtml(movements);
    const filename = `stock_movements_${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;
    downloadXls(filename, html);
  }

  return (
    <section style={card}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 16 }}>Stock</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="secondary"
            onClick={exportXls}
            disabled={!movements.length}
          >
            Export XLS
          </Button>
          <Button onClick={() => setModalOpen(true)}>+ Restock</Button>
        </div>
      </div>

      <div
        style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr auto" }}
      >
        <Select
          label="Filter"
          value={productId}
          onChange={setProductId}
          options={productOptions}
        />
        <div style={{ alignSelf: "end" }}>
          <Button
            variant="secondary"
            onClick={loadMovements}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {err && <ErrorBox>{err}</ErrorBox>}

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
          Stock movements
        </div>
        <table>
          <thead>
            <tr style={{ background: "#fff" }}>
              <th style={th}>Date</th>
              <th style={th}>Type</th>
              <th style={th}>Product</th>
              <th style={th}>Category</th>
              <th style={th}>Qty</th>
              <th style={th}>Unit cost</th>
              <th style={th}>Supplier</th>
              <th style={th}>Note</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={td} colSpan={8}>
                  Loading...
                </td>
              </tr>
            ) : movements.length ? (
              movements.map((m) => (
                <tr key={m._id}>
                  <td style={td}>{new Date(m.createdAt).toLocaleString()}</td>
                  <td style={td}>{m.type}</td>
                  <td style={td}>
                    <b>{m.productId?.name || "-"}</b>
                  </td>
                  <td style={td}>{m.productId?.category || "-"}</td>
                  <td style={td}>{m.qty}</td>
                  <td style={td}>{money(m.unitCost ?? 0)}</td>
                  <td style={td}>{m.supplier || "-"}</td>
                  <td style={td}>{m.note || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={td} colSpan={8}>
                  No movements.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title="Restock"
        onClose={() => setModalOpen(false)}
      >
        <RestockForm
          products={products}
          onCancel={() => setModalOpen(false)}
          onDone={() => {
            setModalOpen(false);
            loadAll();
          }}
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
