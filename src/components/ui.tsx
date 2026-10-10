import { useState, type ReactNode } from "react";
import type { ClaimStatus, ClaimType, DueState } from "../../shared/domain.ts";
import { errorMessage } from "../errors.ts";
import { useI18n } from "../i18n/i18n.ts";
import { STATUS_ICON } from "./category-icons.ts";
import { Icon, type IconName } from "./Icon.tsx";


export function StatusBadge({ status }: { status: ClaimStatus }) {
  const { t } = useI18n();
  return (
    <span className={`badge badge--${status}`}>
      <Icon name={STATUS_ICON[status]} size={14} />
      {t(`status.${status}`)}
    </span>
  );
}

export function TypeTag({ type, short = true }: { type: ClaimType; short?: boolean }) {
  const { t } = useI18n();
  return (
    <span className={`type-tag type-tag--${type}`}>
      <Icon name={type === "withdrawal" ? "undo" : "shield"} size={14} />
      {short ? t(`typeShort.${type}`) : t(`type.${type}`)}
    </span>
  );
}

/** Deadline state for the shop: icon + words, never colour alone. */
export function DueChip({ state, daysToDue }: { state: DueState; daysToDue: number }) {
  const { t, tn } = useI18n();
  if (state === "closed") return <span className="due due--closed">{t("due.closed")}</span>;
  const label =
    daysToDue < 0 ? tn("due.overdue", -daysToDue) : daysToDue === 0 ? t("due.today") : tn("due.left", daysToDue);
  return (
    <span className={`due due--${state}`}>
      <Icon name={state === "on_track" ? "clock" : "alert"} size={14} />
      {label}
    </span>
  );
}

export function Alert({ kind = "info", children }: { kind?: "info" | "error" | "success" | "warning"; children: ReactNode }) {
  const icon: IconName = kind === "success" ? "check" : kind === "info" ? "info" : "alert";
  return (
    <div className={`alert alert--${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  );
}

export function Loading() {
  const { t } = useI18n();
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {t("common.loading")}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <Alert kind="error">
      <p>{errorMessage(t, error)}</p>
      {onRetry && (
        <button type="button" className="btn btn--small btn--ghost" onClick={onRetry}>
          {t("common.retry")}
        </button>
      )}
    </Alert>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={error ? "field field--invalid" : "field"}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn--small btn--ghost"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      <Icon name={copied ? "check" : "copy"} size={16} />
      {copied ? t("common.copied") : t("common.copy")}
    </button>
  );
}
