import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { AdminClaimListResponse, ProductOption } from "../../../shared/api-types.ts";
import { CLAIM_STATUSES, CLAIM_TYPES, DUE_FILTERS } from "../../../shared/domain.ts";
import { Icon } from "../../components/Icon.tsx";
import { EmptyArt } from "../../components/Logo.tsx";
import { DueChip, Loading, StatusBadge, TypeTag } from "../../components/ui.tsx";
import { useApi, useTitle } from "../../hooks.ts";
import { useI18n } from "../../i18n/i18n.ts";
import { StaffError } from "./StaffError.tsx";

const FILTER_KEYS = ["status", "type", "productId", "due", "q", "sort", "page"] as const;

export function ClaimsPage() {
  const { t, tn, date } = useI18n();
  useTitle("claims.title");
  const [params, setParams] = useSearchParams();
  const query = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  const queryString = query.toString();
  const claims = useApi<AdminClaimListResponse>(`/api/admin/claims${queryString ? `?${queryString}` : ""}`);
  const products = useApi<ProductOption[]>("/api/admin/products");
  const [search, setSearch] = useState(params.get("q") ?? "");
  // Secondary filters start open only when one of them is in use (they collapse on small screens).
  const [moreOpen, setMoreOpen] = useState(() => ["type", "productId", "due", "sort"].some((k) => params.get(k)));

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  }

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (search.trim() === current) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (search.trim()) next.set("q", search.trim());
      else next.delete("q");
      next.delete("page");
      setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, params, setParams]);

  const data = claims.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const hasFilters = FILTER_KEYS.some((k) => k !== "sort" && k !== "page" && params.get(k));
  const active = (key: string, value: string) => params.get(key) === value;

  return (
    <div className="claims">
      <header className="page-header page-header--row">
        <h1>{t("claims.title")}</h1>
        {data && (
          <div className="kpis" role="group">
            <button
              type="button"
              className={`kpi ${active("status", "open") ? "is-active" : ""}`}
              onClick={() => update({ status: "open", due: undefined })}
            >
              <span className="kpi__icon">
                <Icon name="inbox" size={18} />
              </span>
              <span className="kpi__value">{data.counts.open}</span>
              <span className="kpi__label">{t("claims.count.open")}</span>
              <span className="kpi__meter" aria-hidden="true">
                <i className="kpi__seg kpi__seg--overdue" style={{ flexGrow: data.counts.overdue }} />
                <i className="kpi__seg kpi__seg--soon" style={{ flexGrow: data.counts.dueSoon }} />
                <i className="kpi__seg kpi__seg--ok" style={{ flexGrow: Math.max(0, data.counts.open - data.counts.overdue - data.counts.dueSoon) }} />
              </span>
            </button>
            <button
              type="button"
              className={`kpi kpi--overdue ${active("due", "overdue") ? "is-active" : ""}`}
              onClick={() => update({ due: "overdue", status: undefined })}
            >
              <span className="kpi__icon">
                <Icon name="alert" size={18} />
              </span>
              <span className="kpi__value">{data.counts.overdue}</span>
              <span className="kpi__label">{t("claims.count.overdue")}</span>
            </button>
            <button
              type="button"
              className={`kpi kpi--soon ${active("due", "due_soon") ? "is-active" : ""}`}
              onClick={() => update({ due: "due_soon", status: undefined })}
            >
              <span className="kpi__icon">
                <Icon name="clock" size={18} />
              </span>
              <span className="kpi__value">{data.counts.dueSoon}</span>
              <span className="kpi__label">{t("claims.count.dueSoon")}</span>
            </button>
          </div>
        )}
      </header>

      <form className={`filters card${moreOpen ? " is-open" : ""}`} onSubmit={(e) => e.preventDefault()} role="search">
        <label className="filters__search">
          <span>{t("filters.search")}</span>
          <span className="input-icon">
            <Icon name="search" size={16} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("filters.searchPlaceholder")}
            />
          </span>
        </label>
        <label>
          <span>{t("filters.status")}</span>
          <select value={params.get("status") ?? ""} onChange={(e) => update({ status: e.target.value })}>
            <option value="">{t("filters.status.all")}</option>
            <option value="open">{t("filters.status.open")}</option>
            <option value="closed">{t("filters.status.closed")}</option>
            {CLAIM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="filters__extra">
          <span>{t("filters.type")}</span>
          <select value={params.get("type") ?? ""} onChange={(e) => update({ type: e.target.value })}>
            <option value="">{t("filters.type.all")}</option>
            {CLAIM_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`typeShort.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="filters__extra">
          <span>{t("filters.product")}</span>
          <select value={params.get("productId") ?? ""} onChange={(e) => update({ productId: e.target.value })}>
            <option value="">{t("filters.product.all")}</option>
            {products.data?.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filters__extra">
          <span>{t("filters.due")}</span>
          <select value={params.get("due") ?? ""} onChange={(e) => update({ due: e.target.value })}>
            <option value="">{t("filters.due.all")}</option>
            {DUE_FILTERS.map((d) => (
              <option key={d} value={d}>
                {t(`filters.due.${d}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="filters__extra">
          <span>{t("filters.sort")}</span>
          <select
            value={params.get("sort") ?? "due"}
            onChange={(e) => update({ sort: e.target.value === "due" ? undefined : e.target.value })}
          >
            <option value="due">{t("filters.sort.due")}</option>
            <option value="newest">{t("filters.sort.newest")}</option>
            <option value="updated">{t("filters.sort.updated")}</option>
          </select>
        </label>
        <button
          type="button"
          className="btn btn--small btn--ghost filters__toggle"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <Icon name="list" size={14} />
          {moreOpen ? t("filters.less") : t("filters.more")}
        </button>
        {hasFilters && (
          <button
            type="button"
            className="btn btn--small btn--ghost filters__clear"
            onClick={() => {
              setSearch("");
              setParams(new URLSearchParams(), { replace: true });
            }}
          >
            <Icon name="x" size={14} />
            {t("common.clear")}
          </button>
        )}
      </form>

      {claims.error !== undefined && <StaffError error={claims.error} onRetry={claims.reload} />}
      {!data && claims.loading && <Loading />}
      {data && (
        <>
          <p className="muted small results-count" aria-live="polite">
            {tn("claims.total", data.total)}
          </p>
          {data.items.length === 0 ? (
            <div className="empty">
              <EmptyArt />
              <p className="empty__title">{t("claims.empty")}</p>
              <p className="muted small">{t("claims.emptyHint")}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className={`claims-table${claims.loading ? " is-loading" : ""}`}>
                <thead>
                  <tr>
                    <th scope="col">{t("claims.col.code")}</th>
                    <th scope="col">{t("claims.col.product")}</th>
                    <th scope="col">{t("claims.col.customer")}</th>
                    <th scope="col">{t("claims.col.type")}</th>
                    <th scope="col">{t("claims.col.status")}</th>
                    <th scope="col">{t("claims.col.deadline")}</th>
                    <th scope="col">{t("claims.col.opened")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.id} className={`row--${c.dueState}`}>
                      <td data-label={t("claims.col.code")}>
                        <Link to={`/staff/claims/${c.id}`} className="code-link">
                          {c.code}
                        </Link>
                        <span className="muted small block">{c.orderNumber}</span>
                      </td>
                      <td data-label={t("claims.col.product")}>
                        <span className="cell-strong">{c.productName}</span>
                        <span className="muted small block">{t(`reason.${c.reason}`)}</span>
                      </td>
                      <td data-label={t("claims.col.customer")}>{c.customerName}</td>
                      <td data-label={t("claims.col.type")}>
                        <TypeTag type={c.type} />
                      </td>
                      <td data-label={t("claims.col.status")}>
                        <StatusBadge status={c.status} />
                      </td>
                      <td data-label={t("claims.col.deadline")}>
                        <DueChip state={c.dueState} daysToDue={c.daysToDue} />
                        {c.dueState !== "closed" && <span className="muted small block">{date(c.dueOn, "short")}</span>}
                      </td>
                      <td data-label={t("claims.col.opened")}>{date(c.openedOn, "short")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button
                type="button"
                className="btn btn--small btn--ghost"
                disabled={data.page <= 1}
                onClick={() => update({ page: String(data.page - 1) })}
              >
                <Icon name="arrowLeft" size={14} /> {t("common.prev")}
              </button>
              <span className="small">{t("common.page", { page: data.page, pages })}</span>
              <button
                type="button"
                className="btn btn--small btn--ghost"
                disabled={data.page >= pages}
                onClick={() => update({ page: String(data.page + 1) })}
              >
                {t("common.next")} <Icon name="arrowRight" size={14} />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
