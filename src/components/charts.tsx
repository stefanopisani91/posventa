/**
 * Lightweight charts in plain HTML/CSS (no chart library):
 * thin bars with rounded data-ends, hairline grid, legend + hover/focus tooltips,
 * and a table view so no number is only available as a shape.
 */
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon.tsx";

export function StatTile({
  icon,
  label,
  value,
  help,
  tone,
}: {
  icon?: IconName;
  label: string;
  value: string;
  help?: ReactNode;
  tone?: "critical";
}) {
  return (
    <div className={`stat-tile${tone ? ` stat-tile--${tone}` : ""}`}>
      <div className="stat-tile__head">
        <p className="stat-tile__label">{label}</p>
        {icon && (
          <span className="stat-tile__icon" aria-hidden="true">
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <p className="stat-tile__value">{value}</p>
      {help && <p className="stat-tile__help">{help}</p>}
    </div>
  );
}

export interface Series {
  name: string;
  className: string;
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="legend">
      {series.map((s) => (
        <li key={s.name}>
          <span className={`legend__swatch ${s.className}`} aria-hidden="true" />
          {s.name}
        </li>
      ))}
    </ul>
  );
}

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Text shown at the bar tip (defaults to the value). */
  display?: string;
  sub?: string;
  /** Categorical series the bar belongs to (colour follows the entity). */
  series?: 1 | 2;
}

/** Horizontal bars: one colour per series (one series → one colour), value at the tip. */
export function BarList({ rows, ariaLabel, legend }: { rows: BarRow[]; ariaLabel: string; legend?: Series[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <>
      {legend && <Legend series={legend} />}
      <ul className="bar-list" aria-label={ariaLabel}>
        {rows.map((r) => (
          <li
            key={r.key}
            className="bar-row"
            tabIndex={0}
            aria-label={`${r.label}: ${r.display ?? r.value}${r.sub ? ` (${r.sub})` : ""}`}
          >
            <div className="bar-row__text">
              <span className="bar-row__label">{r.label}</span>
              {r.sub && <span className="bar-row__sub">{r.sub}</span>}
            </div>
            <div className="bar-row__track">
              <span className={`bar-row__bar series-${r.series ?? 1}`} style={{ width: `${(r.value / max) * 100}%` }} />
              <span className="bar-row__value">{r.display ?? r.value}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export interface StackedColumn {
  key: string;
  label: string;
  fullLabel: string;
  values: number[];
  /** Outside the selected period: drawn in grey. */
  muted?: boolean;
  /** Incomplete period (e.g. the current month). */
  partial?: boolean;
}

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  for (const m of [1, 1.5, 2, 2.5, 5, 10]) {
    if (m * step >= value) return m * step;
  }
  return 10 * step;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Stacked columns for two or more series, with legend, tooltip, direct label on the peak and table view. */
export function StackedColumns({
  columns,
  series,
  labels,
}: {
  columns: StackedColumn[];
  series: Series[];
  labels: { show: string; column: string; total: string; partial?: string };
}) {
  const [active, setActive] = useState<number | null>(null);
  const totals = columns.map((c) => c.values.reduce((a, b) => a + b, 0));
  const max = niceMax(Math.max(0, ...totals));
  const ticks = [max, max * 0.75, max / 2, max / 4, 0];
  const peak = totals.reduce((best, t, i) => (t > (totals[best] ?? 0) ? i : best), 0);
  const activeColumn = active === null ? undefined : columns[active];

  return (
    <div className="stacked">
      <Legend series={series} />
      <div className="stacked__plot">
        <div className="stacked__axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{Number.isInteger(tick) ? tick : ""}</span>
          ))}
        </div>
        <div className="stacked__area">
          {ticks.map((tick) => (
            <span key={tick} className="stacked__grid" style={{ bottom: `${(tick / max) * 100}%` }} aria-hidden="true" />
          ))}
          <div className="stacked__columns" onMouseLeave={() => setActive(null)}>
            {columns.map((c, i) => {
              const heightPct = ((totals[i] ?? 0) / max) * 100;
              const className = [
                "stacked__col",
                active === i ? "is-active" : "",
                c.muted ? "stacked__col--muted" : "",
                c.partial ? "stacked__col--partial" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <div
                  key={c.key}
                  className={className}
                  tabIndex={0}
                  role="img"
                  aria-label={`${capitalize(c.fullLabel)}${c.partial && labels.partial ? ` (${labels.partial})` : ""}: ${series
                    .map((s, j) => `${s.name} ${c.values[j] ?? 0}`)
                    .join(", ")}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  {i === peak && (totals[i] ?? 0) > 0 && (
                    <span className="stacked__peak" style={{ bottom: `calc(${heightPct}% + 4px)` }} aria-hidden="true">
                      {totals[i]}
                    </span>
                  )}
                  <div className="stacked__stack" style={{ height: `${heightPct}%` }}>
                    {c.values.map((v, j) =>
                      v > 0 ? (
                        <span key={series[j]?.name} className={`stacked__seg ${series[j]?.className ?? ""}`} style={{ flexGrow: v }} />
                      ) : null,
                    )}
                  </div>
                  <span className="stacked__label" aria-hidden="true">
                    {c.label}
                    {c.partial ? "*" : ""}
                  </span>
                  {activeColumn && active === i && (
                    <div
                      className={`tooltip${i > columns.length / 2 ? " tooltip--left" : ""}`}
                      style={{ bottom: `calc(${heightPct}% + 10px)` }}
                      role="presentation"
                    >
                      <p className="tooltip__title">
                        {capitalize(c.fullLabel)}
                        {c.partial && labels.partial ? ` · ${labels.partial}` : ""}
                      </p>
                      {series.map((s, j) => (
                        <p key={s.name} className="tooltip__row">
                          <span className={`legend__swatch ${s.className}`} aria-hidden="true" />
                          <span>{s.name}</span>
                          <strong>{c.values[j] ?? 0}</strong>
                        </p>
                      ))}
                      <p className="tooltip__row tooltip__total">
                        <span>{labels.total}</span>
                        <strong>{totals[i]}</strong>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <details className="table-view">
        <summary>{labels.show}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{labels.column}</th>
              {series.map((s) => (
                <th key={s.name} scope="col">
                  {s.name}
                </th>
              ))}
              <th scope="col">{labels.total}</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((c, i) => (
              <tr key={c.key} className={c.muted ? "is-muted" : ""}>
                <th scope="row">
                  {capitalize(c.fullLabel)}
                  {c.partial ? "*" : ""}
                </th>
                {c.values.map((v, j) => (
                  <td key={series[j]?.name}>{v}</td>
                ))}
                <td>{totals[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
