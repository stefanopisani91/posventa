import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router";
import type { CreateClaimResponse, OrderItemView, OrderLookupResponse } from "../../../shared/api-types.ts";
import { daysBetween, type IsoDate } from "../../../shared/dates.ts";
import { reasonsFor, type ClaimReason, type ClaimType } from "../../../shared/domain.ts";
import { LEGAL_RULES } from "../../../shared/legal-rules.ts";
import { SHOP_POLICY } from "../../../shared/shop-policy.ts";
import { ApiError, api } from "../../api.ts";
import { CATEGORY_ICON } from "../../components/category-icons.ts";
import { Icon } from "../../components/Icon.tsx";
import { Alert, CopyButton, ErrorState, Field, Loading, StatusBadge, TypeTag } from "../../components/ui.tsx";
import { errorMessage } from "../../errors.ts";
import { useTitle } from "../../hooks.ts";
import { useI18n } from "../../i18n/i18n.ts";
import { loadLookup, type LookupCredentials } from "./lookup-storage.ts";

interface LocationState {
  credentials?: LookupCredentials;
  order?: OrderLookupResponse;
}

export function OrderPage() {
  const { t, date } = useI18n();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const [credentials] = useState(() => state.credentials ?? loadLookup());
  const [order, setOrder] = useState<OrderLookupResponse | undefined>(state.order);
  const [error, setError] = useState<unknown>();
  const [form, setForm] = useState<{ itemId: number; type: ClaimType }>();
  const [created, setCreated] = useState<{ itemId: number; claim: CreateClaimResponse }>();
  useTitle("order.title", { number: order?.orderNumber ?? credentials?.orderNumber ?? "" });

  const refresh = useCallback(async () => {
    if (!credentials) return;
    try {
      setOrder(await api.post<OrderLookupResponse>("/api/orders/lookup", credentials));
      setError(undefined);
    } catch (err) {
      setError(err);
    }
  }, [credentials]);

  // First load (when we did not arrive here with the order already fetched).
  useEffect(() => {
    if (state.order || !credentials) return;
    let cancelled = false;
    api.post<OrderLookupResponse>("/api/orders/lookup", credentials).then(
      (result) => {
        if (!cancelled) setOrder(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(err);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [credentials, state.order]);

  if (!credentials) {
    return (
      <div className="container narrow">
        <Alert kind="info">{t("order.lookupAgain")}</Alert>
        <Link to="/" className="btn btn--primary">
          {t("order.another")}
        </Link>
      </div>
    );
  }
  if (error && !order) {
    return (
      <div className="container">
        <ErrorState error={error} onRetry={() => void refresh()} />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="container">
        <Loading />
      </div>
    );
  }

  return (
    <div className="container order">
      <Link to="/" className="back-link">
        <Icon name="arrowLeft" size={16} />
        {t("order.another")}
      </Link>
      <header className="page-header order__header">
        <div>
          <h1>{t("order.title", { number: order.orderNumber })}</h1>
          <p className="lead">{t("order.hello", { name: order.customerFirstName })}</p>
        </div>
        <ul className="order__meta">
          <li>
            <Icon name="calendar" size={16} /> {t("order.placed", { date: date(order.placedOn) })}
          </li>
          <li className={order.deliveredOn ? "order__meta--delivered" : ""}>
            {order.deliveredOn ? (
              <>
                <Icon name="package" size={16} /> {t("order.delivered", { date: date(order.deliveredOn) })}
              </>
            ) : (
              <>
                <Icon name="truck" size={16} /> {t("order.inTransit")}
              </>
            )}
          </li>
        </ul>
      </header>

      <ul className="items">
        {order.items.map((item) => (
          <li key={item.id} className="card item">
            <ItemHeader item={item} />
            <Rights item={item} deliveredOn={order.deliveredOn} today={order.today} />
            {item.claims.length > 0 && <ItemClaims item={item} />}
            {created?.itemId === item.id ? (
              <Created claim={created.claim} />
            ) : form?.itemId === item.id ? (
              <ClaimForm
                item={item}
                type={form.type}
                credentials={credentials}
                onCancel={() => setForm(undefined)}
                onCreated={(claim) => {
                  setForm(undefined);
                  setCreated({ itemId: item.id, claim });
                  void refresh();
                }}
              />
            ) : (
              <ItemActions
                item={item}
                onStart={(type) => {
                  setCreated(undefined);
                  setForm({ itemId: item.id, type });
                }}
              />
            )}
          </li>
        ))}
      </ul>
      <p className="muted small note-line">
        <Icon name="info" size={14} /> {t("order.weekendNote")}
      </p>
    </div>
  );
}

function ItemHeader({ item }: { item: OrderItemView }) {
  const { t, money } = useI18n();
  return (
    <div className="item__header">
      <span className={`item__icon item__icon--${item.category}`} aria-hidden="true">
        <Icon name={CATEGORY_ICON[item.category]} size={24} />
      </span>
      <div className="item__title">
        <h2 className="item__name">{item.productName}</h2>
        <p className="muted small">
          {t(`category.${item.category}`)} · {t("order.qty", { n: item.quantity })}
        </p>
      </div>
      <p className="item__price">{money(item.unitPriceCents)}</p>
    </div>
  );
}

function Rights({ item, deliveredOn, today }: { item: OrderItemView; deliveredOn: IsoDate | null; today: IsoDate }) {
  const { t, tn, date } = useI18n();
  const { withdrawal, warranty } = item.eligibility;
  const returned = item.claims.some((c) => c.type === "withdrawal" && c.status === "refunded");

  // Time meters: how far into each legal window we are.
  const wTotal = deliveredOn && withdrawal.lastDay ? daysBetween(deliveredOn, withdrawal.lastDay) : 0;
  const wDay = deliveredOn ? Math.min(wTotal, Math.max(0, daysBetween(deliveredOn, today))) : 0;
  const yTotal = LEGAL_RULES.warranty.years;
  const yElapsed = deliveredOn ? daysBetween(deliveredOn, today) / 365.25 : 0;
  const yYear = Math.min(yTotal, Math.floor(yElapsed) + 1);
  const presumptionShare = (LEGAL_RULES.warranty.presumptionYears / yTotal) * 100;
  const todayPct = Math.min(100, (yElapsed / yTotal) * 100);
  // Severity of the withdrawal meter: calm, due soon, last day.
  const wSeverity =
    withdrawal.daysLeft === 0 ? "meter--last" : (withdrawal.daysLeft ?? 99) <= SHOP_POLICY.dueSoonDays ? "meter--soon" : "";

  return (
    <div className="rights-panels">
      <section className={`right-panel ${withdrawal.available && !returned ? "right-panel--open" : "right-panel--closed"}`}>
        <h3>
          <Icon name="undo" size={16} /> {t("rights.withdrawal")}
        </h3>
        {withdrawal.state === "before_delivery" && (
          <p>{t("rights.withdrawal.beforeDelivery", { days: LEGAL_RULES.withdrawal.days })}</p>
        )}
        {withdrawal.state === "open" && withdrawal.lastDay && (
          <>
            <p className="right-panel__date">{t("rights.withdrawal.until", { date: date(withdrawal.lastDay) })}</p>
            <div className={`meter ${wSeverity}`} aria-hidden="true">
              <span className="meter__fill" style={{ width: `${(wDay / Math.max(1, wTotal)) * 100}%` }} />
            </div>
            <p className="right-panel__left">
              <span>{t("rights.dayOf", { n: wDay, total: wTotal })}</span>
              <span className="right-panel__badge">
                <Icon name="clock" size={13} />
                {withdrawal.daysLeft === 0 ? t("rights.withdrawal.lastDay") : tn("rights.withdrawal.left", withdrawal.daysLeft ?? 0)}
              </span>
            </p>
          </>
        )}
        {withdrawal.state === "expired" && withdrawal.lastDay && (
          <p>{t("rights.withdrawal.expired", { date: date(withdrawal.lastDay) })}</p>
        )}
      </section>

      <section className={`right-panel right-panel--warranty ${warranty.available && !returned ? "right-panel--open" : "right-panel--closed"}`}>
        <h3>
          <Icon name="shield" size={16} /> {t("rights.warranty")}
        </h3>
        {warranty.state === "before_delivery" && <p>{t("rights.warranty.beforeDelivery")}</p>}
        {warranty.state === "open" && warranty.endsOn && warranty.presumptionEndsOn && (
          <>
            <p className="right-panel__date">{t("rights.warranty.until", { date: date(warranty.endsOn) })}</p>
            <div className="meter meter--split" aria-hidden="true">
              <span className="meter__segment meter__segment--presumed" style={{ width: `${presumptionShare}%` }} />
              <span className="meter__segment meter__segment--proof" style={{ width: `${100 - presumptionShare}%` }} />
              <span className="meter__marker" style={{ left: `clamp(6px, ${todayPct}%, calc(100% - 6px))` }}>
                <span className="meter__marker-label">{t("rights.today")}</span>
              </span>
            </div>
            <p className="right-panel__left">
              <span>{t("rights.yearOf", { n: yYear, total: yTotal })}</span>
              <span className="meter__legend">
                <i className="meter__dot meter__dot--presumed" /> {t("rights.meter.presumed")}
                <i className="meter__dot meter__dot--proof" /> {t("rights.meter.proof")}
              </span>
            </p>
            <p className="small">
              {warranty.presumptionActive
                ? t("rights.warranty.presumption", { date: date(warranty.presumptionEndsOn) })
                : t("rights.warranty.noPresumption", { date: date(warranty.presumptionEndsOn) })}
            </p>
          </>
        )}
        {warranty.state === "expired" && warranty.endsOn && (
          <p>{t("rights.warranty.expired", { date: date(warranty.endsOn) })}</p>
        )}
      </section>
    </div>
  );
}

function ItemClaims({ item }: { item: OrderItemView }) {
  const { t, date } = useI18n();
  return (
    <div className="item-claims">
      <h3 className="small-heading">{t("order.claims")}</h3>
      <ul>
        {item.claims.map((c) => (
          <li key={c.code}>
            <Link to={`/track/${c.code}`} className="code-link">
              {c.code}
            </Link>
            <TypeTag type={c.type} />
            <StatusBadge status={c.status} />
            <span className="muted small">{date(c.openedOn, "short")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemActions({ item, onStart }: { item: OrderItemView; onStart: (type: ClaimType) => void }) {
  const { t } = useI18n();
  const returned = item.claims.some((c) => c.type === "withdrawal" && c.status === "refunded");
  if (returned) return <Alert kind="info">{t("order.returned")}</Alert>;
  if (item.hasOpenClaim) return <Alert kind="info">{t("order.openClaim")}</Alert>;
  const { withdrawal, warranty } = item.eligibility;
  if (!withdrawal.available && !warranty.available) return null;
  return (
    <div className="item__actions">
      {withdrawal.available && (
        <button type="button" className="btn btn--primary" onClick={() => onStart("withdrawal")}>
          <Icon name="undo" size={16} />
          {t("order.action.withdrawal")}
        </button>
      )}
      {warranty.available && (
        <button type="button" className="btn btn--secondary" onClick={() => onStart("warranty")}>
          <Icon name="shield" size={16} />
          {t("order.action.warranty")}
        </button>
      )}
    </div>
  );
}

function ClaimForm({
  item,
  type,
  credentials,
  onCancel,
  onCreated,
}: {
  item: OrderItemView;
  type: ClaimType;
  credentials: LookupCredentials;
  onCancel: () => void;
  onCreated: (claim: CreateClaimResponse) => void;
}) {
  const { t } = useI18n();
  const reasons = reasonsFor(type);
  const [reason, setReason] = useState<ClaimReason | "">(type === "withdrawal" ? "no_reason" : "");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const invalid = error instanceof ApiError ? error.fields : [];
  const idPrefix = `claim-${item.id}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const claim = await api.post<CreateClaimResponse>("/api/claims", {
        ...credentials,
        orderItemId: item.id,
        type,
        reason: reason || undefined,
        description,
      });
      onCreated(claim);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <form className="claim-form" onSubmit={(e) => void submit(e)} noValidate>
      <h3>
        <Icon name={type === "withdrawal" ? "undo" : "shield"} size={18} />
        {t(`claimForm.title.${type}`, { product: item.productName })}
      </h3>
      <Field
        id={`${idPrefix}-reason`}
        label={type === "withdrawal" ? t("claimForm.reasonOptional") : t("claimForm.reason")}
        error={invalid.includes("reason") ? t("error.validation_error") : undefined}
      >
        <select
          id={`${idPrefix}-reason`}
          value={reason}
          onChange={(e) => setReason(e.target.value as ClaimReason)}
          required={type === "warranty"}
        >
          {type === "warranty" && <option value="">—</option>}
          {reasons.map((r) => (
            <option key={r} value={r}>
              {t(`reason.${r}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id={`${idPrefix}-description`}
        label={t("claimForm.description")}
        hint={t(`claimForm.descriptionHelp.${type}`)}
        error={invalid.includes("description") ? t("claimForm.descriptionHelp.warranty") : undefined}
      >
        <textarea
          id={`${idPrefix}-description`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          required={type === "warranty"}
          aria-describedby={`${idPrefix}-description-hint`}
        />
      </Field>
      {error !== undefined && invalid.length === 0 && <Alert kind="error">{errorMessage(t, error)}</Alert>}
      <div className="form-actions">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? t("claimForm.sending") : t("claimForm.submit")}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}

function Created({ claim }: { claim: CreateClaimResponse }) {
  const { t, date } = useI18n();
  return (
    <div className="created" role="status">
      <span className="created__check" aria-hidden="true">
        <Icon name="check" size={22} />
      </span>
      <h3>{t("created.title")}</h3>
      <p className="muted small">{t("created.code")}</p>
      <div className="created__code">
        <strong data-testid="claim-code">{claim.code}</strong>
        <CopyButton text={claim.code} />
      </div>
      <p>{t("created.keep")}</p>
      <p>
        {claim.type === "withdrawal"
          ? t("created.next.withdrawal", { days: LEGAL_RULES.withdrawal.customerReturnWithinDays, date: date(claim.dueOn) })
          : t("created.next.warranty")}
      </p>
      <Link to={`/track/${claim.code}`} className="btn btn--secondary">
        {t("created.track")} <Icon name="arrowRight" size={16} />
      </Link>
    </div>
  );
}
