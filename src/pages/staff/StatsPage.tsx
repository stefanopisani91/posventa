import { useSearchParams } from "react-router";
import type { StatsPeriod, StatsResponse } from "../../../shared/api-types.ts";
import { CLAIM_STATUSES } from "../../../shared/domain.ts";
import { BarList, StackedColumns, StatTile } from "../../components/charts.tsx";
import { Icon } from "../../components/Icon.tsx";
import { Loading } from "../../components/ui.tsx";
import { useApi, useTitle } from "../../hooks.ts";
import { useI18n } from "../../i18n/i18n.ts";
import { LOCALES } from "../../i18n/messages.ts";
import { StaffError } from "./StaffError.tsx";

const PERIODS: StatsPeriod[] = ["90d", "12m", "all"];

export function StatsPage() {
  const { t, tn, lang, percent, number } = useI18n();
  useTitle("stats.title");
  const [params, setParams] = useSearchParams();
  const period = (PERIODS as string[]).includes(params.get("period") ?? "") ? (params.get("period") as StatsPeriod) : "12m";
  const stats = useApi<StatsResponse>(`/api/admin/stats?period=${period}`);
  const s = stats.data;

  const days = (value: number | null) => (value === null ? t("stats.na") : tn("common.days", value, { n: number(value) }));
  const monthFormat = new Intl.DateTimeFormat(LOCALES[lang], { month: "short", timeZone: "UTC" });
  const monthLong = new Intl.DateTimeFormat(LOCALES[lang], { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="stats">
      <header className="page-header page-header--row">
        <div>
          <p className="eyebrow">{t("app.tagline")}</p>
          <h1>{t("stats.title")}</h1>
        </div>
        <div className="segmented" role="group" aria-label={t("stats.title")}>
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className={p === period ? "is-active" : ""}
              aria-pressed={p === period}
              onClick={() => setParams(p === "12m" ? {} : { period: p }, { replace: true })}
            >
              {t(`stats.period.${p}`)}
            </button>
          ))}
        </div>
      </header>

      {stats.error !== undefined && <StaffError error={stats.error} onRetry={stats.reload} />}
      {!s && stats.loading && <Loading />}
      {s && (
        <div className={stats.loading ? "is-loading" : ""}>
          <p className="muted small">{t("stats.basis", { orders: s.deliveredOrders, claims: s.claims.total })}</p>
          <div className="tiles">
            <StatTile icon="undo" label={t("stats.returnRate")} value={percent(s.returnRate)} help={t("stats.returnRateHelp")} />
            <StatTile icon="shield" label={t("stats.warrantyRate")} value={percent(s.warrantyClaimRate)} help={t("stats.warrantyRateHelp")} />
            <StatTile
              icon="clock"
              label={t("stats.avgClose")}
              value={days(s.avgCloseDays.all)}
              help={t("stats.avgCloseHelp", { w: days(s.avgCloseDays.withdrawal), g: days(s.avgCloseDays.warranty) })}
            />
            <StatTile
              icon="inbox"
              label={t("stats.open")}
              value={String(s.claims.open)}
              tone={s.claims.overdue > 0 ? "critical" : undefined}
              help={
                s.claims.overdue > 0 ? (
                  <>
                    <Icon name="alert" size={14} /> {t("stats.openHelp", { n: s.claims.overdue })}
                  </>
                ) : undefined
              }
            />
          </div>

          <div className="charts">
            <section className="card chart-card chart-card--wide">
              <h2>{t("stats.monthly")}</h2>
              <StackedColumns
                series={[
                  { name: t("typeShort.withdrawal"), className: "series-1" },
                  { name: t("typeShort.warranty"), className: "series-2" },
                ]}
                columns={s.monthly.map((m) => {
                  const d = new Date(`${m.month}-01T00:00:00Z`);
                  return {
                    key: m.month,
                    label: monthFormat.format(d).replace(".", ""),
                    fullLabel: monthLong.format(d),
                    values: [m.withdrawal, m.warranty],
                  };
                })}
                tableLabels={{ show: t("stats.showTable"), column: t("stats.month"), total: t("stats.total") }}
              />
            </section>

            <section className="card chart-card">
              <h2>{t("stats.reasons")}</h2>
              {s.topReasons.length === 0 ? (
                <p className="muted">{t("stats.noData")}</p>
              ) : (
                <BarList
                  ariaLabel={t("stats.reasons")}
                  rows={s.topReasons.map((r) => ({
                    key: `${r.type}-${r.reason}`,
                    label: t(`reason.${r.reason}`),
                    sub: t(`typeShort.${r.type}`),
                    value: r.count,
                  }))}
                />
              )}
            </section>

            <section className="card chart-card">
              <h2>{t("stats.products")}</h2>
              <p className="muted small">{t("stats.productsHelp")}</p>
              {s.products.length === 0 ? (
                <p className="muted">{t("stats.noData")}</p>
              ) : (
                <BarList
                  ariaLabel={t("stats.products")}
                  rows={s.products.map((p) => ({
                    key: String(p.productId),
                    label: p.productName,
                    sub: t("stats.productRate", { rate: percent(p.rate), units: p.units }),
                    value: p.claims,
                  }))}
                />
              )}
            </section>

            <section className="card chart-card">
              <h2>{t("stats.byStatus")}</h2>
              {s.claims.total === 0 ? (
                <p className="muted">{t("stats.noData")}</p>
              ) : (
                <BarList
                  ariaLabel={t("stats.byStatus")}
                  rows={CLAIM_STATUSES.map((status) => ({
                    key: status,
                    label: t(`status.${status}`),
                    value: s.byStatus.find((b) => b.status === status)?.count ?? 0,
                  }))}
                />
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
