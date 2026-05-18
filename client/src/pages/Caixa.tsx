import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Search,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const INCOME_CATEGORIES = ["Vendas", "Delivery", "Eventos", "Outros"];
const EXPENSE_CATEGORIES = ["Ingredientes", "Embalagens", "Funcionários", "Aluguel", "Energia", "Água", "Gás", "Manutenção", "Marketing", "Outros"];
const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Transferência"];

export default function Caixa() {
  const [showForm, setShowForm] = useState(false);
  const [defaultType, setDefaultType] = useState<"entrada" | "saida">("entrada");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [period, setPeriod] = useState("mes");

  const { data: transactions, isLoading, refetch } = trpc.cash.list.useQuery({ period });
  const { data: summary } = trpc.cash.summary.useQuery({ period });
  const deleteTransaction = trpc.cash.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Transação removida!"); },
    onError: () => toast.error("Erro ao remover transação"),
  });

  const filtered = (transactions ?? []).filter((t) => {
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "todos" || t.type === typeFilter;
    return matchSearch && matchType;
  });

  const balance = Number(summary?.totalIncome ?? 0) - Number(summary?.totalExpense ?? 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Fluxo de Caixa
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Controle de entradas, saídas e saldo financeiro
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => { setDefaultType("saida"); setShowForm(true); }}
            >
              <ArrowDownCircle className="w-4 h-4 mr-2" />
              Saída
            </Button>
            <Button
              onClick={() => { setDefaultType("entrada"); setShowForm(true); }}
              className="text-white font-semibold"
              style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.55 0.16 40) 100%)" }}
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Entrada
            </Button>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className={`border-2 ${balance >= 0 ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${balance >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                  <Wallet className={`w-5 h-5 ${balance >= 0 ? "text-green-600" : "text-red-600"}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Saldo do Período</p>
                  <p className={`text-xl font-bold ${balance >= 0 ? "text-green-700" : "text-red-700"}`}>
                    R$ {Math.abs(balance).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total de Entradas</p>
                  <p className="text-xl font-bold text-green-700">
                    R$ {Number(summary?.totalIncome ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total de Saídas</p>
                  <p className="text-xl font-bold text-red-700">
                    R$ {Number(summary?.totalExpense ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="entrada">Entradas</SelectItem>
              <SelectItem value="saida">Saídas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="ano">Este ano</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de transações */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma transação encontrada</p>
            <p className="text-sm mt-1">Registre entradas e saídas financeiras</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        t.type === "entrada" ? "bg-green-100" : "bg-red-100"
                      }`}>
                        {t.type === "entrada"
                          ? <ArrowUpCircle className="w-5 h-5 text-green-600" />
                          : <ArrowDownCircle className="w-5 h-5 text-red-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{t.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {t.category}
                          </span>
                          {t.paymentMethod && (
                            <span className="text-xs text-muted-foreground">{t.paymentMethod}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={`font-bold text-base ${t.type === "entrada" ? "text-green-700" : "text-red-700"}`}>
                          {t.type === "entrada" ? "+" : "-"}R$ {Number(t.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.referenceDate).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Button
                        size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Remover esta transação?")) deleteTransaction.mutate({ id: t.id }); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TransactionDialog
        open={showForm}
        defaultType={defaultType}
        onClose={() => setShowForm(false)}
        onSuccess={() => { refetch(); setShowForm(false); }}
      />
    </DashboardLayout>
  );
}

function TransactionDialog({ open, defaultType, onClose, onSuccess }: any) {
  const [type, setType] = useState<"entrada" | "saida">(defaultType);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().split("T")[0]);

  const create = trpc.cash.create.useMutation({
    onSuccess: () => { toast.success("Transação registrada!"); onSuccess(); },
    onError: () => toast.error("Erro ao registrar transação"),
  });

  const handleSubmit = () => {
    if (!amount || Number(amount) <= 0) return toast.error("Informe um valor válido");
    if (!category) return toast.error("Selecione uma categoria");
    if (!description.trim()) return toast.error("Informe uma descrição");
    create.mutate({ type, amount, category, description, paymentMethod, referenceDate: new Date(referenceDate + "T12:00:00") });
  };

  const categories = type === "entrada" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
            {type === "entrada" ? "Nova Entrada" : "Nova Saída"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => { setType("entrada"); setCategory(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                type === "entrada" ? "bg-green-100 text-green-700 border-green-300" : "bg-card text-muted-foreground border-border"
              }`}
            >
              <ArrowUpCircle className="w-4 h-4 inline mr-1.5" />
              Entrada
            </button>
            <button
              onClick={() => { setType("saida"); setCategory(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                type === "saida" ? "bg-red-100 text-red-700 border-red-300" : "bg-card text-muted-foreground border-border"
              }`}
            >
              <ArrowDownCircle className="w-4 h-4 inline mr-1.5" />
              Saída
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor (R$) *</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0.01" step="0.01" placeholder="0,00" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição *</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Venda do almoço" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria *</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Pagamento</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Data</label>
            <Input type="date" value={referenceDate} onChange={(e) => setReferenceDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={create.isPending} className="text-white" style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.55 0.16 40) 100%)" }}>
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
