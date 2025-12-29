import Router from "preact-router";
import { route } from "preact-router";
import { useEffect, useState } from "preact/hooks";
import { cloneElement } from "preact";

import { Header } from "./components/layout/Header";
import { getAuth } from "./lib/auth";

import { CashierPage } from "./pages/CashierPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { UsersPage } from "./pages/UsersPage";
import { LoginPage } from "./pages/LoginPage";
import { ReceiptPage } from "./pages/ReceiptPage";
import { DashboardPage } from "./pages/DashboardPage";
import { StockPage } from "./pages/StockPage";

function PageShell({ children }) {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      {children}
    </main>
  );
}

/**
 * Guard as a router "page" wrapper.
 * IMPORTANT: It must pass route props (like :id) to its child page.
 */
function Guard({ children, roles, ...routeProps }) {
  const auth = getAuth();
  const role = auth?.user?.role;

  useEffect(() => {
    if (!auth) route("/login");
    else if (roles && !roles.includes(role)) route("/");
  }, [auth, role, roles]);

  if (!auth) return null;
  if (roles && !roles.includes(role)) return null;

  // Pass route params (e.g., id) and other router props down to the child
  return cloneElement(children, routeProps);
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
            <CashierPage />
          </Guard>

          <Guard path="/orders" roles={["admin"]}>
            <OrdersPage />
          </Guard>

          <Guard path="/products" roles={["admin"]}>
            <ProductsPage />
          </Guard>

          <Guard path="/users" roles={["admin"]}>
            <UsersPage />
          </Guard>

          <Guard path="/receipt/:id" roles={["admin", "cashier"]}>
            <ReceiptPage />
          </Guard>

          <Guard path="/dashboard" roles={["admin"]}>
            <DashboardPage />
          </Guard>

          <Guard path="/stock" roles={["admin"]}>
            <StockPage />
          </Guard>
        </Router>
      </PageShell>
    </div>
  );
}
