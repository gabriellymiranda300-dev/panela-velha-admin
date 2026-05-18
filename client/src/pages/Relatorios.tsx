import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart3, TrendingUp, ShoppingBag, DollarSign, Loader2 } from "lucide-react";
import { useState } from "react";

const PERIOD_OPTIONS = [
  { value: "semana", label: "Semanal" },
  { value: "mes", label: "Mensal" },
  { value: "ano", label: "Anual" },
];

const STATUS_COLORS: Record<string, string> = {
  novo: "#3b82f6",
  em_preparo: "#f59e0b",
  pronto: "#22c55e",
  entregue: "#6b7280",
  cancelado: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_preparo: "Em Preparo",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export default function Relatorios() {
  const [period, setPeriod] = useState("mes");

  const { data: salesData, isLoading: loadingSales } = trpc.reports.salesChart.useQuery({ period });
  const { data: ordersByStatus, isLoading: loadingStatus } = trpc.reports.ordersByStatus.useQuery({ period });
  const { data: cashFlow, isLoading: loadingCash } = trpc.reports.cashFlowChart.useQuery({ period });
  const { data: topProducts, isLoading: loadingProducts } = trpc.reports.topProducts.useQuery({ period });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Relatórios & Análises
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visualize o desempenho do restaurante por período
            </p>
          </div>
          <div className="flex bg-muted rounded-lg p-1 gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  period === opt.value
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gráfico de Receita */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Receita por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSales ? (
              <LoadingChart />
            ) : !salesData || salesData.length === 0 ? (
              <EmptyChart message="Nenhuma venda registrada no período" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.45 0.18 25)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="oklch(0.45 0.18 25)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Receita"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="oklch(0.45 0.18 25)"
                    strokeWidth={2.5}
                    fill="url(#gradRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pedidos por período */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                Pedidos por Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSales ? (
                <LoadingChart />
              ) : !salesData || salesData.length === 0 ? (
                <EmptyChart message="Nenhum pedido no período" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(v: number) => [v, "Pedidos"]}
                      contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="orders" fill="oklch(0.68 0.16 50)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pedidos por status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Pedidos por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStatus ? (
                <LoadingChart />
              ) : !ordersByStatus || ordersByStatus.length === 0 ? (
                <EmptyChart message="Nenhum pedido no período" />
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={200}>
                    <PieChart>
                      <Pie
                        data={ordersByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="count"
                      >
                        {ordersByStatus.map((entry, index) => (
                          <Cell key={index} fill={STATUS_COLORS[entry.status] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, _: string, p: any) => [v, STATUS_LABELS[p.payload.status] ?? p.payload.status]}
                        contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {ordersByStatus.map((entry) => (
                      <div key={entry.status} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[entry.status] ?? "#94a3b8" }} />
                          <span className="text-muted-foreground">{STATUS_LABELS[entry.status] ?? entry.status}</span>
                        </div>
                        <span className="font-semibold text-foreground">{entry.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fluxo de caixa */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Fluxo de Caixa — Entradas vs Saídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCash ? (
              <LoadingChart />
            ) : !cashFlow || cashFlow.length === 0 ? (
              <EmptyChart message="Nenhuma transação no período" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [`R$ ${v.toFixed(2)}`, name === "income" ? "Entradas" : "Saídas"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Legend formatter={(v) => v === "income" ? "Entradas" : "Saídas"} />
                  <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Produtos mais vendidos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              Itens Mais Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <LoadingChart />
            ) : !topProducts || topProducts.length === 0 ? (
              <EmptyChart message="Nenhum dado de produtos no período" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip
                    formatter={(v: number) => [v, "Pedidos"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" fill="oklch(0.45 0.18 25)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function LoadingChart() {
  return (
    <div className="h-48 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
      <BarChart3 className="w-10 h-10 opacity-20" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
