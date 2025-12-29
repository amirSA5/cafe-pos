import Router from "preact-router";
import { useState } from "preact/hooks";

import { Header } from "./components/layout/Header";
import { CashierPage } from "./pages/CashierPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductsPage } from "./pages/ProductsPage";

function PageShell({ children }) {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      {children}
    </main>
  );
}

export function App() {
  const [path, setPath] = useState("/");

  return (
    <div style={{ minHeight: "100vh" }}>
      <Header path={path} />
      <PageShell>
        <Router onChange={(e) => setPath(e.url)}>
          <CashierPage path="/" />
          <OrdersPage path="/orders" />
          <ProductsPage path="/products" />
        </Router>
      </PageShell>
    </div>
  );
}
