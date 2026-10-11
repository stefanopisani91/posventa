import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import type { SessionResponse } from "../../shared/api-types.ts";
import { LEGAL_RULES } from "../../shared/legal-rules.ts";
import { SHOP_POLICY } from "../../shared/shop-policy.ts";
import { api } from "../api.ts";
import { useApi } from "../hooks.ts";
import { useI18n } from "../i18n/i18n.ts";
import { Icon } from "./Icon.tsx";
import { LanguageSelect } from "./LanguageSelect.tsx";
import { Logo } from "./Logo.tsx";
import { ErrorState, Loading } from "./ui.tsx";

const REPO_URL: string =
  (import.meta.env.VITE_REPO_URL as string | undefined) ?? "https://github.com/stefanopisani91/posventa";
const AUTHOR_NAME = "Stefano Pisani";
const AUTHOR_URL = "https://github.com/stefanopisani91";
const CEC_URL =
  "https://portal-cec.consumo.gob.es/sites/default/files/documentos/FOLLETO_DERECHO_DESISTIMIENTO_JULIO_2026.pdf";

function Brand({ to, staff = false }: { to: string; staff?: boolean }) {
  return (
    <Link to={to} className="brand">
      <Logo size={36} decorative />
      <span className="brand__text">
        <span className="brand__shop">{SHOP_POLICY.name}</span>
        <span className="brand__product">
          Posventa
          {staff && <span className="brand__staff">Staff</span>}
        </span>
      </span>
    </Link>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Logo size={32} decorative />
          <div>
            <p className="footer__name">{SHOP_POLICY.name} · Posventa</p>
            <p>{t("footer.about")}</p>
          </div>
        </div>
        <div>
          <p className="footer__heading">{t("footer.sources")}</p>
          <ul>
            <li>
              <a href={LEGAL_RULES.lawReference.url} target="_blank" rel="noreferrer">
                {t("footer.law")} <Icon name="external" size={12} />
              </a>
            </li>
            <li>
              <a href={CEC_URL} target="_blank" rel="noreferrer">
                {t("footer.cec")} <Icon name="external" size={12} />
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="container footer__legal">
        <p>{t("footer.demo")}</p>
        <p>{t("footer.legal")}</p>
        <p>
          {t("footer.builtWith")}{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            {t("footer.code")} <Icon name="external" size={12} />
          </a>
        </p>
        <p className="footer__credit">
          {t("footer.credit")}{" "}
          <a href={AUTHOR_URL} target="_blank" rel="noreferrer">
            {AUTHOR_NAME} <Icon name="external" size={12} />
          </a>
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
          <nav className="topnav" aria-label={t("nav.landmark.main")}>
            <NavLink to="/" end>
              {t("nav.returns")}
            </NavLink>
            <NavLink to="/track">{t("nav.track")}</NavLink>
            <NavLink to="/staff">
              <Icon name="lock" size={14} />
              {t("nav.staff")}
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="main" className="main">
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
          <nav className="topnav" aria-label={t("nav.landmark.staff")}>
            <NavLink to="/staff" end>
              <Icon name="list" size={16} />
              {t("nav.claims")}
            </NavLink>
            <NavLink to="/staff/stats">
              <Icon name="chart" size={16} />
              {t("nav.stats")}
            </NavLink>
            <a href="/" className="topnav__secondary">
              <Icon name="store" size={16} />
              {t("nav.customerSite")}
            </a>
          </nav>
          <div className="topbar__actions">
            <button type="button" className="btn btn--small btn--ghost" onClick={() => void logout()} aria-label={t("nav.logout")}>
              <Icon name="logout" size={16} />
              <span className="btn__label">{t("nav.logout")}</span>
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="main">
        <div className="container">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
