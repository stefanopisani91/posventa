import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import type { AdminClaimDetail } from "../../../shared/api-types.ts";
import type { ClaimStatus } from "../../../shared/domain.ts";
import { LEGAL_RULES } from "../../../shared/legal-rules.ts";
import { SHOP_POLICY } from "../../../shared/shop-policy.ts";
import { ApiError, api } from "../../api.ts";
import { Icon } from "../../components/Icon.tsx";
import { Alert, DueChip, Field, Loading, StatusBadge, TypeTag } from "../../components/ui.tsx";
import { errorMessage } from "../../errors.ts";
import { useApi, useTitle } from "../../hooks.ts";
import { useI18n } from "../../i18n/i18n.ts";
import { StaffError } from "./StaffError.tsx";

export function ClaimDetailPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const claim = useApi<AdminClaimDetail>(`/api/admin/claims/${id ?? ""}`);
  useTitle("detail.request");

  if (claim.error !== undefined && !claim.data) return <StaffError error={claim.error} onRetry={claim.reload} />;
  if (!claim.data) return <Loading />;
  const c = claim.data;

  return (
    <div className="detail">
      <Link to="/staff" className="back-link">
        <Icon name="arrowLeft" size={16} />
        {t("detail.back")}
      </Link>
      <header className="page-header detail__header">
        <div>
          <p className="muted small">{t("detail.request")}</p>
          <h1 className="detail__code">{c.code}</h1>
        </div>
        <div className="detail__badges">
          <TypeTag type={c.type} short={false} />
          <StatusBadge status={c.status} />
          <DueChip state={c.dueState} daysToDue={c.daysToDue} />
        </div>
      </header>

      <div className="detail__grid">
        <div className="detail__main">
          <ClaimFacts claim={c} />
          <LegalCheck claim={c} />
          <Timeline claim={c} />
        </div>
        <aside className="detail__side">
          <StatusForm claim={c} onSaved={claim.setData} onConflict={claim.reload} />
          <NoteForm claim={c} onSaved={claim.setData} />
        </aside>
      </div>
    </div>
  );
}

function ClaimFacts({ claim: c }: { claim: AdminClaimDetail }) {
  const { t, date, money } = useI18n();
  return (
    <section className="card">
      <div className="facts-grid">
        <div>
          <h2 className="small-heading">{t("detail.request")}</h2>
          <dl className="facts">
            <div>
              <dt>{t("detail.reason")}</dt>
              <dd>{t(`reason.${c.reason}`)}</dd>
            </div>
            <div>
              <dt>{t("detail.opened")}</dt>
              <dd>{date(c.openedOn)}</dd>
            </div>
            <div>
              <dt>{t("detail.due")}</dt>
              <dd>
                {date(c.dueOn)}
                <span className="muted small block">
                  {c.type === "withdrawal"
                    ? t("detail.dueWithdrawal")
                    : t("detail.dueWarranty", { days: SHOP_POLICY.warrantyResolutionTargetDays })}
                </span>
              </dd>
            </div>
          </dl>
          <h3 className="small-heading">{t("detail.description")}</h3>
          <blockquote className="quote">{c.description || <span className="muted">{t("detail.noDescription")}</span>}</blockquote>
        </div>
        <div>
          <h2 className="small-heading">{t("detail.productOrder")}</h2>
          <dl className="facts">
            <div>
              <dt>{t("claims.col.product")}</dt>
              <dd>{c.item.productName}</dd>
            </div>
            <div>
              <dt>{t("detail.sku")}</dt>
              <dd>
                <code>{c.item.sku}</code>
              </dd>
            </div>
            <div>
              <dt>{t("detail.serial")}</dt>
              <dd>
                <code>{c.item.serialNumber ?? "—"}</code>
              </dd>
            </div>
            <div>
              <dt>{t("detail.price")}</dt>
              <dd>{money(c.item.unitPriceCents)}</dd>
            </div>
            <div>
              <dt>{t("detail.order")}</dt>
              <dd>{c.order.number}</dd>
            </div>
            <div>
              <dt>{t("detail.placed")}</dt>
              <dd>{date(c.order.placedOn)}</dd>
            </div>
            <div>
              <dt>{t("detail.delivered")}</dt>
              <dd>{c.order.deliveredOn ? date(c.order.deliveredOn) : t("detail.notDelivered")}</dd>
            </div>
          </dl>
          <h2 className="small-heading">{t("detail.customer")}</h2>
          <dl className="facts">
            <div>
              <dt>{t("claims.col.customer")}</dt>
              <dd>{c.customer.name}</dd>
            </div>
            <div>
              <dt>{t("login.email")}</dt>
              <dd>{c.customer.email}</dd>
            </div>
            <div>
              <dt>{t("detail.city")}</dt>
              <dd>{c.customer.city}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function LegalCheck({ claim: c }: { claim: AdminClaimDetail }) {
  const { t, date } = useI18n();
  const { withdrawal, warranty } = c.legalAtOpening;
  let text: string;
  let ok = true;
  if (c.type === "withdrawal") {
    if (withdrawal.state === "before_delivery") text = t("detail.legal.withdrawalBefore");
    else if (withdrawal.available && withdrawal.lastDay)
      text = t("detail.legal.withdrawalOk", { days: LEGAL_RULES.withdrawal.days, date: date(withdrawal.lastDay) });
    else {
      text = t("detail.legal.outside");
      ok = false;
    }
  } else if (!warranty.available) {
    text = t("detail.legal.outside");
    ok = false;
  } else {
    text = warranty.presumptionActive
      ? t("detail.legal.presumption", { years: LEGAL_RULES.warranty.presumptionYears })
      : t("detail.legal.thirdYear");
  }
  return (
    <section className={`card legal-check ${ok ? "" : "legal-check--warn"}`}>
      <h2 className="small-heading">
        <Icon name="shield" size={16} /> {t("detail.legal")}
      </h2>
      <p>{text}</p>
      <a className="small" href={c.type === "withdrawal" ? LEGAL_RULES.withdrawal.articleUrl : LEGAL_RULES.warranty.articleUrl} target="_blank" rel="noreferrer">
        {LEGAL_RULES.lawReference.name} <Icon name="external" size={12} />
      </a>
    </section>
  );
}

function Timeline({ claim: c }: { claim: AdminClaimDetail }) {
  const { t, dateTime } = useI18n();
  return (
    <section className="card">
      <h2 className="small-heading">{t("detail.timeline")}</h2>
      <ol className="timeline">
        {[...c.events].reverse().map((e) => (
          <li key={e.id} className={`timeline__item ${e.isPublic ? "" : "timeline__item--internal"}`}>
            <span className="timeline__dot" aria-hidden="true" />
            <div>
              <p className="timeline__title">
                {e.kind === "created" && t("event.created")}
                {e.kind === "status_changed" && t("event.status", { status: t(`status.${e.toStatus ?? "received"}`) })}
                {e.kind === "internal_note" && (
                  <>
                    <Icon name="lock" size={14} /> {t("event.note")}
                  </>
                )}
              </p>
              <p className="muted small">
                {dateTime(e.at)} · {t(`actor.${e.actor}`)} ·{" "}
                {e.isPublic ? t("detail.public") : t("detail.internal")}
              </p>
              {e.message && <p className="timeline__message">{e.message}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StatusForm({
  claim: c,
  onSaved,
  onConflict,
}: {
  claim: AdminClaimDetail;
  onSaved: (claim: AdminClaimDetail) => void;
  onConflict: () => void;
}) {
  const { t } = useI18n();
  const [choice, setChoice] = useState<ClaimStatus | "">("");
  // Default to the first allowed step; reset automatically when the status changes.
  const to = choice && c.nextStatuses.includes(choice) ? choice : (c.nextStatuses[0] ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);

  if (c.nextStatuses.length === 0) {
    return (
      <section className="card">
        <h2 className="small-heading">{t("detail.actions")}</h2>
        <p className="muted">{t("detail.closed")}</p>
      </section>
    );
  }

  const rejecting = to === "rejected";
  const messageInvalid = error instanceof ApiError && error.fields.includes("message");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!to) return;
    setBusy(true);
    setError(undefined);
    setSaved(false);
    try {
      const updated = await api.post<AdminClaimDetail>(`/api/admin/claims/${c.id}/status`, {
        from: c.status,
        to,
        message: message.trim() || undefined,
      });
      setSaved(true);
      setChoice("");
      setMessage("");
      onSaved(updated);
    } catch (err) {
      setError(err);
      if (err instanceof ApiError && err.code === "status_conflict") onConflict();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card status-form">
      <h2 className="small-heading">{t("detail.actions")}</h2>
      <form onSubmit={(e) => void submit(e)} noValidate>
        <fieldset>
          <legend>{t("detail.nextStep")}</legend>
          <div className="choice-list">
            {c.nextStatuses.map((s) => (
              <label key={s} className={`choice ${to === s ? "is-selected" : ""}`}>
                <input type="radio" name="to" value={s} checked={to === s} onChange={() => setChoice(s)} />
                <StatusBadge status={s} />
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          id="status-message"
          label={t("detail.message")}
          hint={rejecting ? t("detail.messageRequired") : t("detail.messageHelp")}
          error={messageInvalid ? t("detail.messageRequired") : undefined}
        >
          <textarea
            id="status-message"
            rows={3}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required={rejecting}
            aria-describedby="status-message-hint"
          />
        </Field>
        {error !== undefined && !messageInvalid && <Alert kind="error">{errorMessage(t, error)}</Alert>}
        {saved && <Alert kind="success">{t("detail.saved")}</Alert>}
        <button type="submit" className={`btn btn--block ${rejecting ? "btn--danger" : "btn--primary"}`} disabled={busy || !to}>
          {t("detail.apply")}
        </button>
      </form>
    </section>
  );
}

function NoteForm({ claim: c, onSaved }: { claim: AdminClaimDetail; onSaved: (claim: AdminClaimDetail) => void }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      onSaved(await api.post<AdminClaimDetail>(`/api/admin/claims/${c.id}/notes`, { text }));
      setText("");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="small-heading">
        <Icon name="lock" size={14} /> {t("detail.note")}
      </h2>
      <form onSubmit={(e) => void submit(e)}>
        <Field id="note" label={t("detail.note")} hint={t("detail.noteHelp")}>
          <textarea
            id="note"
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-describedby="note-hint"
          />
        </Field>
        {error !== undefined && <Alert kind="error">{errorMessage(t, error)}</Alert>}
        <button type="submit" className="btn btn--secondary btn--block" disabled={busy || !text.trim()}>
          {t("detail.addNote")}
        </button>
      </form>
    </section>
  );
}
