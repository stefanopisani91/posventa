import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import type { SessionResponse } from "../../shared/api-types.ts";
import { LEGAL_RULES } from "../../shared/legal-rules.ts";
import { SHOP_POLICY } from "../../shared/shop-policy.ts";
import { api } from "../api.ts";
import { useApi } from "../hooks.ts";
import { useI18n } from "../i18n/i18n.ts";
import { Icon } from "./Icon.tsx";
import { LanguageSelect } from "./LanguageSelect.tsx";
import { ResetDemoButton } from "./ResetDemoButton.tsx";
import { ErrorState, Loading } from "./ui.tsx";

const REPO_URL: string | undefined = import.meta.env.VITE_REPO_URL;

function Brand({ to, staff = false }: { to: string; staff?: boolean }) {
  return (
    <Link to={to} className="brand">
      <span className="brand__mark" aria-hidden="true">
        <Icon name="undo" size={18} />
      </span>
      <span className="brand__text">
        <span className="brand__shop">{SHOP_POLICY.name}</span>
        <span className="brand__product">Posventa{staff ? " · Staff" : ""}</span>
      </span>
    </Link>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p>{t("footer.demo")}</p>
        <p>
          {t("footer.legal")}{" "}
          <a href={LEGAL_RULES.lawReference.url} target="_blank" rel="noreferrer">
            {t("footer.source")}
          </a>
          {REPO_URL && (
            <>
              {" · "}
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                {t("footer.code")}
              </a>
            </>
          )}
        </p>
      </div>
    </footer>
  );
}

export function PublicLayout() {
  const { t } = useI18n();
  return (
    <div className="app">
      <header className="topbar">
        <div className="container topbar__inner">
          <Brand to="/" />
          <LanguageSelect />
          <nav className="topnav" aria-label="Main">
            <NavLink to="/" end>
              {t("nav.returns")}
            </NavLink>
            <NavLink to="/track">{t("nav.track")}</NavLink>
            <NavLink to="/staff">{t("nav.staff")}</NavLink>
          </nav>
        </div>
      </header>
      <main id="main" className="container main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

/** Staff area: checks the session, then renders the shop pages. */
export function StaffLayout() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useApi<SessionResponse>("/api/admin/session");

  if (session.loading && !session.data) {
    return (
      <div className="container main">
        <Loading />
      </div>
    );
  }
  if (session.error) {
    return (
      <div className="container main">
        <ErrorState error={session.error} onRetry={session.reload} />
      </div>
    );
  }
  if (!session.data?.authenticated) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname + location.search }} />;
  }

  async function logout() {
    await api.delete("/api/admin/session").catch(() => undefined);
    navigate("/staff/login", { replace: true });
  }

  return (
    <div className="app app--staff">
      <header className="topbar topbar--staff">
        <div className="container topbar__inner">
          <Brand to="/staff" staff />
          <LanguageSelect />
          <nav className="topnav" aria-label="Staff">
            <NavLink to="/staff" end>
              <Icon name="list" size={16} />
              {t("nav.claims")}
            </NavLink>
            <NavLink to="/staff/stats">
              <Icon name="chart" size={16} />
              {t("nav.stats")}
            </NavLink>
            <a href="/" className="topnav__secondary">
              {t("nav.customerSite")}
            </a>
          </nav>
          <div className="topbar__actions">
            <ResetDemoButton variant="compact" onDone={() => window.location.assign("/staff")} />
            <button type="button" className="btn btn--small btn--ghost" onClick={() => void logout()}>
              <Icon name="logout" size={16} />
              {t("nav.logout")}
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="container main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
