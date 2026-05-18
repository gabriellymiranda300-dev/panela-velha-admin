/*
 * CartContext — Panela Velha
 * Gerencia o estado global do carrinho de compras com cálculo de frete por cidade
 */
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  menuItemId?: number;
}

export interface CustomerAddress {
  rua: string;
  numero: string;
  complemento: string;
  cep: string;
  cidade: string;
  estado: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  extras: { utensil: boolean; extraSalad: boolean };
  setExtras: (extras: { utensil: boolean; extraSalad: boolean }) => void;
  potatoSize: "P" | "M" | "G" | null;
  setPotatoSize: (size: "P" | "M" | "G" | null) => void;
  discount: number;
  setDiscount: (d: number) => void;
  couponCode: string;
  setCouponCode: (c: string) => void;
  shipping: number;
  calculateShipping: (city: string, state: string) => number;
  total: number;
  subtotal: number;
  changeValue: number;
  setChangeValue: (v: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Estabelecimento localizado em São Paulo - SP
const RESTAURANT_CITY = "São Paulo";
const RESTAURANT_STATE = "SP";

// Tabela de frete por cidade (baseada em distância do estabelecimento)
// Formato: "Cidade/Estado": valor do frete em R$
const SHIPPING_BY_CITY: Record<string, number> = {
  // São Paulo - Capital (mesmo local)
  "São Paulo/SP": 5.0,
  "Sao Paulo/SP": 5.0,

  // Região Metropolitana - Zona Norte
  "Guarulhos/SP": 8.0,
  "Osasco/SP": 8.0,
  "Carapicuíba/SP": 8.0,
  "Barueri/SP": 8.0,
  "Itapevi/SP": 8.0,
  "Jandira/SP": 8.0,
  "Pirapora do Bom Jesus/SP": 8.0,

  // Região Metropolitana - Zona Leste
  "Mogi das Cruzes/SP": 10.0,
  "Suzano/SP": 10.0,
  "Ferraz de Vasconcelos/SP": 10.0,
  "Poá/SP": 10.0,
  "Arujá/SP": 10.0,
  "Santa Isabel/SP": 10.0,

  // Região Metropolitana - Zona Sul
  "Diadema/SP": 8.0,
  "Santo André/SP": 8.0,
  "São Bernardo do Campo/SP": 8.0,
  "São Caetano do Sul/SP": 8.0,
  "Mauá/SP": 10.0,
  "Ribeirão Pires/SP": 10.0,

  // Região Metropolitana - Zona Oeste
  "Taboão da Serra/SP": 8.0,
  "Embu/SP": 8.0,
  "Embu das Artes/SP": 8.0,
  "Itapecerica da Serra/SP": 10.0,
  "Juquitiba/SP": 12.0,

  // Cidades próximas - Região Metropolitana expandida
  "Campo Limpo Paulista/SP": 12.0,
  "Atibaia/SP": 12.0,
  "Bragança Paulista/SP": 15.0,
  "Jundiaí/SP": 12.0,
  "Valinhos/SP": 12.0,
  "Vinhedo/SP": 12.0,
  "Campinas/SP": 15.0,
  "Piracicaba/SP": 20.0,
  "Sorocaba/SP": 18.0,
  "Itu/SP": 15.0,
  "Salto/SP": 15.0,
  "Indaiatuba/SP": 15.0,

  // Cidades do interior
  "Santos/SP": 15.0,
  "São Vicente/SP": 15.0,
  "Praia Grande/SP": 18.0,
  "Guarujá/SP": 18.0,
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [extras, setExtras] = useState({ utensil: false, extraSalad: false });
  const [potatoSize, setPotatoSize] = useState<"P" | "M" | "G" | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [changeValue, setChangeValue] = useState(0);
  const [shipping, setShipping] = useState(5.0);

  const addItem = useCallback((item: Omit<CartItem, "id">) => {
    const id = `${item.name}-${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { ...item, id }]);
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscount(0);
    setCouponCode("");
    setExtras({ utensil: false, extraSalad: false });
    setPotatoSize(null);
    setShipping(5.0);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((v) => !v), []);

  // Calcula frete baseado na cidade de entrega
  const calculateShipping = useCallback((city: string, state: string): number => {
    if (!city || !state) return 5.0;

    // Normaliza a entrada (remove espaços extras, capitaliza)
    const normalizedCity = city.trim();
    const normalizedState = state.trim().toUpperCase();
    const cityStateKey = `${normalizedCity}/${normalizedState}`;

    // Busca exata na tabela
    if (SHIPPING_BY_CITY[cityStateKey]) {
      const rate = SHIPPING_BY_CITY[cityStateKey];
      setShipping(rate);
      return rate;
    }

    // Tenta com variações de capitalização
    const lowerCityStateKey = `${normalizedCity.toLowerCase()}/${normalizedState}`;
    if (SHIPPING_BY_CITY[lowerCityStateKey]) {
      const rate = SHIPPING_BY_CITY[lowerCityStateKey];
      setShipping(rate);
      return rate;
    }

    // Se não encontrar, retorna frete padrão para região SP
    if (normalizedState === "SP") {
      setShipping(10.0);
      return 10.0;
    }

    // Frete padrão para outros estados
    setShipping(25.0);
    return 25.0;
  }, []);

  const potatoPrices: Record<"P" | "M" | "G", number> = { P: 5, M: 7, G: 10 };
  const potatoPrice = potatoSize ? potatoPrices[potatoSize] : 0;
  const extrasTotal = (extras.extraSalad ? 5 : 0) + potatoPrice;
  const subtotal = items.reduce((sum, i) => sum + i.price, 0) + extrasTotal;
  const total = Math.max(0, subtotal + shipping - discount);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        isOpen,
        openCart,
        closeCart,
        toggleCart,
        extras,
        setExtras,
        potatoSize,
        setPotatoSize,
        discount,
        setDiscount,
        couponCode,
        setCouponCode,
        shipping,
        calculateShipping,
        total,
        subtotal,
        changeValue,
        setChangeValue,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
