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
    "Number",
    "Supplier",
    "Status",
    "Subtotal",
    "Created at",
    "Posted at",
  ];

  const body = rows
    .map((r) => {
      const createdAt = r.createdAt
        ? new Date(r.createdAt).toLocaleString()
        : "";
      const postedAt = r.postedAt ? new Date(r.postedAt).toLocaleString() : "";
      return `
        <tr>
          <td>${escHtml(r.number)}</td>
          <td>${escHtml(r.supplierId?.name || "")}</td>
          <td>${escHtml(r.status)}</td>
          <td>${escHtml(r.subtotal ?? 0)}</td>
          <td>${escHtml(createdAt)}</td>
          <td>${escHtml(postedAt)}</td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
  <table border="1">
    <thead><tr>${header
      .map((h) => `<th>${escHtml(h)}</th>`)
      .join("")}</tr></thead>
    <tbody>${body}</tbody>
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

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create invoice form
// ─────────────────────────────────────────────────────────────────────────────
function CreateInvoiceForm({ suppliers, products, onCancel, onCreated }) {
  const [supplierId, setSupplierId] = useState(suppliers?.[0]?._id || "");
  const [note, setNote] = useState("");
  const [costMode, setCostMode] = useState("last"); // used when posting

  const [lines, setLines] = useState([
    { productId: products?.[0]?._id || "", qty: "1", unitCost: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const linePreview = useMemo(() => {
    const byId = new Map((products || []).map((p) => [String(p._id), p]));
    const valid = [];
    for (const l of lines) {
      const p = byId.get(String(l.productId));
      const qty = parseInt(l.qty || "0", 10);
      const unitCost = Number(l.unitCost);
      if (
        !p ||
        !Number.isFinite(qty) ||
        qty < 1 ||
        !Number.isFinite(unitCost) ||
        unitCost < 0
      )
        continue;
      valid.push({
        ...l,
        name: p.name,
        category: p.category,
        qty,
        unitCost,
        lineTotal: round2(qty * unitCost),
      });
    }
    const subtotal = round2(valid.reduce((s, x) => s + x.lineTotal, 0));
    return { valid, subtotal };
  }, [lines, products]);

  function updateLine(i, patch) {
    setLines((prev) =>
      prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x))
    );
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { productId: products?.[0]?._id || "", qty: "1", unitCost: "" },
    ]);
  }

  function removeLine(i) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");

    if (!supplierId) return setErr("Select a supplier.");
    if (lines.length === 0) return setErr("Add at least one line.");

    const payloadLines = [];
    for (const l of lines) {
      if (!l.productId) return setErr("Each line must have a product.");
      const qty = parseInt(l.qty || "0", 10);
      if (!Number.isFinite(qty) || qty < 1) return setErr("qty must be >= 1");

      const unitCost = Number(l.unitCost);
      if (!Number.isFinite(unitCost) || unitCost < 0)
        return setErr("unitCost must be >= 0");

      payloadLines.push({ productId: l.productId, qty, unitCost });
    }

    setSaving(true);
    try {
      const created = await api.purchaseInvoices.create({
        supplierId,
        lines: payloadLines,
        note: note.trim(),
      });

      // return created + preferred post mode
      onCreated(created, costMode);
    } catch (e2) {
      setErr(e2.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      {err && <ErrorBox>{err}</ErrorBox>}

      <Select
        label="Supplier"
        value={supplierId}
        onChange={setSupplierId}
        options={(suppliers || []).map((s) => ({
          value: s._id,
          label: s.name,
        }))}
      />

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <Select
          label="Cost update mode when posting"
          value={costMode}
          onChange={setCostMode}
          options={[
            {
              value: "last",
              label: "Last cost (set product cost = invoice unit cost)",
            },
            { value: "weighted", label: "Weighted average cost" },
          ]}
        />
        <Input
          label="Note (optional)"
          value={note}
          onInput={setNote}
          placeholder="Invoice ref, comments..."
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
          Lines
        </div>

        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          {lines.map((l, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "1.6fr .6fr .7fr auto",
                alignItems: "end",
              }}
            >
              <Select
                label={idx === 0 ? "Product" : ""}
                value={l.productId}
                onChange={(v) => updateLine(idx, { productId: v })}
                options={(products || []).map((p) => ({
                  value: p._id,
                  label: `${p.name} (${p.category})`,
                }))}
              />
              <Input
                label={idx === 0 ? "Qty" : ""}
                value={l.qty}
                onInput={(v) => updateLine(idx, { qty: v })}
                type="number"
              />
              <Input
                label={idx === 0 ? "Unit cost" : ""}
                value={l.unitCost}
                onInput={(v) => updateLine(idx, { unitCost: v })}
                type="number"
              />
              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <Button variant="secondary" onClick={addLine} type="button">
                  + Line
                </Button>
                <Button
                  variant="danger"
                  type="button"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={{ color: "#64748b", fontWeight: 800 }}>
          Subtotal preview: <b>{money(linePreview.subtotal)}</b>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={saving}
            type="button"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create draft"}
          </Button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#64748b" }}>
        After creating, you can <b>Post</b> the invoice to restock products
        automatically.
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export function PurchaseInvoicesPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [modalOpen, setModalOpen] = useState(false);

  // post flow
  const [postOpen, setPostOpen] = useState(false);
  const [posting, setPosting] = useState(null);
  const [postMode, setPostMode] = useState("last");
  const [postBusy, setPostBusy] = useState(false);

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      const [s, p, inv] = await Promise.all([
        api.suppliers.list({ active: "true" }),
        api.products.list({ limit: 1000 }),
        api.purchaseInvoices.list({ page: 1, limit: 50 }),
      ]);

      setSuppliers(s.items || []);
      setProducts(p.items || []);
      setItems(inv.items || []);
      setTotal(inv.total || 0);
    } catch (e) {
      setErr(e.message || "Failed to load purchase invoices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function exportXls() {
    const html = toXlsHtml(items);
    const filename = `purchase_invoices_${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;
    downloadXls(filename, html);
  }

  function askPost(inv, mode = "last") {
    setPosting(inv);
    setPostMode(mode);
    setPostOpen(true);
  }

  async function confirmPost() {
    if (!posting?._id) return;
    setPostBusy(true);
    try {
      await api.purchaseInvoices.post(posting._id, { costMode: postMode });
      setPostOpen(false);
      setPosting(null);
      await loadAll();
    } catch (e) {
      alert(e.message || "Post failed");
    } finally {
      setPostBusy(false);
    }
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
        <div style={{ fontWeight: 950, fontSize: 16 }}>Purchase Invoices</div>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="secondary"
            onClick={exportXls}
            disabled={!items.length}
          >
            Export XLS
          </Button>
          <Button onClick={() => setModalOpen(true)}>+ New invoice</Button>
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
              <th style={th}>Supplier</th>
              <th style={th}>Status</th>
              <th style={th}>Subtotal</th>
              <th style={th}>Created</th>
              <th style={{ ...th, width: 240 }}>Actions</th>
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
                  No invoices.
                </td>
              </tr>
            ) : (
              items.map((inv) => (
                <tr key={inv._id}>
                  <td style={td}>
                    <b>{inv.number}</b>
                  </td>
                  <td style={td}>{inv.supplierId?.name || "-"}</td>
                  <td style={td}>{inv.status}</td>
                  <td style={td}>{money(inv.subtotal)}</td>
                  <td style={td}>
                    {inv.createdAt
                      ? new Date(inv.createdAt).toLocaleString()
                      : "-"}
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {inv.status === "draft" ? (
                        <Button
                          variant="secondary"
                          onClick={() => askPost(inv, "last")}
                        >
                          Post
                        </Button>
                      ) : (
                        <Button variant="secondary" disabled>
                          Posted
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
        Total: <b>{total}</b>
      </div>

      <Modal
        open={modalOpen}
        title="New purchase invoice"
        onClose={() => setModalOpen(false)}
      >
        <CreateInvoiceForm
          suppliers={suppliers}
          products={products}
          onCancel={() => setModalOpen(false)}
          onCreated={(created, mode) => {
            setModalOpen(false);
            // immediately ask to post, using chosen mode
            askPost(created, mode || "last");
          }}
        />
      </Modal>

      <ConfirmDialog
        open={postOpen}
        title="Post invoice"
        message={
          posting
            ? `Post "${posting.number}"? This will restock products and update product costs (${postMode}).`
            : "Post this invoice?"
        }
        confirmText="Post"
        cancelText="Cancel"
        loading={postBusy}
        onCancel={() => {
          if (postBusy) return;
          setPostOpen(false);
          setPosting(null);
        }}
        onConfirm={confirmPost}
      />

      {postOpen && posting ? (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              color: "#64748b",
              fontSize: 12,
              fontWeight: 900,
              marginBottom: 6,
            }}
          >
            Cost update mode for this post
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <Select
              label="Mode"
              value={postMode}
              onChange={setPostMode}
              options={[
                { value: "last", label: "Last cost" },
                { value: "weighted", label: "Weighted average" },
              ]}
            />
            <div style={{ alignSelf: "end", color: "#64748b", fontSize: 12 }}>
              Weighted is useful when you buy the same item at different prices
              over time.
            </div>
          </div>
        </div>
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
