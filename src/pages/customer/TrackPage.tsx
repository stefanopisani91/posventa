import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { DemoInfoResponse, TrackingResponse } from "../../../shared/api-types.ts";
import type { ClaimStatus } from "../../../shared/domain.ts";
import { ApiError } from "../../api.ts";
import { Icon, type IconName } from "../../components/Icon.tsx";
import { Alert, ErrorState, Field, Loading, StatusBadge, TypeTag } from "../../components/ui.tsx";
import { useApi, useTitle } from "../../hooks.ts";
import { useI18n } from "../../i18n/i18n.ts";

export function TrackPage() {
  const { t } = useI18n();
  useTitle("track.title");
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code ?? "");
  const demo = useApi<DemoInfoResponse>("/api/demo");
  const claim = useApi<TrackingResponse>(code ? `/api/claims/${encodeURIComponent(code.trim().toUpperCase())}` : null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = input.trim().toUpperCase();
    if (value) navigate(`/track/${encodeURIComponent(value)}`);
  }

  const badFormat = claim.error instanceof ApiError && claim.error.code === "validation_error";

  return (
    <div className="container track">
      <header className="page-header">
        <h1>{t("track.title")}</h1>
        <p className="lead">{t("track.lead")}</p>
      </header>

      <form className="card track__form" onSubmit={submit} noValidate>
        <Field id="code" label={t("track.code")} hint={t("track.codeHint")} error={badFormat ? t("track.codeHint") : undefined}>
          <div className="input-row">
            <input
              id="code"
              className="input--code"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="PV-XXXX-XXXX"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn btn--primary">
              <Icon name="search" size={18} />
              {t("track.submit")}
            </button>
          </div>
        </Field>
        {demo.data?.demoMode && demo.data.showcaseClaimCodes.length > 0 && (
          <p className="examples">
            <span className="muted small">{t("track.examples")}:</span>
            {demo.data.showcaseClaimCodes.map((c) => (
              <Link key={c} to={`/track/${c}`} className="chip" onClick={() => setInput(c)}>
                {c}
              </Link>
            ))}
          </p>
        )}
      </form>

      {code && claim.loading && <Loading />}
      {code && claim.error !== undefined && !badFormat && <ErrorState error={claim.error} />}
      {code && claim.data && !claim.loading && <TrackingResult claim={claim.data} />}
    </div>
  );
}

const FLOW: { status: ClaimStatus; icon: IconName }[] = [
  { status: "received", icon: "message" },
  { status: "approved", icon: "check" },
  { status: "product_returned", icon: "package" },
];

function TrackingResult({ claim }: { claim: TrackingResponse }) {
  const { t, lang, date, dateTime } = useI18n();
  const reached = new Set(claim.events.map((e) => e.toStatus).filter(Boolean));
  const finalStatus = claim.closed ? claim.status : null;
  const finalIcon: IconName =
    finalStatus === "rejected" ? "x" : finalStatus === "replaced" ? "rotate" : finalStatus === "refunded" ? "undo" : "sparkle";
  const steps: { key: string; label: string; icon: IconName; done: boolean; current: boolean; rejected?: boolean }[] = [
    ...FLOW.map((s) => ({
      key: s.status,
      label: t(`status.${s.status}`),
      icon: s.icon,
      done: reached.has(s.status),
      current: claim.status === s.status,
    })),
    {
      key: "final",
      label: finalStatus ? t(`status.${finalStatus}`) : t("track.step.resolved"),
      icon: finalIcon,
      done: finalStatus !== null,
      current: finalStatus !== null,
      rejected: finalStatus === "rejected",
    },
  ];
  const hasStaffMessages = claim.events.some((e) => e.message);

  return (
    <section className="card tracking" aria-live="polite">
      <div className="tracking__head">
        <div>
          <p className="muted small">{t("track.code")}</p>
          <p className="tracking__code">{claim.code}</p>
        </div>
        <div className="tracking__badges">
          <TypeTag type={claim.type} short={false} />
          <StatusBadge status={claim.status} />
        </div>
      </div>

      <ol className="stepper" aria-label={t("track.history")}>
        {steps.map((s) => (
          <li
            key={s.key}
            className={["stepper__step", s.done ? "is-done" : "", s.current ? "is-current" : "", s.rejected ? "is-rejected" : ""].join(" ")}
            aria-current={s.current ? "step" : undefined}
          >
            <span className="stepper__dot" aria-hidden="true">
              <Icon name={s.icon} size={14} />
            </span>
            <span className="stepper__label">{s.label}</span>
          </li>
        ))}
      </ol>

      <dl className="facts facts--grid">
        <div>
          <dt>{t("track.product")}</dt>
          <dd>{claim.productName}</dd>
        </div>
        <div>
          <dt>{t("track.order")}</dt>
          <dd>{claim.orderNumber}</dd>
        </div>
        <div>
          <dt>{t("track.opened")}</dt>
          <dd>{date(claim.openedOn)}</dd>
        </div>
        <div>
          <dt>{t("track.contact")}</dt>
          <dd>{claim.maskedEmail}</dd>
        </div>
      </dl>

      {claim.closed && <Alert kind="info">{t("track.closed")}</Alert>}

      <h2 className="small-heading">{t("track.history")}</h2>
      <ol className="timeline">
        {[...claim.events].reverse().map((e, i) => (
          <li key={`${e.at}-${i}`} className="timeline__item">
            <span className="timeline__dot" aria-hidden="true">
              <Icon name={e.kind === "created" ? "message" : "check"} size={11} />
            </span>
            <div>
              <p className="timeline__title">
                {e.kind === "created" ? t("event.created") : t("event.status", { status: t(`status.${e.toStatus ?? "received"}`) })}
              </p>
              <p className="muted small">{dateTime(e.at)}</p>
              {e.message && <p className="timeline__message">{e.message}</p>}
            </div>
          </li>
        ))}
      </ol>
      {hasStaffMessages && lang !== "es" && <p className="muted small">{t("track.staffLanguage")}</p>}
    </section>
  );
}
