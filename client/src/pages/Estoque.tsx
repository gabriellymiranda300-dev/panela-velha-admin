import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Package,
  Plus,
  AlertTriangle,
  Search,
  Edit2,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORIES = ["Carnes", "Grãos e Cereais", "Laticínios", "Hortifruti", "Bebidas", "Temperos", "Embalagens", "Outros"];
const UNITS = ["kg", "g", "L", "ml", "un", "cx", "pct", "dz"];

export default function Estoque() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [movementItem, setMovementItem] = useState<any>(null);
  const [historyItem, setHistoryItem] = useState<any>(null);

  const { data: items, isLoading, refetch } = trpc.stock.list.useQuery();
  const deleteItem = trpc.stock.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Item removido!"); },
    onError: () => toast.error("Erro ao remover item"),
  });

  const filtered = (items ?? []).filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "todos" || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const lowStockItems = (items ?? []).filter(
    (i) => Number(i.currentQuantity) <= Number(i.minimumQuantity)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Controle de Estoque
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie produtos, ingredientes e movimentações
            </p>
          </div>
          <Button
            onClick={() => { setEditingItem(null); setShowForm(true); }}
            className="text-white font-semibold"
            style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.55 0.16 40) 100%)" }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Item
          </Button>
        </div>

        {/* Alerta de estoque baixo */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {lowStockItems.length} {lowStockItems.length === 1 ? "item" : "itens"} com estoque baixo
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {lowStockItems.map((i) => i.name).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as categorias</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela de itens */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum item encontrado</p>
            <p className="text-sm mt-1">Cadastre produtos e ingredientes do estoque</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const isLow = Number(item.currentQuantity) <= Number(item.minimumQuantity);
              return (
                <Card key={item.id} className={`hover:shadow-md transition-shadow ${isLow ? "border-red-200" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isLow ? "bg-red-100" : "bg-amber-50"}`}>
                          <Package className={`w-5 h-5 ${isLow ? "text-red-600" : "text-amber-600"}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground truncate">{item.name}</p>
                            {isLow && (
                              <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                Baixo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.category || "Sem categoria"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className={`font-bold ${isLow ? "text-red-600" : "text-foreground"}`}>
                            {Number(item.currentQuantity).toFixed(item.unit === "un" ? 0 : 2)} {item.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Mín: {Number(item.minimumQuantity).toFixed(item.unit === "un" ? 0 : 2)} {item.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => setMovementItem({ ...item, movType: "entrada" })}
                            title="Entrada"
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setMovementItem({ ...item, movType: "saida" })}
                            title="Saída"
                          >
                            <ArrowDownCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-8 w-8 p-0"
                            onClick={() => setHistoryItem(item)}
                            title="Histórico"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-8 w-8 p-0"
                            onClick={() => { setEditingItem(item); setShowForm(true); }}
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm("Remover este item?")) deleteItem.mutate({ id: item.id }); }}
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de cadastro/edição */}
      <StockItemDialog
        open={showForm}
        item={editingItem}
        onClose={() => setShowForm(false)}
        onSuccess={() => { refetch(); setShowForm(false); }}
      />

      {/* Modal de movimentação */}
      {movementItem && (
        <MovementDialog
          item={movementItem}
          defaultType={movementItem.movType}
          onClose={() => setMovementItem(null)}
          onSuccess={() => { refetch(); setMovementItem(null); }}
        />
      )}

      {/* Modal de histórico */}
      {historyItem && (
        <HistoryDialog item={historyItem} onClose={() => setHistoryItem(null)} />
      )}
    </DashboardLayout>
  );
}

function StockItemDialog({ open, item, onClose, onSuccess }: any) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "kg");
  const [currentQty, setCurrentQty] = useState(item?.currentQuantity ?? "0");
  const [minQty, setMinQty] = useState(item?.minimumQuantity ?? "0");
  const [costPerUnit, setCostPerUnit] = useState(item?.costPerUnit ?? "");

  const create = trpc.stock.create.useMutation({
    onSuccess: () => { toast.success("Item cadastrado!"); onSuccess(); },
    onError: () => toast.error("Erro ao cadastrar item"),
  });
  const update = trpc.stock.update.useMutation({
    onSuccess: () => { toast.success("Item atualizado!"); onSuccess(); },
    onError: () => toast.error("Erro ao atualizar item"),
  });

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("Informe o nome do item");
    const payload = {
      name, category: category || undefined, unit,
      currentQuantity: String(currentQty), minimumQuantity: String(minQty),
      costPerUnit: costPerUnit ? String(costPerUnit) : undefined,
    };
    if (item) update.mutate({ id: item.id, ...payload });
    else create.mutate(payload);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
            {item ? "Editar Item" : "Novo Item de Estoque"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Arroz branco" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Unidade</label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Qtd. Atual</label>
              <Input type="number" value={currentQty} onChange={(e) => setCurrentQty(e.target.value)} min="0" step="0.001" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Qtd. Mínima</label>
              <Input type="number" value={minQty} onChange={(e) => setMinQty(e.target.value)} min="0" step="0.001" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Custo/Un (R$)</label>
              <Input type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} min="0" step="0.01" placeholder="0,00" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="text-white" style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.55 0.16 40) 100%)" }}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {item ? "Salvar" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({ item, defaultType, onClose, onSuccess }: any) {
  const [type, setType] = useState<"entrada" | "saida" | "ajuste">(defaultType ?? "entrada");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const addMovement = trpc.stock.addMovement.useMutation({
    onSuccess: () => { toast.success("Movimentação registrada!"); onSuccess(); },
    onError: () => toast.error("Erro ao registrar movimentação"),
  });

  const handleSubmit = () => {
    if (!quantity || Number(quantity) <= 0) return toast.error("Informe uma quantidade válida");
    addMovement.mutate({ stockItemId: item.id, type, quantity, reason: reason || undefined });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
            Movimentação — {item.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
            <div className="flex gap-2">
              {(["entrada", "saida", "ajuste"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border ${
                    type === t
                      ? t === "entrada" ? "bg-green-100 text-green-700 border-green-300"
                        : t === "saida" ? "bg-red-100 text-red-700 border-red-300"
                        : "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-card text-muted-foreground border-border"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Quantidade ({item.unit})
            </label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0.001" step="0.001" placeholder="0" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Motivo</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Compra, uso em preparo..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={addMovement.isPending} className="text-white" style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.55 0.16 40) 100%)" }}>
            {addMovement.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ item, onClose }: any) {
  const { data: movements, isLoading } = trpc.stock.movements.useQuery({ stockItemId: item.id });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
            Histórico — {item.name}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : !movements || movements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma movimentação registrada
          </div>
        ) : (
          <div className="space-y-2">
            {movements.map((m) => (
              <div key={m.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  m.type === "entrada" ? "bg-green-100" : m.type === "saida" ? "bg-red-100" : "bg-blue-100"
                }`}>
                  {m.type === "entrada" ? <ArrowUpCircle className="w-4 h-4 text-green-600" /> :
                   m.type === "saida" ? <ArrowDownCircle className="w-4 h-4 text-red-600" /> :
                   <History className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${
                      m.type === "entrada" ? "text-green-700" : m.type === "saida" ? "text-red-700" : "text-blue-700"
                    }`}>
                      {m.type === "entrada" ? "+" : m.type === "saida" ? "-" : "~"}{Number(m.quantity).toFixed(2)} {item.unit}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {m.reason && <p className="text-xs text-muted-foreground mt-0.5">{m.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
