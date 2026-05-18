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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  DollarSign,
  Image as ImageIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Cardapio() {
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data: categories, refetch: refetchCategories } = trpc.menu.categories.useQuery();
  const { data: items, refetch: refetchItems } = trpc.menu.items.useQuery();

  const deleteCategory = trpc.menu.deleteCategory.useMutation({
    onSuccess: () => { refetchCategories(); toast.success("Categoria removida!"); },
    onError: () => toast.error("Erro ao remover categoria"),
  });

  const deleteItem = trpc.menu.deleteItem.useMutation({
    onSuccess: () => { refetchItems(); toast.success("Item removido!"); },
    onError: () => toast.error("Erro ao remover item"),
  });

  const filteredItems = selectedCategory
    ? (items ?? []).filter((i) => String(i.categoryId) === selectedCategory)
    : (items ?? []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Gerenciar Cardápio
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Controle os pratos, categorias e disponibilidade do menu
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="categorias" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
            <TabsTrigger value="pratos">Pratos</TabsTrigger>
          </TabsList>

          {/* Categorias Tab */}
          <TabsContent value="categorias" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => { setEditingCategory(null); setShowCategoryForm(true); }}
                className="text-white font-semibold"
                style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.55 0.16 40) 100%)" }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Categoria
              </Button>
            </div>

            {!categories || categories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma categoria cadastrada</p>
                <p className="text-sm mt-1">Crie categorias para organizar o cardápio</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {categories.map((cat) => (
                  <Card key={cat.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{cat.name}</p>
                        {cat.description && <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm" variant="ghost" className="h-8 w-8 p-0"
                          onClick={() => { setEditingCategory(cat); setShowCategoryForm(true); }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive"
                          onClick={() => {
                            if (confirm("Remover esta categoria e todos os seus pratos?")) {
                              deleteCategory.mutate({ id: cat.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pratos Tab */}
          <TabsContent value="pratos" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as categorias</SelectItem>
                  {(categories ?? []).map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => { setEditingItem(null); setShowItemForm(true); }}
                className="text-white font-semibold"
                style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.55 0.16 40) 100%)" }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Prato
              </Button>
            </div>

            {!items || items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum prato cadastrado</p>
                <p className="text-sm mt-1">Adicione pratos ao cardápio</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium">Nenhum prato nesta categoria</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredItems.map((item) => {
                  const cat = categories?.find((c) => c.id === item.categoryId);
                  return (
                    <Card key={item.id} className={`hover:shadow-md transition-shadow ${!item.available ? "opacity-60" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-1">
                                <ImageIcon className="w-5 h-5 opacity-50" />
                                <span className="text-[10px]">Sem foto</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-foreground truncate">{item.name}</p>
                              {!item.available && (
                                <Badge variant="secondary" className="text-xs shrink-0">Indisponível</Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="bg-muted px-2 py-1 rounded">{cat?.name}</span>
                              <span className="font-semibold text-foreground flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {Number(item.price).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm" variant="ghost" className="h-8 w-8 p-0"
                              onClick={() => { setEditingItem(item); setShowItemForm(true); }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive"
                              onClick={() => {
                                if (confirm("Remover este prato?")) {
                                  deleteItem.mutate({ id: item.id });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de categoria */}
      <CategoryDialog
        open={showCategoryForm}
        category={editingCategory}
        onClose={() => setShowCategoryForm(false)}
        onSuccess={() => { refetchCategories(); setShowCategoryForm(false); }}
      />

      {/* Modal de prato */}
      <ItemDialog
        open={showItemForm}
        item={editingItem}
        categories={categories ?? []}
        onClose={() => setShowItemForm(false)}
        onSuccess={() => { refetchItems(); setShowItemForm(false); }}
      />
    </DashboardLayout>
  );
}

function CategoryDialog({ open, category, onClose, onSuccess }: any) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open && category) {
      setName(category.name);
      setDescription(category.description || "");
    } else if (open && !category) {
      setName("");
      setDescription("");
    }
  }, [open, category]);

  const create = trpc.menu.createCategory.useMutation({
    onSuccess: () => { toast.success("Categoria criada!"); onSuccess(); },
    onError: () => toast.error("Erro ao criar categoria"),
  });
  const update = trpc.menu.updateCategory.useMutation({
    onSuccess: () => { toast.success("Categoria atualizada!"); onSuccess(); },
    onError: () => toast.error("Erro ao atualizar categoria"),
  });

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("Informe o nome da categoria");
    const payload = { name, description: description || undefined };
    if (category) update.mutate({ id: category.id, ...payload });
    else create.mutate(payload);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
            {category ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Marmitas" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição da categoria" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="text-white" style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.55 0.16 40) 100%)" }}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {category ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({ open, item, categories, onClose, onSuccess }: any) {
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (open && item) {
      setCategoryId(String(item.categoryId));
      setName(item.name);
      setDescription(item.description || "");
      setPrice(item.price);
      setImageUrl(item.imageUrl || "");
      setAvailable(item.available);
    } else if (open && !item) {
      setCategoryId("");
      setName("");
      setDescription("");
      setPrice("");
      setImageUrl("");
      setAvailable(true);
    }
  }, [open, item]);

  const create = trpc.menu.createItem.useMutation({
    onSuccess: () => { toast.success("Prato criado!"); onSuccess(); },
    onError: () => toast.error("Erro ao criar prato"),
  });
  const update = trpc.menu.updateItem.useMutation({
    onSuccess: () => { toast.success("Prato atualizado!"); onSuccess(); },
    onError: () => toast.error("Erro ao atualizar prato"),
  });

  const handleSubmit = () => {
    if (!name.trim()) return toast.error("Informe o nome do prato");
    if (!categoryId) return toast.error("Selecione uma categoria");
    if (!price || Number(price) <= 0) return toast.error("Informe um preço válido");
    const payload = {
      categoryId: Number(categoryId),
      name,
      description: description || undefined,
      price: String(price),
      imageUrl: imageUrl.trim() || undefined,
      available,
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
            {item ? "Editar Prato" : "Novo Prato"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria *</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Marmita de Frango" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do prato" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Preço (R$) *</label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0.01" step="0.01" placeholder="0,00" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">URL da foto do prato</label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://.../foto-do-prato.webp" />
            {imageUrl.trim() && (
              <div className="mt-2 rounded-xl overflow-hidden border border-border bg-muted h-36">
                <img src={imageUrl} alt="Prévia do prato" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label className="text-xs font-medium text-foreground cursor-pointer">Disponível</label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="text-white" style={{ background: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.55 0.16 40) 100%)" }}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {item ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
