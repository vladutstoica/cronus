import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface TodoStatsProps {
  stats: { date: string; created: number; completed: number }[];
  selectedDate: Date;
}

export function TodoStats({ stats, selectedDate }: TodoStatsProps) {
  const chartData = useMemo(() => {
    // Generate last 7 days
    const days: {
      date: string;
      dayLabel: string;
      created: number;
      completed: number;
    }[] = [];
    const today = new Date(selectedDate);

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayLabel = date.toLocaleDateString(undefined, { weekday: "short" });

      const stat = stats.find((s) => s.date === dateStr);
      days.push({
        date: dateStr,
        dayLabel,
        created: stat?.created || 0,
        completed: stat?.completed || 0,
      });
    }

    return days;
  }, [stats, selectedDate]);

  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, day) => ({
        created: acc.created + day.created,
        completed: acc.completed + day.completed,
      }),
      { created: 0, completed: 0 },
    );
  }, [chartData]);

  const completionRate = useMemo(() => {
    if (totals.created === 0) return 0;
    return Math.round((totals.completed / totals.created) * 100);
  }, [totals]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Weekly Report</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{totals.created}</p>
            <p className="text-xs text-muted-foreground">Created</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">
              {totals.completed}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">Completion Rate</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="dayLabel"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelFormatter={(value, payload) => {
                  if (payload?.[0]?.payload?.date) {
                    return new Date(payload[0].payload.date).toLocaleDateString(
                      undefined,
                      { weekday: "long", month: "short", day: "numeric" },
                    );
                  }
                  return value;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="created"
                name="Created"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="completed"
                name="Completed"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
