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

export const CHART_COLORS = ["#b08056", "#8a9a7b", "#c9a24b", "#6f8286", "#a98d6a", "#9aa88b"];

const axis = { stroke: "#d8ccb6", fontSize: 11, tickLine: false, axisLine: false };
const grid = { stroke: "#e7decf", strokeDasharray: "3 3", vertical: false };

export function AreaTrend({
  data,
  xKey,
  dataKey,
  color = "#b08056",
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
          contentStyle={{ borderRadius: 10, border: "1px solid #e7decf", background: "#fffdf9" }}
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
  color = "#8a9a7b",
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
          cursor={{ fill: "#efe7d8" }}
          formatter={(v) => [`${v}${unit}`, ""]}
          contentStyle={{ borderRadius: 10, border: "1px solid #e7decf", background: "#fffdf9" }}
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
          contentStyle={{ borderRadius: 10, border: "1px solid #e7decf", background: "#fffdf9" }}
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
          contentStyle={{ borderRadius: 10, border: "1px solid #e7decf", background: "#fffdf9" }}
        />
        <Line type="monotone" dataKey="temp" stroke="#b26a54" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
