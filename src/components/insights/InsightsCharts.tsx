import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatInsightDate, paymentTone, statusTone, toneStyles } from "./insightsUtils";

const TONE_HEX = {
  success: "#10b981",
  info: "#0ea5e9",
  warning: "#f59e0b",
  danger: "#f43f5e",
  muted: "#94a3b8",
} as const;

const FALLBACK_COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#f43f5e", "#64748b"];

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground flex h-[220px] items-center justify-center rounded-md border border-dashed text-sm">
      {message}
    </div>
  );
}

function ChartTooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: Record<string, unknown> }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      {payload.map((item) => (
        <p key={item.name} className="text-muted-foreground">
          <span className="text-foreground">{item.name}: </span>
          {String(item.payload?.formatted ?? item.value)}
        </p>
      ))}
    </div>
  );
}

function compactAxis(value: number) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(Math.round(value));
}

export function SalesByDayChart({
  rows,
  money,
}: {
  rows: Array<{ date: string; orders: number; sales: number }>;
  money: (amount: number) => string;
}) {
  const hasData = rows.some((row) => row.sales > 0);
  if (!hasData) return <ChartEmpty message="No completed sales in this period." />;

  const data = rows.map((row) => ({
    label: formatInsightDate(row.date),
    sales: row.sales,
    orders: row.orders,
    formatted: `${money(row.sales)} · ${row.orders} orders`,
  }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="insights-sales-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={36}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={compactAxis}
          />
          <Tooltip
            content={<ChartTooltipBox />}
            cursor={{ stroke: "var(--border)" }}
          />
          <Area
            type="monotone"
            dataKey="sales"
            name="Sales"
            stroke="var(--primary)"
            fill="url(#insights-sales-fill)"
            strokeWidth={2}
            dot={data.length <= 14}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MixDonutChart({
  rows,
  labelFor,
  money,
  toneFor,
  empty = "No orders in this period.",
}: {
  rows: Array<{ key: string; count: number; total: number }>;
  labelFor: (key: string) => string;
  money: (amount: number) => string;
  toneFor: (key: string) => keyof typeof toneStyles;
  empty?: string;
}) {
  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);
  if (totalCount === 0) return <ChartEmpty message={empty} />;

  const data = rows.map((row, index) => {
    const tone = toneFor(row.key);
    return {
      name: labelFor(row.key),
      value: row.count,
      formatted: `${row.count} · ${money(row.total)}`,
      color: TONE_HEX[tone] || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    };
  });

  return (
    <div className="flex h-[220px] items-center gap-3">
      <div className="h-full min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              stroke="var(--card)"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltipBox />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-[42%] shrink-0 space-y-1.5">
        {data.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ background: entry.color }} />
              <span className="truncate">{entry.name}</span>
            </span>
            <span className="text-muted-foreground shrink-0 tabular-nums">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { paymentTone, statusTone };
