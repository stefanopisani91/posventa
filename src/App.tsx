import { Link, Route, Routes } from "react-router";
import { PublicLayout, StaffLayout } from "./components/Layout.tsx";
import { useI18n } from "./i18n/i18n.ts";
import { HomePage } from "./pages/customer/HomePage.tsx";
import { OrderPage } from "./pages/customer/OrderPage.tsx";
import { TrackPage } from "./pages/customer/TrackPage.tsx";
import { ClaimDetailPage } from "./pages/staff/ClaimDetailPage.tsx";
import { ClaimsPage } from "./pages/staff/ClaimsPage.tsx";
import { LoginPage } from "./pages/staff/LoginPage.tsx";
import { StatsPage } from "./pages/staff/StatsPage.tsx";

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="container narrow">
      <h1>404</h1>
      <Link to="/" className="btn btn--primary">
        {t("nav.returns")}
      </Link>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="order" element={<OrderPage />} />
        <Route path="track" element={<TrackPage />} />
        <Route path="track/:code" element={<TrackPage />} />
        <Route path="staff/login" element={<LoginPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="staff" element={<StaffLayout />}>
        <Route index element={<ClaimsPage />} />
        <Route path="claims/:id" element={<ClaimDetailPage />} />
        <Route path="stats" element={<StatsPage />} />
      </Route>
    </Routes>
  );
}
