import { useEffect, useMemo, useState } from "preact/hooks";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

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

function SupplierForm({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [note, setNote] = useState(initial?.note || "");
  const [active, setActive] = useState(initial?.active ?? true);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");

    if (!name.trim()) return setErr("Name is required.");

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        note: note.trim(),
        active: Boolean(active),
      });
    } catch (e2) {
      setErr(e2.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      {err && <ErrorBox>{err}</ErrorBox>}

      <Input
        label="Name"
        value={name}
        onInput={setName}
        placeholder="Supplier name"
      />

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <Input
          label="Phone"
          value={phone}
          onInput={setPhone}
          placeholder="+216 ..."
        />
        <Input
          label="Email"
          value={email}
          onInput={setEmail}
          placeholder="email@example.com"
        />
      </div>

      <Input
        label="Address"
        value={address}
        onInput={setAddress}
        placeholder="Address"
      />
      <Input
        label="Note"
        value={note}
        onInput={setNote}
        placeholder="Optional"
      />

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

export function SuppliersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.suppliers.list({ search, active, limit: 500 });
      setItems(res.items || []);
    } catch (e) {
      setErr(e.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(payload) {
    if (editing?._id) await api.suppliers.update(editing._id, payload);
    else await api.suppliers.create(payload);

    setModalOpen(false);
    setEditing(null);
    await load();
  }

  function askDelete(s) {
    setDeleting(s);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!deleting?._id) return;
    setDeletingBusy(true);
    try {
      await api.suppliers.remove(deleting._id);
      setConfirmOpen(false);
      setDeleting(null);
      await load();
    } catch (e) {
      alert(e.message || "Delete failed");
    } finally {
      setDeletingBusy(false);
    }
  }

  const total = useMemo(() => items.length, [items]);

  return (
    <section style={card}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 16 }}>Suppliers</div>
        <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
          Total: <b>{total}</b>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "2fr 1fr auto",
        }}
      >
        <Input
          label="Search"
          value={search}
          onInput={setSearch}
          placeholder="Search by name..."
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
        <div
          style={{
            alignSelf: "end",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            + New supplier
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
              <th style={th}>Name</th>
              <th style={th}>Phone</th>
              <th style={th}>Email</th>
              <th style={th}>Active</th>
              <th style={{ ...th, width: 220 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={td} colSpan={5}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td style={td} colSpan={5}>
                  No suppliers.
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr key={s._id}>
                  <td style={td}>
                    <b>{s.name}</b>
                    {s.address ? (
                      <div
                        style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}
                      >
                        {s.address}
                      </div>
                    ) : null}
                  </td>
                  <td style={td}>{s.phone || "-"}</td>
                  <td style={td}>{s.email || "-"}</td>
                  <td style={td}>{s.active ? "Yes" : "No"}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditing(s);
                          setModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="danger" onClick={() => askDelete(s)}>
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

      <ConfirmDialog
        open={confirmOpen}
        title="Delete supplier"
        message={
          deleting
            ? `Delete "${deleting.name}"? This cannot be undone.`
            : "Delete this supplier?"
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
        onConfirm={confirmDelete}
      />

      <Modal
        open={modalOpen}
        title={editing ? `Edit: ${editing.name}` : "New supplier"}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      >
        <SupplierForm
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
