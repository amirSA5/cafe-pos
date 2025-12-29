import { useEffect, useState } from "preact/hooks";
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

function cardTitleRow(title, right) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 16 }}>{title}</div>
      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
        {right}
      </div>
    </div>
  );
}

function CreateUserForm({ onCancel, onCreated }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("cashier");
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");

    if (!username.trim()) return setErr("Username is required.");
    if (password.trim().length < 6)
      return setErr("Password must be at least 6 characters.");

    setSaving(true);
    try {
      await api.users.create({
        username: username.trim(),
        password: password.trim(),
        role,
        active,
      });
      onCreated();
    } catch (e2) {
      setErr(e2.message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      {err && <ErrorBox>{err}</ErrorBox>}

      <Input
        label="Username"
        value={username}
        onInput={setUsername}
        placeholder="cashier1"
      />
      <Input
        label="Password"
        value={password}
        onInput={setPassword}
        type="password"
        placeholder="min 6 chars"
      />

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <Select
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { value: "cashier", label: "Cashier" },
            { value: "admin", label: "Admin" },
          ]}
        />
        <Select
          label="Active"
          value={active ? "true" : "false"}
          onChange={(v) => setActive(v === "true")}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create"}
        </Button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ user, onCancel, onDone }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (password.trim().length < 6)
      return setErr("Password must be at least 6 characters.");

    setSaving(true);
    try {
      await api.users.resetPassword(user.id, { password: password.trim() });
      onDone();
    } catch (e2) {
      setErr(e2.message || "Reset failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      {err && <ErrorBox>{err}</ErrorBox>}
      <div style={{ fontWeight: 900, color: "#475569" }}>
        User: {user.username}
      </div>
      <Input
        label="New password"
        value={password}
        onInput={setPassword}
        type="password"
        placeholder="min 6 chars"
      />
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Reset"}
        </Button>
      </div>
    </form>
  );
}

export function UsersPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");

  const [createOpen, setCreateOpen] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);

  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleUser, setToggleUser] = useState(null);
  const [toggleBusy, setToggleBusy] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await api.users.list({
        search,
        role,
        active,
        page: 1,
        limit: 50,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setErr(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActiveConfirm() {
    if (!toggleUser) return;
    setToggleBusy(true);
    try {
      await api.users.update(toggleUser.id, { active: !toggleUser.active });
      setToggleOpen(false);
      setToggleUser(null);
      await load();
    } catch (e) {
      alert(e.message || "Update failed");
    } finally {
      setToggleBusy(false);
    }
  }

  return (
    <section style={card}>
      {cardTitleRow("Users", `Total: ${total}`)}

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
          placeholder="username..."
        />
        <Select
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { value: "", label: "All" },
            { value: "admin", label: "Admin" },
            { value: "cashier", label: "Cashier" },
          ]}
        />
        <Select
          label="Active"
          value={active}
          onChange={setActive}
          options={[
            { value: "", label: "All" },
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
        <div
          style={{
            alignSelf: "end",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </Button>
          <Button onClick={() => setCreateOpen(true)}>+ New user</Button>
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
              <th style={th}>Username</th>
              <th style={th}>Role</th>
              <th style={th}>Active</th>
              <th style={{ ...th, width: 320 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={td} colSpan={4}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td style={td} colSpan={4}>
                  No users.
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id}>
                  <td style={td}>
                    <b>{u.username}</b>
                  </td>
                  <td style={td}>{u.role}</td>
                  <td style={td}>{u.active ? "Yes" : "No"}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setResetUser(u);
                          setResetOpen(true);
                        }}
                      >
                        Reset password
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => {
                          setToggleUser(u);
                          setToggleOpen(true);
                        }}
                      >
                        {u.active ? "Deactivate" : "Activate"}
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
        open={createOpen}
        title="Create user"
        onClose={() => setCreateOpen(false)}
      >
        <CreateUserForm
          onCancel={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      </Modal>

      <Modal
        open={resetOpen}
        title="Reset password"
        onClose={() => {
          setResetOpen(false);
          setResetUser(null);
        }}
      >
        {resetUser ? (
          <ResetPasswordForm
            user={resetUser}
            onCancel={() => {
              setResetOpen(false);
              setResetUser(null);
            }}
            onDone={() => {
              setResetOpen(false);
              setResetUser(null);
              alert("Password updated.");
            }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={toggleOpen}
        title={toggleUser?.active ? "Deactivate user" : "Activate user"}
        message={
          toggleUser
            ? `${toggleUser?.active ? "Deactivate" : "Activate"} "${
                toggleUser.username
              }"?`
            : "Continue?"
        }
        confirmText={toggleUser?.active ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        loading={toggleBusy}
        onCancel={() => {
          if (toggleBusy) return;
          setToggleOpen(false);
          setToggleUser(null);
        }}
        onConfirm={toggleActiveConfirm}
      />
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
