/**
 * Lightweight charts in plain HTML/CSS (no chart library):
 * thin bars with rounded data-ends, hairline grid, legend + hover/focus tooltips,
 * and a table view so no number is only available as a shape.
 */
import { useState, type ReactNode } from "react";

export function StatTile({ label, value, help, tone }: { label: string; value: string; help?: ReactNode; tone?: "critical" }) {
  return (
    <div className={`stat-tile${tone ? ` stat-tile--${tone}` : ""}`}>
      <p className="stat-tile__label">{label}</p>
      <p className="stat-tile__value">{value}</p>
      {help && <p className="stat-tile__help">{help}</p>}
    </div>
  );
}

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Text shown at the bar tip (defaults to the value). */
  display?: string;
  sub?: string;
}

/** Horizontal bars, one series: every bar in the same colour, value at the tip. */
export function BarList({ rows, ariaLabel }: { rows: BarRow[]; ariaLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="bar-list" aria-label={ariaLabel}>
      {rows.map((r) => (
        <li key={r.key} className="bar-row" tabIndex={0} aria-label={`${r.label}: ${r.display ?? r.value}${r.sub ? ` (${r.sub})` : ""}`}>
          <div className="bar-row__text">
            <span className="bar-row__label">{r.label}</span>
            {r.sub && <span className="bar-row__sub">{r.sub}</span>}
          </div>
          <div className="bar-row__track">
            <span className="bar-row__bar" style={{ width: `${(r.value / max) * 100}%` }} />
            <span className="bar-row__value">{r.display ?? r.value}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface StackedColumn {
  key: string;
  label: string;
  fullLabel: string;
  values: number[];
}

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(value)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * step >= value) return m * step;
  }
  return 10 * step;
}

/** Stacked columns for two or more series, with legend, tooltip and table view. */
export function StackedColumns({
  columns,
  series,
  tableLabels,
}: {
  columns: StackedColumn[];
  series: { name: string; className: string }[];
  tableLabels: { show: string; column: string; total: string };
}) {
  const [active, setActive] = useState<number | null>(null);
  const totals = columns.map((c) => c.values.reduce((a, b) => a + b, 0));
  const max = niceMax(Math.max(0, ...totals));
  const ticks = [max, max / 2, 0];
  const activeColumn = active === null ? undefined : columns[active];

  return (
    <div className="stacked">
      <ul className="legend">
        {series.map((s) => (
          <li key={s.name}>
            <span className={`legend__swatch ${s.className}`} aria-hidden="true" />
            {s.name}
          </li>
        ))}
      </ul>
      <div className="stacked__plot">
        <div className="stacked__axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <div className="stacked__area">
          {ticks.map((tick) => (
            <span key={tick} className="stacked__grid" style={{ bottom: `${(tick / max) * 100}%` }} aria-hidden="true" />
          ))}
          <div className="stacked__columns" onMouseLeave={() => setActive(null)}>
            {columns.map((c, i) => (
              <div
                key={c.key}
                className={`stacked__col${active === i ? " is-active" : ""}`}
                tabIndex={0}
                role="img"
                aria-label={`${c.fullLabel}: ${series.map((s, j) => `${s.name} ${c.values[j] ?? 0}`).join(", ")}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <div className="stacked__stack" style={{ height: `${((totals[i] ?? 0) / max) * 100}%` }}>
                  {c.values.map((v, j) =>
                    v > 0 ? (
                      <span
                        key={series[j]?.name}
                        className={`stacked__seg ${series[j]?.className ?? ""}`}
                        style={{ flexGrow: v }}
                      />
                    ) : null,
                  )}
                </div>
                <span className="stacked__label" aria-hidden="true">
                  {c.label}
                </span>
                {activeColumn && active === i && (
                  <div className={`tooltip${i > columns.length / 2 ? " tooltip--left" : ""}`} role="presentation">
                    <p className="tooltip__title">{c.fullLabel}</p>
                    {series.map((s, j) => (
                      <p key={s.name} className="tooltip__row">
                        <span className={`legend__swatch ${s.className}`} aria-hidden="true" />
                        <span>{s.name}</span>
                        <strong>{c.values[j] ?? 0}</strong>
                      </p>
                    ))}
                    <p className="tooltip__row tooltip__total">
                      <span>{tableLabels.total}</span>
                      <strong>{totals[i]}</strong>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <details className="table-view">
        <summary>{tableLabels.show}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{tableLabels.column}</th>
              {series.map((s) => (
                <th key={s.name} scope="col">
                  {s.name}
                </th>
              ))}
              <th scope="col">{tableLabels.total}</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((c, i) => (
              <tr key={c.key}>
                <th scope="row">{c.fullLabel}</th>
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
