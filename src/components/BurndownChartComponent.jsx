import React, { useEffect, useState, useCallback } from 'react';
import { getBurndownData } from '../services/burndown';
import './BurndownChartComponent.css';

// ─── SVG chart constants ───────────────────────────────────────────────────────
const W      = 760;
const H      = 360;
const PAD    = { top: 24, right: 24, bottom: 56, left: 64 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top  - PAD.bottom;

function scaleX(i, total) {
    return PAD.left + (total <= 1 ? INNER_W / 2 : (i / (total - 1)) * INNER_W);
}

function scaleY(value, maxVal) {
    if (maxVal === 0) return PAD.top + INNER_H;
    return PAD.top + INNER_H - (value / maxVal) * INNER_H;
}

/** Build an SVG path `d` string that skips null values (lifts pen). */
function buildPath(values, maxVal, n) {
    let d = '';
    for (let i = 0; i < values.length; i++) {
        if (values[i] === null) continue;
        const x = scaleX(i, n);
        const y = scaleY(values[i], maxVal);
        d += d === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
}

function pointsString(values, maxVal) {
    return values
        .map((v, i) => `${scaleX(i, values.length)},${scaleY(v, maxVal)}`)
        .join(' ');
}

// ─── Tooltip state via SVG mouse events ───────────────────────────────────────
function BurndownSVG({ days, actualValues, idealValues, maxVal }) {
    const [tooltip, setTooltip] = useState(null);

    const n = days.length;
    if (n === 0) return null;

    const yTicks = 5;
    const yStep  = maxVal / yTicks;

    const actualPath = buildPath(actualValues, maxVal, n);

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="burndown-svg"
            onMouseLeave={() => setTooltip(null)}
        >
            {/* Grid lines */}
            {Array.from({ length: yTicks + 1 }, (_, i) => {
                const val = yStep * i;
                const y   = scaleY(val, maxVal);
                return (
                    <g key={i}>
                        <line
                            x1={PAD.left} y1={y}
                            x2={PAD.left + INNER_W} y2={y}
                            stroke="#e5e7eb" strokeWidth="1"
                        />
                        <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                            {val.toFixed(0)}
                        </text>
                    </g>
                );
            })}

            {/* Axes */}
            <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + INNER_H} stroke="#374151" strokeWidth="1.5" />
            <line x1={PAD.left} y1={PAD.top + INNER_H} x2={PAD.left + INNER_W} y2={PAD.top + INNER_H} stroke="#374151" strokeWidth="1.5" />

            {/* X-axis labels (show every N-th to avoid overlap) */}
            {days.map((day, i) => {
                const step = Math.max(1, Math.floor(n / 10));
                if (i % step !== 0 && i !== n - 1) return null;
                const x = scaleX(i, n);
                const label = day.slice(5); // MM-DD
                return (
                    <text key={day} x={x} y={PAD.top + INNER_H + 18} textAnchor="middle" fontSize="11" fill="#6b7280">
                        {label}
                    </text>
                );
            })}

            {/* Axis labels */}
            <text
                x={PAD.left - 44} y={PAD.top + INNER_H / 2}
                textAnchor="middle" fontSize="12" fill="#374151"
                transform={`rotate(-90, ${PAD.left - 44}, ${PAD.top + INNER_H / 2})`}
            >
                Ure
            </text>
            <text x={PAD.left + INNER_W / 2} y={H - 4} textAnchor="middle" fontSize="12" fill="#374151">
                Datum
            </text>

            {/* Ideal line (dashed) — full sprint */}
            <polyline
                points={pointsString(idealValues, maxVal)}
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
                strokeDasharray="6 3"
            />

            {/* Actual line — only up to today (skips nulls) */}
            {actualPath && (
                <path
                    d={actualPath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                />
            )}

            {/* Hover targets + dots */}
            {days.map((day, i) => {
                const x       = scaleX(i, n);
                const actual  = actualValues[i];
                const ideal   = idealValues[i];
                const ya      = actual !== null ? scaleY(actual, maxVal) : null;
                const yi      = scaleY(ideal, maxVal);
                return (
                    <g key={day}>
                        <rect
                            x={x - 12} y={PAD.top} width={24} height={INNER_H}
                            fill="transparent"
                            onMouseEnter={() => setTooltip({ day, x, ya: ya ?? yi, yi, actual, ideal })}
                        />
                        {ya !== null && <circle cx={x} cy={ya} r={3} fill="#3b82f6" />}
                        <circle cx={x} cy={yi} r={3} fill="#9ca3af" />
                    </g>
                );
            })}

            {/* Tooltip */}
            {tooltip && (() => {
                const tx = Math.min(tooltip.x + 12, W - 130);
                const ty = Math.min(Math.min(tooltip.ya, tooltip.yi) - 10, PAD.top + INNER_H - 60);
                return (
                    <g>
                        <rect x={tx} y={ty} width={120} height={52} rx={4} fill="white" stroke="#d1d5db" strokeWidth="1" />
                        <text x={tx + 8} y={ty + 16} fontSize="11" fontWeight="bold" fill="#111827">{tooltip.day}</text>
                        <text x={tx + 8} y={ty + 31} fontSize="11" fill="#3b82f6">
                            Dejanski: {tooltip.actual !== null ? `${tooltip.actual} h` : '—'}
                        </text>
                        <text x={tx + 8} y={ty + 46} fontSize="11" fill="#9ca3af">Idealni: {tooltip.ideal} h</text>
                    </g>
                );
            })()}

            {/* Legend */}
            <line x1={PAD.left + INNER_W - 180} y1={PAD.top + 8} x2={PAD.left + INNER_W - 155} y2={PAD.top + 8} stroke="#3b82f6" strokeWidth="2.5" />
            <text x={PAD.left + INNER_W - 150} y={PAD.top + 12} fontSize="12" fill="#374151">Dejanski potek</text>
            <line x1={PAD.left + INNER_W - 180} y1={PAD.top + 24} x2={PAD.left + INNER_W - 155} y2={PAD.top + 24} stroke="#9ca3af" strokeWidth="2" strokeDasharray="6 3" />
            <text x={PAD.left + INNER_W - 150} y={PAD.top + 28} fontSize="12" fill="#374151">Idealni potek</text>
        </svg>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function BurndownChartComponent({ sprintId, sprintNumber }) {
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState('');

    const load = useCallback(async () => {
        if (!sprintId) return;
        setLoading(true);
        setError('');
        try {
            const d = await getBurndownData(sprintId);
            setData(d);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [sprintId]);

    useEffect(() => { load(); }, [load]);

    if (loading) return <div className="burndown-status">Nalaganje burndown podatkov…</div>;
    if (error)   return <div className="burndown-status burndown-status--error">Napaka: {error}</div>;
    if (!data)   return null;

    const { totalInitialHours, tableRows, idealLine, days } = data;

    const actualValues = tableRows.map(r => r.remaining);
    const idealValues  = idealLine.map(r => r.ideal);
    const maxVal       = totalInitialHours > 0 ? totalInitialHours : 1;

    const hasData = days.length > 0;

    return (
        <div className="burndown-wrapper">
            <div className="burndown-header">
                <h3 className="burndown-title">
                    Burndown Chart — {sprintNumber != null ? `Sprint #${sprintNumber}` : 'Sprint'}
                </h3>
                <span className="burndown-total">Skupaj ur: {totalInitialHours} h</span>
            </div>

            {!hasData ? (
                <div className="burndown-status">Ni podatkov za prikaz (sprint nima nalog ali se še ni začel).</div>
            ) : totalInitialHours === 0 ? (
                <div className="burndown-status">Sprint nima nalog z ocenjenim časom.</div>
            ) : (
                <>
                    <div className="burndown-chart-container">
                        <BurndownSVG
                            days={days}
                            actualValues={actualValues}
                            idealValues={idealValues}
                            maxVal={maxVal}
                        />
                    </div>

                    <div className="burndown-table-wrapper">
                        <table className="burndown-table">
                            <thead>
                                <tr>
                                    <th>Datum</th>
                                    <th>Zabeleženo (h)</th>
                                    <th>Skupaj zabeleženo (h)</th>
                                    <th>Preostalo (h)</th>
                                    <th>Idealno preostalo (h)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableRows.map((row, i) => (
                                    <tr key={row.date} className={row.remaining === 0 && row.remaining !== null ? 'burndown-table__row--done' : ''}>
                                        <td>{row.date}</td>
                                        <td>{row.logged ?? '—'}</td>
                                        <td>{row.cumulative ?? '—'}</td>
                                        <td className="burndown-table__remaining">{row.remaining ?? '—'}</td>
                                        <td className="burndown-table__ideal">{idealLine[i]?.ideal ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
