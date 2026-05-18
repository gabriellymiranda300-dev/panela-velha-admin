/*
 * CartDrawer — Panela Velha
 * Design: painel lateral deslizante, dados do cliente, pagamento cartão/PIX, aba de confirmação
 */
import { X, Trash2, Tag, ShoppingBag, MessageCircle, CreditCard, QrCode, User, Phone, MapPin, DollarSign } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { toast } from "sonner";
import { sendOrderToAPI, sendOrderViaWhatsApp, type OrderData } from "@/lib/api";

interface CartDrawerProps {
  customerData: {
    nome: string;
    telefone: string;
    rua: string;
    numero: string;
    complemento: string;
    cep: string;
    cidade: string;
    estado: string;
  };
  onCustomerChange: (field: string, value: string | number) => void;
  paymentMethod: string;
}

type DrawerTab = "dados" | "cart" | "payment" | "confirmation";

export default function CartDrawer({ customerData, onCustomerChange, paymentMethod }: CartDrawerProps) {
  const {
    items,
    removeItem,
    isOpen,
    closeCart,
    extras,
    potatoSize,
    discount,
    setDiscount,
    couponCode,
    setCouponCode,
    shipping,
    total,
    subtotal,
    clearCart,
    changeValue,
    setChangeValue,
    calculateShipping,
  } = useCart();

  const [tab, setTab] = useState<DrawerTab>("dados");
  const [couponInput, setCouponInput] = useState("");
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
  });

  const potatoPrices: Record<"P" | "M" | "G", number> = { P: 5, M: 7, G: 10 };
  const potatoPrice = potatoSize ? potatoPrices[potatoSize] : 0;

  const applyCoupon = () => {
    if (couponInput.trim().toUpperCase() === "DESCONTO10") {
      setDiscount(10);
      setCouponCode(couponInput.trim().toUpperCase());
      toast.success("Cupom aplicado! R$ 10,00 de desconto.");
    } else {
      toast.error("Cupom inválido. Tente DESCONTO10.");
    }
  };

  const validateOrder = () => {
    if (!customerData.nome || !customerData.telefone) {
      toast.error("Preencha seu nome e telefone antes de finalizar.");
      return false;
    }
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item ao carrinho.");
      return false;
    }
    return true;
  };

  const buildAddressString = () => {
    const parts = [
      customerData.rua,
      customerData.numero,
      customerData.complemento,
      customerData.cep,
      customerData.cidade,
      customerData.estado,
    ].filter(Boolean);
    return parts.join(", ");
  };

  const finishOrder = async () => {
    if (!validateOrder()) return;

    // Preparar dados do pedido para enviar à API
    const orderData: OrderData = {
      clientName: customerData.nome,
      clientPhone: customerData.telefone,
      clientAddress: {
        rua: customerData.rua,
        numero: customerData.numero,
        complemento: customerData.complemento,
        cep: customerData.cep,
        cidade: customerData.cidade,
        estado: customerData.estado,
      },
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: 1,
      })),
      extras: {
        utensil: extras.utensil,
        extraSalad: extras.extraSalad,
        potatoSize: potatoSize || undefined,
      },
      paymentMethod,
      changeValue: paymentMethod === "Dinheiro" ? changeValue : undefined,
      discount,
      shipping,
      subtotal,
      total,
    };

    // Enviar para a API do painel
    const success = await sendOrderToAPI(orderData);

    if (success) {
      // Se API funcionou, também enviar via WhatsApp como confirmação
      setTimeout(() => {
        sendOrderViaWhatsApp(orderData);
      }, 500);
      clearCart();
      closeCart();
      setTab("dados");
    } else {
      // Se API falhar, enviar apenas via WhatsApp
      console.log("API falhou, enviando via WhatsApp como fallback");
      sendOrderViaWhatsApp(orderData);
      clearCart();
      closeCart();
      setTab("dados");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 overlay-in"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col drawer-open">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE8E2]">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#E8521A]" />
            <h2
              className="text-lg font-bold text-[#2C1810]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Seu Pedido
            </h2>
            {items.length > 0 && (
              <span className="bg-[#E8521A] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {items.length}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="text-[#7A6555] hover:text-[#2C1810] p-1 rounded-lg hover:bg-[#F0EDE8] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#EDE8E2]">
          {(["dados", "cart", "payment", "confirmation"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold uppercase transition-colors ${
                tab === t
                  ? "text-[#E8521A] border-b-2 border-[#E8521A]"
                  : "text-[#7A6555] hover:text-[#2C1810]"
              }`}
            >
              {t === "dados" && "Dados"}
              {t === "cart" && "Carrinho"}
              {t === "payment" && "Pagamento"}
              {t === "confirmation" && "Confirmação"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "dados" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-[#2C1810] block mb-1.5 flex items-center gap-1">
                  <User size={14} className="text-[#E8521A]" />
                  Nome completo
                </label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={customerData.nome}
                  onChange={(e) => onCustomerChange("nome", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#2C1810] block mb-1.5 flex items-center gap-1">
                  <Phone size={14} className="text-[#E8521A]" />
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={customerData.telefone}
                  onChange={(e) => onCustomerChange("telefone", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                />
              </div>

              {/* Endereço separado */}
              <div className="border-t border-[#EDE8E2] pt-4">
                <p className="text-xs font-semibold text-[#2C1810] mb-3 flex items-center gap-1">
                  <MapPin size={14} className="text-[#E8521A]" />
                  Endereço de entrega
                </p>
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Rua"
                    value={customerData.rua}
                    onChange={(e) => onCustomerChange("rua", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Número"
                      value={customerData.numero}
                      onChange={(e) => onCustomerChange("numero", e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                    />
                    <input
                      type="text"
                      placeholder="CEP"
                      value={customerData.cep}
                      onChange={(e) => {
                        const cep = e.target.value;
                        onCustomerChange("cep", cep);
                        // Calcula frete quando cidade e estado estão preenchidos
                        if (customerData.cidade && customerData.estado) {
                          calculateShipping(customerData.cidade, customerData.estado);
                        }
                      }}
                      className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Complemento (apto, sala, etc)"
                    value={customerData.complemento}
                    onChange={(e) => onCustomerChange("complemento", e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={customerData.cidade}
                      onChange={(e) => {
                        const cidade = e.target.value;
                        onCustomerChange("cidade", cidade);
                        if (cidade && customerData.estado) {
                          calculateShipping(cidade, customerData.estado);
                        }
                      }}
                      className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Estado (SP)"
                      value={customerData.estado}
                      onChange={(e) => {
                        const estado = e.target.value;
                        onCustomerChange("estado", estado);
                        if (customerData.cidade && estado) {
                          calculateShipping(customerData.cidade, estado);
                        }
                      }}
                      className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "cart" && (
            <>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <ShoppingBag size={48} className="text-[#DDD5CC]" />
                  <p className="text-[#B0A090] font-medium">Seu carrinho está vazio</p>
                  <p className="text-sm text-[#B0A090]">Adicione itens do cardápio</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-[#FAFAF7] rounded-xl px-4 py-3 border border-[#EDE8E2]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#2C1810]">{item.name}</p>
                        <p className="text-xs text-[#E8521A] font-bold mt-0.5">
                          R$ {item.price.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}

                  {/* Extras summary */}
                  {(extras.utensil || extras.extraSalad || potatoSize) && (
                    <div className="border-t border-[#EDE8E2] pt-3 mt-1">
                      <p className="text-xs font-semibold text-[#7A6555] mb-2 uppercase tracking-wide">Adicionais</p>
                      {extras.utensil && (
                        <div className="flex justify-between text-sm text-[#2C1810]">
                          <span>Talher</span>
                          <span className="font-semibold">Grátis</span>
                        </div>
                      )}
                      {extras.extraSalad && (
                        <div className="flex justify-between text-sm text-[#2C1810]">
                          <span>Salada Extra</span>
                          <span className="font-semibold">+ R$ 5,00</span>
                        </div>
                      )}
                      {potatoSize && (
                        <div className="flex justify-between text-sm text-[#2C1810]">
                          <span>Batata Frita {potatoSize}</span>
                          <span className="font-semibold">+ R$ {potatoPrice.toFixed(2).replace(".", ",")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Coupon */}
                  <div className="border-t border-[#EDE8E2] pt-3 mt-3 flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0A090]" />
                      <input
                        type="text"
                        placeholder="Cupom"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-[#FAFAF7]"
                      />
                    </div>
                    <button
                      onClick={applyCoupon}
                      className="bg-[#2C1810] hover:bg-[#3D2218] active:scale-95 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-150"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "payment" && items.length > 0 && (
            <div className="flex flex-col gap-4">
              {paymentMethod === "Pix" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <QrCode size={120} className="text-[#E8521A]" />
                  <p className="text-sm text-[#7A6555] text-center">
                    Escaneie o QR code com seu app de banco para pagar via Pix
                  </p>
                  <div className="w-full bg-[#FAFAF7] rounded-xl p-4 text-center">
                    <p className="text-xs text-[#7A6555] mb-2">Chave Pix (aleatória)</p>
                    <p className="text-sm font-mono text-[#2C1810] break-all">
                      a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6
                    </p>
                  </div>
                </div>
              )}

              {(paymentMethod === "Cartão de Crédito" || paymentMethod === "Cartão de Débito") && (
                <div className="flex flex-col gap-4 py-4">
                  <div>
                    <label className="text-xs font-semibold text-[#2C1810] block mb-1.5">
                      Número do Cartão
                    </label>
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      value={cardData.number}
                      onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#2C1810] block mb-1.5">
                      Nome do Titular
                    </label>
                    <input
                      type="text"
                      placeholder="NOME COMPLETO"
                      value={cardData.name}
                      onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#2C1810] block mb-1.5">
                        Validade
                      </label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        value={cardData.expiry}
                        onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#2C1810] block mb-1.5">
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="000"
                        value={cardData.cvv}
                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === "Dinheiro" && (
                <div className="flex flex-col gap-4 py-4">
                  <p className="text-sm text-[#7A6555]">
                    Pagamento em dinheiro na entrega. Tenha o valor exato disponível.
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-[#2C1810] block mb-1.5 flex items-center gap-1">
                      <DollarSign size={14} className="text-[#E8521A]" />
                      Troco para:
                    </label>
                    <input
                      type="number"
                      placeholder="Digite o valor em R$"
                      value={changeValue || ""}
                      onChange={(e) => setChangeValue(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 text-sm border border-[#DDD5CC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E8521A]/40 focus:border-[#E8521A] bg-white"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === "Pagar na Entrega" && (
                <div className="py-6 text-center">
                  <p className="text-sm text-[#7A6555]">
                    Você pagará quando o pedido chegar. Cartão ou dinheiro.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "confirmation" && items.length > 0 && (
            <div className="flex flex-col gap-4 py-4">
              <div className="bg-[#FFF4EF] rounded-xl p-4 border border-[#E8521A]/20">
                <p className="text-xs font-semibold text-[#E8521A] uppercase mb-3">Dados de Entrega</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-[#7A6555]">Nome</p>
                    <p className="font-semibold text-[#2C1810]">{customerData.nome}</p>
                  </div>
                  <div>
                    <p className="text-[#7A6555]">Telefone</p>
                    <p className="font-semibold text-[#2C1810]">{customerData.telefone}</p>
                  </div>
                  <div>
                    <p className="text-[#7A6555]">Endereço</p>
                    <p className="font-semibold text-[#2C1810]">{buildAddressString() || "Não informado"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#EDE8E2] px-5 py-4 flex flex-col gap-4">
            {/* Summary */}
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-[#7A6555]">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-[#7A6555]">
                <span>Frete</span>
                <span>R$ {shipping.toFixed(2).replace(".", ",")}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Desconto ({couponCode})</span>
                  <span>- R$ {discount.toFixed(2).replace(".", ",")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[#2C1810] text-base border-t border-[#EDE8E2] pt-2 mt-1">
                <span style={{ fontFamily: "var(--font-display)" }}>Total</span>
                <span className="text-[#E8521A]" style={{ fontFamily: "var(--font-display)" }}>
                  R$ {total.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            {tab === "dados" && (
              <button
                onClick={() => setTab("cart")}
                className="w-full bg-[#E8521A] hover:bg-[#C94415] active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all duration-150"
              >
                Próximo: Carrinho
              </button>
            )}

            {tab === "cart" && (
              <button
                onClick={() => setTab("payment")}
                className="w-full bg-[#E8521A] hover:bg-[#C94415] active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all duration-150"
              >
                Próximo: Pagamento
              </button>
            )}

            {tab === "payment" && (
              <button
                onClick={() => setTab("confirmation")}
                className="w-full bg-[#E8521A] hover:bg-[#C94415] active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all duration-150"
              >
                Revisar Pedido
              </button>
            )}

            {tab === "confirmation" && (
              <button
                onClick={finishOrder}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all duration-150 shadow-md shadow-green-900/20"
              >
                <MessageCircle size={18} />
                Finalizar via WhatsApp
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
