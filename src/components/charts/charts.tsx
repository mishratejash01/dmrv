"use client";

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

export const CHART_COLORS = ["#06805a", "#2e7d32", "#b26b00", "#1668b3", "#64748b", "#57a773"];

const axis = { stroke: "#cbd5e1", fontSize: 11, tickLine: false, axisLine: false };
const grid = { stroke: "#e2e8f0", strokeDasharray: "3 3", vertical: false };

export function AreaTrend({
  data,
  xKey,
  dataKey,
  color = "#06805a",
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
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...grid} />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} width={44} />
        <Tooltip
          formatter={(v) => [`${v}${unit}`, ""]}
          contentStyle={{ borderRadius: 4, border: "1px solid #e2e8f0", background: "#ffffff" }}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarSeries({
  data,
  xKey,
  dataKey,
  color = "#2e7d32",
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
        <CartesianGrid {...grid} />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} width={44} />
        <Tooltip
          cursor={{ fill: "#f1f5f9" }}
          formatter={(v) => [`${v}${unit}`, ""]}
          contentStyle={{ borderRadius: 4, border: "1px solid #e2e8f0", background: "#ffffff" }}
        />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={44} />
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
          innerRadius="58%"
          outerRadius="82%"
          paddingAngle={2}
          stroke="none"
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 4, border: "1px solid #e2e8f0", background: "#ffffff" }}
        />
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
        <CartesianGrid {...grid} />
        <XAxis dataKey="t" {...axis} unit="m" />
        <YAxis {...axis} width={44} unit="°" />
        <Tooltip
          formatter={(v) => [`${v} °C`, "Temp"]}
          labelFormatter={(l) => `${l} min`}
          contentStyle={{ borderRadius: 4, border: "1px solid #e2e8f0", background: "#ffffff" }}
        />
        <Line type="monotone" dataKey="temp" stroke="#b3261e" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
