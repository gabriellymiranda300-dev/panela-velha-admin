import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ClipboardList,
  Search,
  Plus,
  Eye,
  ChevronRight,
  Loader2,
  Phone,
  User,
  StickyNote,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type OrderStatus = "novo" | "em_preparo" | "pronto" | "entregue" | "cancelado";

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string; next?: OrderStatus }> = {
  novo: { label: "Novo", className: "status-novo", next: "em_preparo" },
  em_preparo: { label: "Em Preparo", className: "status-em_preparo", next: "pronto" },
  pronto: { label: "Pronto", className: "status-pronto", next: "entregue" },
  entregue: { label: "Entregue", className: "status-entregue" },
  cancelado: { label: "Cancelado", className: "status-cancelado" },
};

export default function Pedidos() {
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);

  const { data: orders, isLoading, refetch } = trpc.orders.list.useQuery({ status: statusFilter === "todos" ? undefined : statusFilter as OrderStatus });
  const { data: selectedOrder } = trpc.orders.getById.useQuery(
    { id: selectedOrderId! },
    { enabled: !!selectedOrderId }
  );
  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Status atualizado!"); },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const filtered = orders?.filter((o) =>
    o.customerName.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const statusCounts = orders?.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Gestão de Pedidos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Acompanhe e gerencie todos os pedidos do restaurante
            </p>
          </div>
          <Button
            onClick={() => setShowNewOrder(true)}
            className="text-white font-semibold"
            style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.55 0.16 40) 100%)" }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Pedido
          </Button>
        </div>

        {/* Filtros de status */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("todos")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              statusFilter === "todos"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            Todos ({orders?.length ?? 0})
          </button>
          {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista de pedidos */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum pedido encontrado</p>
            <p className="text-sm mt-1">Tente outro filtro ou crie um novo pedido</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const s = STATUS_CONFIG[order.status as OrderStatus];
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary">
                            #{order.id}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{order.customerName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.className}`}>
                              {s.label}
                            </span>
                            {order.customerPhone && (
                              <span className="text-xs text-muted-foreground">{order.customerPhone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="font-bold text-foreground">R$ {Number(order.totalAmount).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {s.next && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                            onClick={() => updateStatus.mutate({ id: order.id, status: s.next! })}
                            disabled={updateStatus.isPending}
                          >
                            <ChevronRight className="w-3 h-3 mr-1" />
                            {STATUS_CONFIG[s.next].label}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      <Dialog open={!!selectedOrderId} onOpenChange={() => setSelectedOrderId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              <ClipboardList className="w-5 h-5 text-primary" />
              Pedido #{selectedOrder?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={User} label="Cliente" value={selectedOrder.customerName} />
                {selectedOrder.customerPhone && (
                  <InfoRow icon={Phone} label="Telefone" value={selectedOrder.customerPhone} />
                )}
                {selectedOrder.paymentMethod && (
                  <InfoRow icon={CreditCard} label="Pagamento" value={selectedOrder.paymentMethod} />
                )}
              </div>

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Itens</p>
                  <div className="space-y-1.5">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-foreground">{item.quantity}x {item.productName}</span>
                        <span className="font-medium">R$ {(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold text-base mt-3 pt-3 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">R$ {Number(selectedOrder.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Observações</p>
                  </div>
                  <p className="text-sm text-foreground">{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Alterar Status</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        updateStatus.mutate({ id: selectedOrder.id, status: s });
                        setSelectedOrderId(null);
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all border ${
                        selectedOrder.status === s
                          ? STATUS_CONFIG[s].className + " font-bold"
                          : "bg-card text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrderId(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal novo pedido */}
      <NewOrderDialog open={showNewOrder} onClose={() => setShowNewOrder(false)} onSuccess={() => { refetch(); setShowNewOrder(false); }} />
    </DashboardLayout>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function NewOrderDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [items, setItems] = useState([{ productName: "", quantity: 1, unitPrice: "" }]);

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => { toast.success("Pedido criado!"); onSuccess(); resetForm(); },
    onError: () => toast.error("Erro ao criar pedido"),
  });

  const resetForm = () => {
    setCustomerName(""); setCustomerPhone(""); setNotes(""); setPaymentMethod("Pix");
    setItems([{ productName: "", quantity: 1, unitPrice: "" }]);
  };

  const addItem = () => setItems([...items, { productName: "", quantity: 1, unitPrice: "" }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string | number) =>
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const total = items.reduce((sum, item) => sum + (Number(item.unitPrice) * item.quantity || 0), 0);

  const handleSubmit = () => {
    if (!customerName.trim()) return toast.error("Informe o nome do cliente");
    const validItems = items.filter((i) => i.productName && Number(i.unitPrice) > 0);
    if (validItems.length === 0) return toast.error("Adicione ao menos um item válido");
    createOrder.mutate({
      customerName,
      customerPhone: customerPhone || undefined,
      notes: notes || undefined,
      paymentMethod,
      items: validItems.map((i) => ({ productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>Novo Pedido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome do Cliente *</label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Pagamento</label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Pix", "Cartão de Crédito", "Cartão de Débito", "Dinheiro"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Itens do Pedido *</label>
              <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="Nome do item"
                    value={item.productName}
                    onChange={(e) => updateItem(i, "productName", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qtd"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                    className="w-16"
                    min={1}
                  />
                  <Input
                    type="number"
                    placeholder="R$"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                    className="w-24"
                    step="0.01"
                  />
                  {items.length > 1 && (
                    <Button size="sm" variant="ghost" onClick={() => removeItem(i)} className="h-9 w-9 p-0 text-destructive">×</Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-sm font-bold text-primary">Total: R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alguma observação especial?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={createOrder.isPending}
            className="text-white"
            style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.55 0.16 40) 100%)" }}
          >
            {createOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Criar Pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
