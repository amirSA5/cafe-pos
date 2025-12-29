import Router from "preact-router";
import { route } from "preact-router";
import { useEffect, useState } from "preact/hooks";

import { Header } from "./components/layout/Header";
import { getAuth } from "./lib/auth";

import { CashierPage } from "./pages/CashierPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { LoginPage } from "./pages/LoginPage";
import { UsersPage } from "./pages/UsersPage";

function PageShell({ children }) {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      {children}
    </main>
  );
}

function Guard({ children, roles }) {
  const auth = getAuth();
  const role = auth?.user?.role;

  useEffect(() => {
    if (!auth) route("/login");
    else if (roles && !roles.includes(role)) route("/");
  }, [auth, role, roles]);

  if (!auth) return null;
  if (roles && !roles.includes(role)) return null;
  return children;
}

export function App() {
  const [path, setPath] = useState("/");

  return (
    <div style={{ minHeight: "100vh" }}>
      <Header path={path} />
      <PageShell>
        <Router onChange={(e) => setPath(e.url)}>
          <LoginPage path="/login" />

          <Guard path="/" roles={["admin", "cashier"]}>
            <CashierPage path="/" />
          </Guard>

          <Guard path="/orders" roles={["admin"]}>
            <OrdersPage path="/orders" />
          </Guard>

          <Guard path="/products" roles={["admin"]}>
            <ProductsPage path="/products" />
          </Guard>

          <Guard path="/users" roles={["admin"]}>
            <UsersPage path="/users" />
          </Guard>
        </Router>
      </PageShell>
    </div>
  );
}
