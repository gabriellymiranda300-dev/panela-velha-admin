/*
 * API Integration - Panela Velha
 * Envia pedidos do site para o painel de administração via API REST
 * e carrega o cardápio público quando disponível.
 */

import { toast } from "sonner";

const DEFAULT_PAINEL_API_URL = "https://panelavelha-2cnz98kw.manus.space/api/integration";
const configuredUrl = import.meta.env.VITE_PAINEL_API_URL as string | undefined;
export const PAINEL_API_URL = (configuredUrl || DEFAULT_PAINEL_API_URL).replace(/\/$/, "");

export interface MenuItemFromAPI {
  id: number;
  categoryId: number;
  name: string;
  description?: string | null;
  price: string | number;
  imageUrl?: string | null;
  available?: boolean;
}

export interface MenuCategoryFromAPI {
  id: number;
  name: string;
  description?: string | null;
  items: MenuItemFromAPI[];
}

export interface OrderItem {
  menuItemId?: number;
  name: string;
  price: number;
  quantity?: number;
  notes?: string;
}

export interface OrderData {
  clientName: string;
  clientPhone: string;
  clientAddress: {
    rua: string;
    numero: string;
    complemento: string;
    cep: string;
    cidade: string;
    estado: string;
  };
  items: OrderItem[];
  extras: {
    utensil: boolean;
    extraSalad: boolean;
    potatoSize?: "P" | "M" | "G";
  };
  paymentMethod: string;
  changeValue?: number;
  discount: number;
  shipping: number;
  subtotal: number;
  total: number;
}

export async function fetchMenuFromAPI(): Promise<MenuCategoryFromAPI[]> {
  const response = await fetch(`${PAINEL_API_URL}/menu`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao carregar cardápio: ${response.status}`);
  }

  const result = await response.json();
  if (!result.success || !Array.isArray(result.data)) {
    throw new Error(result.error || "Resposta inválida da API de cardápio");
  }

  return result.data;
}

function formatAddress(orderData: OrderData): string {
  return `${orderData.clientAddress.rua}, ${orderData.clientAddress.numero}${orderData.clientAddress.complemento ? " - " + orderData.clientAddress.complemento : ""} - ${orderData.clientAddress.cep} - ${orderData.clientAddress.cidade}/${orderData.clientAddress.estado}`;
}

function buildOrderNotes(orderData: OrderData): string {
  const extrasList = [
    orderData.extras.utensil ? "Talher" : null,
    orderData.extras.extraSalad ? "Salada extra" : null,
    orderData.extras.potatoSize ? `Batata frita ${orderData.extras.potatoSize}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    `Endereço: ${formatAddress(orderData)}`,
    extrasList ? `Adicionais: ${extrasList}` : null,
    `Subtotal: R$ ${orderData.subtotal.toFixed(2)}`,
    `Frete: R$ ${orderData.shipping.toFixed(2)}`,
    orderData.discount > 0 ? `Desconto: R$ ${orderData.discount.toFixed(2)}` : null,
    orderData.changeValue ? `Troco para: R$ ${orderData.changeValue.toFixed(2)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Envia pedido para a API pública do painel.
 */
export async function sendOrderToAPI(orderData: OrderData): Promise<boolean> {
  try {
    if (
      !orderData.clientName ||
      !orderData.clientPhone ||
      !orderData.items ||
      orderData.items.length === 0 ||
      orderData.total <= 0
    ) {
      console.error("Dados do pedido incompletos");
      toast.error("Erro", {
        description: "Por favor, preencha todos os dados do pedido.",
      });
      return false;
    }

    const apiOrder = {
      customerName: orderData.clientName,
      customerPhone: orderData.clientPhone,
      address: orderData.clientAddress,
      notes: buildOrderNotes(orderData),
      paymentMethod: orderData.paymentMethod || "Não especificado",
      subtotal: orderData.subtotal,
      shipping: orderData.shipping,
      discount: orderData.discount,
      total: orderData.total,
      changeValue: orderData.changeValue,
      source: "website",
      items: orderData.items.map((item) => ({
        menuItemId: item.menuItemId,
        productName: item.name,
        name: item.name,
        quantity: item.quantity || 1,
        unitPrice: item.price,
        price: item.price,
        notes: item.notes,
      })),
    };

    console.log("Enviando pedido para o painel...", apiOrder);

    const response = await fetch(`${PAINEL_API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiOrder),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`);
    }

    console.log("Pedido enviado com sucesso!", result);
    toast.success("Pedido recebido!", {
      description: "Seu pedido foi enviado para o painel. Acompanhe o status no WhatsApp.",
    });
    return true;
  } catch (error) {
    console.error("Erro ao enviar pedido:", error);
    toast.error("Erro ao enviar pedido", {
      description: "Tente novamente em alguns momentos.",
    });
    return false;
  }
}

/**
 * Envia pedido via WhatsApp (fallback se API falhar)
 */
export function sendOrderViaWhatsApp(orderData: OrderData): void {
  const phoneNumber = "5511941462504"; // Número do restaurante
  const address = formatAddress(orderData);

  const itemsList = orderData.items
    .map((item) => {
      const qty = item.quantity || 1;
      return `• ${item.name} (${qty}x) - R$ ${(item.price * qty).toFixed(2).replace(".", ",")}`;
    })
    .join("\n");

  const extrasList = [
    orderData.extras.utensil ? "✓ Talher" : null,
    orderData.extras.extraSalad ? "✓ Salada Extra" : null,
    orderData.extras.potatoSize ? `✓ Batata Frita - ${orderData.extras.potatoSize}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const message = `
*NOVO PEDIDO - PANELA VELHA*

*Cliente:* ${orderData.clientName}
*Telefone:* ${orderData.clientPhone}
*Endereço:* ${address}

*Itens:*
${itemsList}

${extrasList ? `*Adicionais:*\n${extrasList}\n` : ""}
*Subtotal:* R$ ${orderData.subtotal.toFixed(2).replace(".", ",")}
*Desconto:* R$ ${orderData.discount.toFixed(2).replace(".", ",")}
*Frete:* R$ ${orderData.shipping.toFixed(2).replace(".", ",")}
*TOTAL:* R$ ${orderData.total.toFixed(2).replace(".", ",")}

*Forma de Pagamento:* ${orderData.paymentMethod}
${orderData.changeValue ? `*Troco para:* R$ ${orderData.changeValue.toFixed(2).replace(".", ",")}` : ""}
  `.trim();

  const encodedMessage = encodeURIComponent(message);
  const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappURL, "_blank");
}
