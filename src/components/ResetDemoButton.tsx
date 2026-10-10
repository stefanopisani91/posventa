import { useState } from "react";
import { api } from "../api.ts";
import { errorMessage } from "../errors.ts";
import { useI18n } from "../i18n/i18n.ts";
import { Icon } from "./Icon.tsx";
import { Alert } from "./ui.tsx";

/** Restores the initial demo data. `onDone` runs after a successful reset. */
export function ResetDemoButton({ onDone, variant = "full" }: { onDone?: () => void; variant?: "full" | "compact" }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string }>();

  async function reset() {
    if (!window.confirm(t("reset.confirm"))) return;
    setBusy(true);
    setResult(undefined);
    try {
      await api.post("/api/demo/reset");
      setResult({ ok: true, text: t("reset.done") });
      onDone?.();
    } catch (error) {
      setResult({ ok: false, text: errorMessage(t, error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`reset reset--${variant}`}>
      <button
        type="button"
        className={variant === "compact" ? "btn btn--small btn--ghost" : "btn btn--secondary"}
        onClick={() => void reset()}
        disabled={busy}
        title={variant === "compact" ? t("reset.help") : undefined}
      >
        <Icon name="rotate" size={16} />
        {variant === "compact" ? t("reset.short") : t("reset.button")}
      </button>
      {variant === "full" && <p className="muted small">{t("reset.help")}</p>}
      {result && variant === "full" && <Alert kind={result.ok ? "success" : "error"}>{result.text}</Alert>}
      {result && !result.ok && variant === "compact" && <span className="small error-text">{result.text}</span>}
    </div>
  );
}
