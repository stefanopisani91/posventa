import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import type { DemoInfoResponse, SessionResponse } from "../../../shared/api-types.ts";
import { api } from "../../api.ts";
import { Icon } from "../../components/Icon.tsx";
import { ResetDemoButton } from "../../components/ResetDemoButton.tsx";
import { Alert, Field } from "../../components/ui.tsx";
import { errorMessage } from "../../errors.ts";
import { useApi, useTitle } from "../../hooks.ts";
import { useI18n } from "../../i18n/i18n.ts";

export function LoginPage() {
  const { t } = useI18n();
  useTitle("login.title");
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/staff";
  const session = useApi<SessionResponse>("/api/admin/session");
  const demo = useApi<DemoInfoResponse>("/api/demo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  if (session.data?.authenticated) return <Navigate to={from} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.post("/api/admin/session", { email, password });
      navigate(from.startsWith("/staff") && from !== "/staff/login" ? from : "/staff", { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  const credentials = demo.data?.credentials;

  return (
    <div className="login">
      <section className="card login__card" aria-labelledby="login-title">
        <h1 id="login-title">
          <Icon name="lock" size={22} /> {t("login.title")}
        </h1>
        <p className="muted">{t("login.lead")}</p>
        <form onSubmit={(e) => void submit(e)}>
          <Field id="login-email" label={t("login.email")}>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field id="login-password" label={t("login.password")}>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error !== undefined && <Alert kind="error">{errorMessage(t, error)}</Alert>}
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {t("login.submit")}
          </button>
        </form>
      </section>

      {credentials && (
        <aside className="card demo-credentials" aria-labelledby="demo-cred-title">
          <h2 id="demo-cred-title">{t("login.demo.title")}</h2>
          <p className="muted small">{t("login.demo.body")}</p>
          <dl className="facts facts--compact">
            <div>
              <dt>{t("login.email")}</dt>
              <dd>
                <code>{credentials.email}</code>
              </dd>
            </div>
            <div>
              <dt>{t("login.password")}</dt>
              <dd>
                <code>{credentials.password}</code>
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className="btn btn--secondary btn--block"
            onClick={() => {
              setEmail(credentials.email);
              setPassword(credentials.password);
            }}
          >
            {t("login.demo.use")}
          </button>
          <hr />
          <ResetDemoButton />
        </aside>
      )}
    </div>
  );
}
