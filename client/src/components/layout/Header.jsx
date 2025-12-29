import { Link } from "preact-router/match";

function TabLink({ href, active, children }) {
  return (
    <Link
      href={href}
      style={{
        padding: "8px 12px",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        background: active ? "#111827" : "#fff",
        color: active ? "#fff" : "#111827",
        fontWeight: 900,
      }}
    >
      {children}
    </Link>
  );
}

export function Header({ path }) {
  const is = (p) => (path || "/") === p;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        background: "rgba(255,255,255,.92)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #eef0f3",
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
        <div style={{ fontWeight: 950, fontSize: 18 }}>Café POS</div>

        <nav style={{ display: "flex", gap: 8 }}>
          <TabLink href="/" active={is("/")}>
            Cashier
          </TabLink>
          <TabLink href="/orders" active={is("/orders")}>
            Orders
          </TabLink>
          <TabLink href="/products" active={is("/products")}>
            Products
          </TabLink>
        </nav>

        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
          API: /api
        </div>
      </div>
    </header>
  );
}
