import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import type { DemoInfoResponse, OrderLookupResponse } from "../../../shared/api-types.ts";
import { LEGAL_RULES } from "../../../shared/legal-rules.ts";
import { ApiError, api } from "../../api.ts";
import { Icon } from "../../components/Icon.tsx";
import { Alert, Field } from "../../components/ui.tsx";
import { errorMessage } from "../../errors.ts";
import { useApi, useTitle } from "../../hooks.ts";
import { useI18n } from "../../i18n/i18n.ts";
import { saveLookup } from "./lookup-storage.ts";

export function HomePage() {
  const { t } = useI18n();
  useTitle("home.title");
  const navigate = useNavigate();
  const demo = useApi<DemoInfoResponse>("/api/demo");
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  const invalid = error instanceof ApiError ? error.fields : [];
  const rules = LEGAL_RULES;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const order = await api.post<OrderLookupResponse>("/api/orders/lookup", { orderNumber, email });
      const credentials = { orderNumber: order.orderNumber, email: email.trim().toLowerCase() };
      saveLookup(credentials);
      navigate("/order", { state: { credentials, order } });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="home">
      <section className="hero">
        <h1>{t("home.title")}</h1>
        <p className="lead">
          {t("home.lead", { days: rules.withdrawal.days, years: rules.warranty.years })}
        </p>
      </section>

      <div className="home__grid">
        <section className="card lookup" aria-labelledby="lookup-title">
          <h2 id="lookup-title">{t("home.form.title")}</h2>
          <form onSubmit={(e) => void submit(e)} noValidate>
            <Field
              id="orderNumber"
              label={t("home.form.orderNumber")}
              hint={t("home.form.orderNumberHint")}
              error={invalid.includes("orderNumber") ? t("home.form.orderNumberHint") : undefined}
            >
              <input
                id="orderNumber"
                name="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="CG-10482"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
                aria-describedby="orderNumber-hint"
              />
            </Field>
            <Field id="email" label={t("home.form.email")} error={invalid.includes("email") ? t("error.validation_error") : undefined}>
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            {error !== undefined && invalid.length === 0 && <Alert kind="error">{errorMessage(t, error)}</Alert>}
            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              <Icon name="search" size={18} />
              {t("home.form.submit")}
            </button>
          </form>
          <p className="lookup__track">
            <Link to="/track">
              {t("home.trackCta")} <Icon name="arrowRight" size={16} />
            </Link>
          </p>
        </section>

        {demo.data?.demoMode && demo.data.showcaseOrders.length > 0 && (
          <section className="card demo-orders" aria-labelledby="demo-title">
            <h2 id="demo-title">{t("home.demo.title")}</h2>
            <p className="muted">{t("home.demo.body")}</p>
            <ul className="demo-orders__list">
              {demo.data.showcaseOrders.map((o) => (
                <li key={o.orderNumber}>
                  <button
                    type="button"
                    className="demo-order"
                    onClick={() => {
                      setOrderNumber(o.orderNumber);
                      setEmail(o.email);
                      setError(undefined);
                      document.getElementById("orderNumber")?.focus();
                    }}
                  >
                    <span className="demo-order__number">{o.orderNumber}</span>
                    <span className="demo-order__scenario">{t(`scenario.${o.scenario}`)}</span>
                    <span className="demo-order__email">{o.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section className="rights" aria-labelledby="rights-title">
        <h2 id="rights-title">{t("home.rights.title")}</h2>
        <div className="rights__grid">
          <article className="right-card">
            <Icon name="undo" size={22} />
            <h3>{t("home.rights.withdrawal.title", { days: rules.withdrawal.days })}</h3>
            <p>
              {t("home.rights.withdrawal.body", {
                days: rules.withdrawal.days,
                refundDays: rules.withdrawal.refundWithinDays,
              })}
            </p>
          </article>
          <article className="right-card">
            <Icon name="shield" size={22} />
            <h3>{t("home.rights.warranty.title", { years: rules.warranty.years })}</h3>
            <p>{t("home.rights.warranty.body", { years: rules.warranty.years })}</p>
          </article>
          <article className="right-card">
            <Icon name="info" size={22} />
            <h3>{t("home.rights.presumption.title", { years: rules.warranty.presumptionYears })}</h3>
            <p>{t("home.rights.presumption.body", { years: rules.warranty.presumptionYears })}</p>
          </article>
        </div>
      </section>
    </div>
  );
}
