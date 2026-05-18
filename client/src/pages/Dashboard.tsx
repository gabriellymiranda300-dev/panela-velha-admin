import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  ClipboardList,
  Package,
  DollarSign,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChefHat,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: summary, isLoading } = trpc.dashboard.summary.useQuery();
  const { data: weeklyChart } = trpc.dashboard.weeklyChart.useQuery();

  const quickLinks = [
    {
      icon: ClipboardList,
      label: "Novo Pedido",
      desc: "Registrar pedido manual",
      path: "/pedidos",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: Package,
      label: "Estoque",
      desc: "Gerenciar produtos",
      path: "/estoque",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: DollarSign,
      label: "Caixa",
      desc: "Registrar transação",
      path: "/caixa",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      icon: BarChart3,
      label: "Relatórios",
      desc: "Ver análises",
      path: "/relatorios",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Painel Principal
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-lg px-3 py-1.5">
            <ChefHat className="w-4 h-4" />
            <span className="text-sm font-medium">Panela Velha</span>
          </div>
        </div>

        {/* Cards de resumo */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Pedidos Hoje"
              value={String(summary?.todayOrders ?? 0)}
              icon={ClipboardList}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
              trend={summary?.todayOrders ? `+${summary.todayOrders} hoje` : "Nenhum ainda"}
            />
            <SummaryCard
              title="Receita do Dia"
              value={`R$ ${Number(summary?.todayRevenue ?? 0).toFixed(2)}`}
              icon={TrendingUp}
              iconColor="text-green-600"
              iconBg="bg-green-50"
              trend="Entradas confirmadas"
            />
            <SummaryCard
              title="Em Andamento"
              value={String(summary?.activeOrders ?? 0)}
              icon={Clock}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
              trend="Pedidos em preparo"
            />
            <SummaryCard
              title="Estoque Baixo"
              value={String(summary?.lowStockItems ?? 0)}
              icon={AlertTriangle}
              iconColor={summary?.lowStockItems ? "text-red-600" : "text-gray-400"}
              iconBg={summary?.lowStockItems ? "bg-red-50" : "bg-gray-50"}
              trend={summary?.lowStockItems ? "Requer atenção!" : "Tudo em ordem"}
              alert={!!summary?.lowStockItems}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico semanal */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Vendas da Semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyChart && weeklyChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={weeklyChart}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.45 0.18 25)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="oklch(0.45 0.18 25)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.015 55)" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]}
                        contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="oklch(0.45 0.18 25)"
                        strokeWidth={2}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                    Nenhum dado de venda disponível ainda.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pedidos recentes */}
          <div>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Pedidos Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary?.recentOrders && summary.recentOrders.length > 0 ? (
                  <>
                    {summary.recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            R$ {Number(order.totalAmount).toFixed(2)}
                          </p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-primary hover:text-primary"
                      onClick={() => navigate("/pedidos")}
                    >
                      Ver todos <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    Nenhum pedido hoje
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Atalhos rápidos */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Acesso Rápido
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="flex flex-col items-start p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-lg ${link.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <link.icon className={`w-5 h-5 ${link.color}`} />
                </div>
                <p className="text-sm font-semibold text-foreground">{link.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  alert,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend: string;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-red-200 bg-red-50/30" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          {alert && (
            <span className="w-2 h-2 rounded-full bg-red-500 mt-1" />
          )}
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">{title}</p>
        <p className={`text-xs mt-1 ${alert ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    novo: { label: "Novo", className: "status-novo" },
    em_preparo: { label: "Preparo", className: "status-em_preparo" },
    pronto: { label: "Pronto", className: "status-pronto" },
    entregue: { label: "Entregue", className: "status-entregue" },
    cancelado: { label: "Cancelado", className: "status-cancelado" },
  };
  const s = map[status] ?? { label: status, className: "" };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.className}`}>
      {s.label}
    </span>
  );
}
