/*
 * Menu — Panela Velha
 * Exibe o cardápio vindo do painel administrativo quando a API estiver disponível.
 * Se a API falhar, mantém o cardápio estático atual como fallback.
 */
import { ShoppingCart, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { fetchMenuFromAPI, type MenuCategoryFromAPI } from "@/lib/api";

const DAILY_MENU = [
  {
    day: "Segunda-Feira",
    dish: "Costela Suína BBQ",
    description: "Acompanha arroz, salada e batata frita",
    price: 28.9,
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663658405775/kQVQpftc3b77nEataXztAL/prato-segunda-costela-c23AWFbSHzUb4FYwKaEh8A.webp",
  },
  {
    day: "Terça-Feira",
    dish: "Stroganoff de Frango",
    description: "Acompanha arroz, batata frita ou batata palha e salada",
    price: 24.9,
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663658405775/kQVQpftc3b77nEataXztAL/prato-terca-frango-jhzmuTzgxcSzfcUzVKGgu4.webp",
  },
  {
    day: "Quarta-Feira",
    dish: "Feijoada Completa",
    description: "Acompanha arroz, couve, farofa e laranja",
    price: 26.9,
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663658405775/kQVQpftc3b77nEataXztAL/prato-quarta-feijoada-bz6vdkkJF88zeovBHPcg8o.webp",
  },
  {
    day: "Quinta-Feira",
    dish: "Filé à Parmegiana",
    description: "Acompanha arroz, batata frita e salada",
    price: 32.9,
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663658405775/kQVQpftc3b77nEataXztAL/prato-quinta-fileparmegiana-42CCEjvA7M3MJUHbsieZb9.webp",
  },
  {
    day: "Sexta-Feira",
    dish: "Tilápia ao Camarão",
    description: "Acompanha arroz colorido e purê de batata ou mandioquinha",
    price: 34.9,
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663658405775/kQVQpftc3b77nEataXztAL/prato-sexta-tilapia-WSpWH9iG7ZmKvtctouUPro.webp",
  },
];

const BEVERAGES = [
  { id: "coca-zero", name: "Coca-Cola Zero", size: "500ml (lata)", price: 5.0 },
  { id: "coca-normal", name: "Coca-Cola Normal", size: "500ml (lata)", price: 5.0 },
  { id: "sprite", name: "Sprite Lemon Fresh", size: "500ml", price: 5.0 },
  { id: "fanta", name: "Fanta Uva", size: "500ml (lata)", price: 5.0 },
  { id: "guarana", name: "Guaraná", size: "500ml (lata)", price: 5.0 },
  { id: "suco-maracuja", name: "Suco Natural Maracujá", size: "500ml", price: 6.0 },
  { id: "suco-laranja", name: "Suco Natural Laranja", size: "500ml", price: 6.0 },
  { id: "agua-com-gas", name: "Água com Gás", size: "500ml", price: 3.0 },
  { id: "agua-sem-gas", name: "Água sem Gás", size: "500ml", price: 2.5 },
];

type SiteMenuItem = {
  key: string;
  categoryName: string;
  label?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string | null;
  menuItemId?: number;
};

type SiteMenuCategory = {
  id: string;
  name: string;
  description?: string | null;
  items: SiteMenuItem[];
};

function normalizeApiMenu(categories: MenuCategoryFromAPI[]): SiteMenuCategory[] {
  return categories
    .map((category) => ({
      id: String(category.id),
      name: category.name,
      description: category.description,
      items: (category.items || [])
        .filter((item) => item.available !== false)
        .map((item) => ({
          key: `api-${item.id}`,
          categoryName: category.name,
          name: item.name,
          description: item.description || undefined,
          price: Number(item.price),
          imageUrl: item.imageUrl || undefined,
          menuItemId: item.id,
        }))
        .filter((item) => Number.isFinite(item.price) && item.price > 0),
    }))
    .filter((category) => category.items.length > 0);
}

function getFallbackMenu(): SiteMenuCategory[] {
  return [
    {
      id: "semana",
      name: "Cardápio da Semana",
      items: DAILY_MENU.map((item) => ({
        key: `fallback-${item.day}`,
        categoryName: "Cardápio da Semana",
        label: item.day,
        name: item.dish,
        description: item.description,
        price: item.price,
        imageUrl: item.image,
      })),
    },
    {
      id: "bebidas",
      name: "Bebidas",
      items: BEVERAGES.map((item) => ({
        key: `fallback-${item.id}`,
        categoryName: "Bebidas",
        name: item.name,
        description: item.size,
        price: item.price,
      })),
    },
  ];
}

export default function Menu() {
  const { addItem } = useCart();
  const [apiCategories, setApiCategories] = useState<SiteMenuCategory[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchMenuFromAPI()
      .then((categories) => {
        if (!isMounted) return;
        const normalized = normalizeApiMenu(categories);
        if (normalized.length > 0) {
          setApiCategories(normalized);
          setUsingFallback(false);
        } else {
          setApiCategories(getFallbackMenu());
          setUsingFallback(true);
        }
      })
      .catch((error) => {
        console.warn("Não foi possível carregar o cardápio do painel. Usando fallback local.", error);
        if (!isMounted) return;
        setApiCategories(getFallbackMenu());
        setUsingFallback(true);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMenu(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(
    () => (apiCategories.length > 0 ? apiCategories : getFallbackMenu()),
    [apiCategories]
  );

  const handleAdd = (item: SiteMenuItem) => {
    addItem({ name: item.name, price: item.price, menuItemId: item.menuItemId });
    toast.success(`${item.name} adicionado!`, {
      description: `R$ ${item.price.toFixed(2).replace(".", ",")}`,
      duration: 2000,
    });
  };

  return (
    <section id="cardapio" className="bg-[#FAFAF7] py-16">
      <div className="container">
        <h2
          className="section-title text-2xl font-bold text-[#2C1810] mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Cardápio
        </h2>
        <p className="text-sm text-[#7A6555] mb-10">
          {usingFallback
            ? "Cardápio temporário exibido enquanto o painel administrativo não responde."
            : "Pratos sincronizados automaticamente com o painel administrativo."}
        </p>

        {isLoadingMenu ? (
          <div className="flex items-center justify-center py-12 text-[#E8521A]">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm font-semibold">Carregando cardápio...</span>
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((category) => (
              <div key={category.id}>
                <h3
                  className="section-title text-xl font-bold text-[#2C1810] mb-6"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-sm text-[#7A6555] -mt-4 mb-6">{category.description}</p>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {category.items.map((item) => (
                    <div
                      key={item.key}
                      className="product-card bg-white rounded-2xl overflow-hidden shadow-sm border border-[#EDE8E2] fade-in-up"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-64 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-40 bg-[#F0EDE8] flex items-center justify-center text-[#B0A090] text-sm font-semibold">
                          Imagem não cadastrada
                        </div>
                      )}

                      <div className="p-5">
                        <p className="text-xs font-bold text-[#E8521A] uppercase tracking-widest mb-1">
                          {item.label || item.categoryName}
                        </p>
                        <h4
                          className="text-lg font-bold text-[#2C1810] mb-1"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {item.name}
                        </h4>
                        {item.description && (
                          <p className="text-sm text-[#7A6555] mb-4 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span
                            className="text-2xl font-bold text-[#E8521A]"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            R$ {item.price.toFixed(2).replace(".", ",")}
                          </span>
                          <button
                            onClick={() => handleAdd(item)}
                            className="flex items-center gap-2 bg-[#E8521A] hover:bg-[#C94415] active:scale-95 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-150"
                          >
                            <ShoppingCart size={15} />
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
