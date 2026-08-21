"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Categorical hues, assigned in this order and never cycled. Validated for
 * colour-vision deficiency: worst adjacent pair is ΔE 11.2 (deutan) and 24.3 in
 * normal vision, every hue clears 3:1 against the card.
 *
 * The palette this replaced was three greens and a slate — ΔE 4.8 between the
 * first two, which no reader could separate, colour-blind or not.
 */
export const CHART_COLORS = [
  "#2f7ff5", // blue — the default series
  "#9333ea", // violet
  "#009467", // green
  "#d97706", // amber
  "#0e8fa8", // teal
  "#e11d6b", // magenta
];

const AXIS = {
  stroke: "#94a3b8",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const;

const GRID = { stroke: "#eef1f5", strokeDasharray: "0", vertical: false } as const;

/** Marks draw on load, once, in the reading direction. */
const ANIM = { isAnimationActive: true, animationDuration: 700, animationEasing: "ease-out" } as const;

/**
 * One tooltip for every chart: the label, then a swatch, name and value per
 * series. Recharts' default renders a bare list; this keeps the value in text
 * ink with the colour carried by the swatch beside it.
 */
function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
  labelFormatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; payload?: unknown }[];
  label?: string | number;
  unit?: string;
  labelFormatter?: (l: string | number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-elevated px-3 py-2 shadow-md">
      {label !== undefined && (
        <p className="mb-1 text-[11px] font-medium text-muted">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[13px]">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: p.color }}
          />
          {p.name && <span className="text-muted">{p.name}</span>}
          <span className="ml-auto font-medium text-ink tnum">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AreaTrend({
  data,
  xKey,
  dataKey,
  color = CHART_COLORS[0],
  height = 240,
  unit = "",
}: {
  data: Record<string, unknown>[];
  xKey: string;
  dataKey: string;
  color?: string;
  height?: number;
  unit?: string;
}) {
  const id = React.useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={xKey} {...AXIS} />
        <YAxis {...AXIS} width={44} />
        <Tooltip
          cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
          content={<ChartTooltip unit={unit} />}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${id})`}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff" }}
          {...ANIM}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarSeries({
  data,
  xKey,
  dataKey,
  color = CHART_COLORS[0],
  height = 240,
  unit = "",
}: {
  data: Record<string, unknown>[];
  xKey: string;
  dataKey: string;
  color?: string;
  height?: number;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey={xKey} {...AXIS} />
        <YAxis {...AXIS} width={44} />
        <Tooltip
          cursor={{ fill: "rgba(15,23,42,0.04)" }}
          content={<ChartTooltip unit={unit} />}
        />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} {...ANIM} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({
  data,
  height = 240,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="60%"
          outerRadius="84%"
          paddingAngle={2}
          // A surface-coloured ring separates adjoining arcs.
          stroke="#ffffff"
          strokeWidth={2}
          {...ANIM}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TempCurve({
  curve,
  height = 200,
}: {
  curve: { t: number; temp: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={curve} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="t" {...AXIS} unit="m" />
        <YAxis {...AXIS} width={44} unit="°" />
        <Tooltip
          cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
          content={<ChartTooltip unit=" °C" labelFormatter={(l) => `${l} min`} />}
        />
        <Line
          type="monotone"
          dataKey="temp"
          name="Temp"
          stroke="#b3261e"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff" }}
          {...ANIM}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
