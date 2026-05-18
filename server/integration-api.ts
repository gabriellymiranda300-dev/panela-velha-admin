/**
 * API pública de integração para o site dos clientes.
 *
 * Endpoints:
 * - GET /api/integration/menu - Retorna o cardápio disponível
 * - POST /api/integration/orders - Cria um novo pedido a partir do site
 */

import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { orders, orderItems, menuItems } from "../drizzle/schema";
import { getAvailableMenuWithCategories, getMenuWithCategories } from "./db-menu";
import { notifyOwner } from "./_core/notification";
import { eq } from "drizzle-orm";

const router = Router();

type IncomingOrderItem = {
  menuItemId?: number | string;
  id?: number | string;
  quantity?: number | string;
  qty?: number | string;
  notes?: string;
  productName?: string;
  name?: string;
  dish?: string;
  unitPrice?: number | string;
  price?: number | string;
};

type NormalizedOrderItem = {
  menuItemId?: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  notes?: string;
};

function asText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function asPositiveNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function joinAddress(address: unknown): string | undefined {
  if (!address) return undefined;
  if (typeof address === "string") return asText(address);
  if (typeof address !== "object") return undefined;

  const data = address as Record<string, unknown>;
  return [
    data.rua ?? data.street,
    data.numero ?? data.number,
    data.complemento ?? data.complement,
    data.cep ?? data.zipCode,
    data.cidade ?? data.city,
    data.estado ?? data.state,
  ]
    .map(asText)
    .filter(Boolean)
    .join(", ") || undefined;
}

function parseItemsPayload(items: unknown): IncomingOrderItem[] {
  if (Array.isArray(items)) return items as IncomingOrderItem[];

  if (typeof items === "string") {
    return items
      .split(",")
      .map((raw) => raw.trim())
      .filter(Boolean)
      .map((raw) => {
        const quantityMatch = raw.match(/\((\d+)x\)/i);
        const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
        const productName = raw.replace(/\s*\(\d+x\)\s*/i, "").trim();
        return { productName, quantity };
      });
  }

  return [];
}

async function normalizeOrderItems(items: unknown): Promise<NormalizedOrderItem[]> {
  const db = await getDb();
  const incomingItems = parseItemsPayload(items);
  const normalized: NormalizedOrderItem[] = [];

  for (const item of incomingItems) {
    const menuItemId = asPositiveNumber(item.menuItemId ?? item.id, 0);
    const quantity = Math.max(1, Math.floor(asPositiveNumber(item.quantity ?? item.qty, 1)));

    if (db && menuItemId > 0) {
      const [menuItem] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, menuItemId))
        .limit(1);

      if (menuItem) {
        normalized.push({
          menuItemId,
          productName: menuItem.name,
          quantity,
          unitPrice: String(menuItem.price),
          notes: asText(item.notes),
        });
        continue;
      }
    }

    const productName = asText(item.productName ?? item.name ?? item.dish);
    if (!productName) continue;

    normalized.push({
      productName,
      quantity,
      unitPrice: String(asPositiveNumber(item.unitPrice ?? item.price, 0).toFixed(2)),
      notes: asText(item.notes),
    });
  }

  return normalized;
}

function buildOrderNotes(body: Record<string, unknown>, address?: string): string | undefined {
  const existingNotes = asText(body.notes);
  const discount = asPositiveNumber(body.discount, 0);
  const shipping = asPositiveNumber(body.shipping, 0);
  const subtotal = asPositiveNumber(body.subtotal, 0);
  const changeValue = asPositiveNumber(body.changeValue, 0);

  const notes = [
    existingNotes,
    address ? `Endereço: ${address}` : undefined,
    subtotal > 0 ? `Subtotal informado pelo site: R$ ${subtotal.toFixed(2)}` : undefined,
    shipping > 0 ? `Frete informado pelo site: R$ ${shipping.toFixed(2)}` : undefined,
    discount > 0 ? `Desconto informado pelo site: R$ ${discount.toFixed(2)}` : undefined,
    changeValue > 0 ? `Troco para: R$ ${changeValue.toFixed(2)}` : undefined,
  ].filter(Boolean);

  return notes.length ? notes.join("\n") : undefined;
}

router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// ─── GET /api/integration/menu ─────────────────────────────────────────────────
/**
 * Retorna o cardápio disponível (categorias + pratos disponíveis)
 * Pode ser chamado sem autenticação
 */
router.get("/menu", async (req: Request, res: Response) => {
  try {
    const menu = await getAvailableMenuWithCategories();
    res.json({
      success: true,
      data: menu,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Integration API] Error fetching menu:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar cardápio",
    });
  }
});

// ─── GET /api/integration/menu/full ────────────────────────────────────────────
/**
 * Retorna o cardápio completo (incluindo itens indisponíveis)
 * Pode ser chamado sem autenticação
 */
router.get("/menu/full", async (req: Request, res: Response) => {
  try {
    const menu = await getMenuWithCategories();
    res.json({
      success: true,
      data: menu,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Integration API] Error fetching full menu:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar cardápio completo",
    });
  }
});

// ─── POST /api/integration/orders ──────────────────────────────────────────────
/**
 * Cria um novo pedido a partir do site dos clientes.
 *
 * Aceita tanto o contrato oficial:
 * {
 *   customerName, customerPhone,
 *   items: [{ menuItemId, quantity, notes }],
 *   notes, paymentMethod
 * }
 *
 * quanto o formato legado/simplificado enviado pelo site:
 * {
 *   client, phone, address,
 *   items: [{ name, price, quantity }] ou "Prato (1x), Bebida (1x)",
 *   total, paymentMethod, discount, shipping, subtotal
 * }
 */
router.post("/orders", async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const customerName = asText(body.customerName ?? body.clientName ?? body.client);
    const customerPhone = asText(body.customerPhone ?? body.clientPhone ?? body.phone);
    const paymentMethod = asText(body.paymentMethod);
    const address = joinAddress(body.address ?? body.clientAddress);
    const normalizedItems = await normalizeOrderItems(body.items);

    if (!customerName || normalizedItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nome do cliente e itens são obrigatórios",
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Banco de dados indisponível",
      });
    }

    const calculatedTotal = normalizedItems.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );
    const informedTotal = asPositiveNumber(body.total, 0);
    const totalAmount = informedTotal > 0 ? informedTotal : calculatedTotal;
    const notes = buildOrderNotes(body, address);

    const [result] = await db.insert(orders).values({
      customerName,
      customerPhone,
      totalAmount: String(totalAmount.toFixed(2)),
      notes,
      paymentMethod,
      source: "website",
    });

    const orderId = (result as any).insertId;

    await db.insert(orderItems).values(
      normalizedItems.map((item) => ({
        orderId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes,
      }))
    );

    await notifyOwner({
      title: `Novo Pedido do Site — ${customerName}`,
      content: `Um novo pedido foi criado através do site dos clientes.\n\n**Cliente:** ${customerName}${customerPhone ? `\n**Telefone:** ${customerPhone}` : ""}${address ? `\n**Endereço:** ${address}` : ""}\n**Total:** R$ ${totalAmount.toFixed(2)}\n**Itens:** ${normalizedItems.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}\n\nAcesse o painel administrativo para gerenciar o pedido.`,
    });

    res.json({
      success: true,
      orderId,
      totalAmount: totalAmount.toFixed(2),
      message: "Pedido criado com sucesso",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Integration API] Error creating order:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao criar pedido",
    });
  }
});

// ─── GET /api/integration/orders/:id ───────────────────────────────────────────
/**
 * Retorna o status de um pedido criado pelo site
 */
router.get("/orders/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Banco de dados indisponível",
      });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, Number(id)))
      .limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Pedido não encontrado",
      });
    }

    const orderItemsList = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, Number(id)));

    res.json({
      success: true,
      data: {
        id: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        status: order.status,
        totalAmount: order.totalAmount,
        items: orderItemsList,
        notes: order.notes,
        paymentMethod: order.paymentMethod,
        source: order.source,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Integration API] Error fetching order:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar pedido",
    });
  }
});

// ─── GET /api/integration/docs ────────────────────────────────────────────────
/**
 * Retorna a documentação da API de integração
 */
router.get("/docs", (req: Request, res: Response) => {
  res.json({
    title: "API de Integração — Panela Velha",
    version: "1.1.0",
    baseUrl: "/api/integration",
    endpoints: [
      {
        method: "GET",
        path: "/menu",
        description: "Retorna o cardápio disponível (categorias + pratos, incluindo imageUrl quando cadastrado)",
        authentication: "Não requerida",
      },
      {
        method: "POST",
        path: "/orders",
        description: "Cria um novo pedido vindo do site",
        authentication: "Não requerida",
        body: {
          customerName: "João Silva",
          customerPhone: "11999999999",
          items: [{ menuItemId: 1, quantity: 2, notes: "Sem cebola" }],
          notes: "Entrega rápida",
          paymentMethod: "Pix",
        },
        legacyBodyAlsoAccepted: {
          client: "João Silva",
          phone: "11999999999",
          address: "Rua A, 123",
          items: [{ name: "Marmita de Frango", price: 18.5, quantity: 2 }],
          total: 37,
          paymentMethod: "Pix",
        },
      },
      {
        method: "GET",
        path: "/orders/:id",
        description: "Retorna o status de um pedido",
        authentication: "Não requerida",
      },
    ],
  });
});

export default router;

