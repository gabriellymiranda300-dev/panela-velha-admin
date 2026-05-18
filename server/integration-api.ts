/**
 * API pública de integração para o site dos clientes (marmitadel-kqvqpftc.manus.space)
 * 
 * Endpoints:
 * - GET /api/integration/menu - Retorna o cardápio disponível
 * - POST /api/integration/orders - Cria um novo pedido a partir do site
 * 
 * Documentação:
 * https://panelavelha-2cnz98kw.manus.space/docs/integration
 */

import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { orders, orderItems, menuItems } from "../drizzle/schema";
import { getAvailableMenuWithCategories, getMenuWithCategories } from "./db-menu";
import { notifyOwner } from "./_core/notification";
import { eq } from "drizzle-orm";

const router = Router();

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
 * Cria um novo pedido a partir do site dos clientes
 * 
 * Body:
 * {
 *   "customerName": "João Silva",
 *   "customerPhone": "11999999999",
 *   "items": [
 *     { "menuItemId": 1, "quantity": 2, "notes": "Sem cebola" },
 *     { "menuItemId": 3, "quantity": 1 }
 *   ],
 *   "notes": "Entrega rápida se possível",
 *   "paymentMethod": "Pix"
 * }
 */
router.post("/orders", async (req: Request, res: Response) => {
  try {
    const { customerName, customerPhone, items, notes, paymentMethod } = req.body;

    // Validação básica
    if (!customerName || !items || items.length === 0) {
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

    // Buscar preços dos itens no cardápio
    const menuItemIds = items.map((i: any) => i.menuItemId);
    const menuItemsData = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, menuItemIds[0]));

    // Calcular total
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const menuItem = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, item.menuItemId))
        .limit(1);

      if (!menuItem || menuItem.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Item ${item.menuItemId} não encontrado no cardápio`,
        });
      }

      const itemTotal = Number(menuItem[0].price) * item.quantity;
      totalAmount += itemTotal;

      orderItemsData.push({
        productName: menuItem[0].name,
        quantity: item.quantity,
        unitPrice: menuItem[0].price,
        notes: item.notes,
      });
    }

    // Criar pedido
    const [result] = await db.insert(orders).values({
      customerName,
      customerPhone,
      totalAmount: String(totalAmount.toFixed(2)),
      notes,
      paymentMethod,
      source: "website",
    });

    const orderId = (result as any).insertId;

    // Adicionar itens do pedido
    if (orderItemsData.length > 0) {
      await db.insert(orderItems).values(
        orderItemsData.map((item) => ({
          orderId,
          ...item,
        }))
      );
    }

    // Notificar o dono sobre novo pedido do site
    await notifyOwner({
      title: `📱 Novo Pedido do Site — ${customerName}`,
      content: `Um novo pedido foi criado através do site dos clientes.\n\n**Cliente:** ${customerName}${customerPhone ? `\n**Telefone:** ${customerPhone}` : ""}\n**Total:** R$ ${totalAmount.toFixed(2)}\n**Itens:** ${orderItemsData.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}\n\nAcesse o painel administrativo para gerenciar o pedido.`,
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
 * 
 * Parâmetros:
 * - id: ID do pedido
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

    // Buscar itens do pedido
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
    version: "1.0.0",
    baseUrl: "https://panelavelha-2cnz98kw.manus.space/api/integration",
    endpoints: [
      {
        method: "GET",
        path: "/menu",
        description: "Retorna o cardápio disponível (categorias + pratos)",
        authentication: "Não requerida",
        response: {
          success: true,
          data: [
            {
              id: 1,
              name: "Marmitas",
              description: "Pratos principais",
              items: [
                {
                  id: 1,
                  categoryId: 1,
                  name: "Marmita de Frango",
                  description: "Frango com arroz, feijão e salada",
                  price: "18.50",
                  available: true,
                },
              ],
            },
          ],
        },
      },
      {
        method: "POST",
        path: "/orders",
        description: "Cria um novo pedido",
        authentication: "Não requerida",
        body: {
          customerName: "João Silva",
          customerPhone: "11999999999",
          items: [
            {
              menuItemId: 1,
              quantity: 2,
              notes: "Sem cebola",
            },
          ],
          notes: "Entrega rápida",
          paymentMethod: "Pix",
        },
        response: {
          success: true,
          orderId: 123,
          totalAmount: "37.00",
          message: "Pedido criado com sucesso",
        },
      },
      {
        method: "GET",
        path: "/orders/:id",
        description: "Retorna o status de um pedido",
        authentication: "Não requerida",
        response: {
          success: true,
          data: {
            id: 123,
            customerName: "João Silva",
            status: "em_preparo",
            totalAmount: "37.00",
            createdAt: "2026-05-18T15:00:00Z",
          },
        },
      },
    ],
  });
});

export default router;
