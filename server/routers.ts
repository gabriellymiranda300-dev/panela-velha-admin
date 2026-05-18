import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getStockItems,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  addStockMovement,
  getStockMovements,
  getLowStockItems,
  markStockNotificationSent,
  getCashTransactions,
  getCashSummary,
  createCashTransaction,
  deleteCashTransaction,
  getDashboardSummary,
  getWeeklyChart,
  getSalesChart,
  getOrdersByStatus,
  getCashFlowChart,
  getTopProducts,
} from "./db";
import { notifyOwner } from "./_core/notification";

// Admin-only guard
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: router({
    summary: adminProcedure.query(async () => {
      return getDashboardSummary();
    }),
    weeklyChart: adminProcedure.query(async () => {
      return getWeeklyChart();
    }),
  }),

  // ─── Orders ────────────────────────────────────────────────────────────────
  orders: router({
    list: adminProcedure
      .input(z.object({ status: z.enum(["novo", "em_preparo", "pronto", "entregue", "cancelado"]).optional() }))
      .query(async ({ input }) => {
        return getOrders(input.status);
      }),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getOrderById(input.id);
      }),

    create: adminProcedure
      .input(z.object({
        customerName: z.string().min(1),
        customerPhone: z.string().optional(),
        notes: z.string().optional(),
        paymentMethod: z.string().optional(),
        items: z.array(z.object({
          productName: z.string().min(1),
          quantity: z.number().min(1),
          unitPrice: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        return createOrder(input);
      }),

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["novo", "em_preparo", "pronto", "entregue", "cancelado"]),
      }))
      .mutation(async ({ input }) => {
        await updateOrderStatus(input.id, input.status);
        return { success: true };
      }),
  }),

  // ─── Stock ─────────────────────────────────────────────────────────────────
  stock: router({
    list: adminProcedure.query(async () => {
      return getStockItems();
    }),

    lowStockCount: adminProcedure.query(async () => {
      const items = await getStockItems();
      return items.filter((i) => Number(i.currentQuantity) <= Number(i.minimumQuantity)).length;
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        category: z.string().optional(),
        unit: z.string().min(1),
        currentQuantity: z.string(),
        minimumQuantity: z.string(),
        costPerUnit: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await createStockItem(input);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        category: z.string().optional(),
        unit: z.string().optional(),
        currentQuantity: z.string().optional(),
        minimumQuantity: z.string().optional(),
        costPerUnit: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateStockItem(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteStockItem(input.id);
        return { success: true };
      }),

    addMovement: adminProcedure
      .input(z.object({
        stockItemId: z.number(),
        type: z.enum(["entrada", "saida", "ajuste"]),
        quantity: z.string(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const item = await addStockMovement(input);
        // Verificar e notificar estoque baixo
        if (item) {
          const updated = await getStockItems();
          const updatedItem = updated.find((i) => i.id === input.stockItemId);
          if (updatedItem && Number(updatedItem.currentQuantity) <= Number(updatedItem.minimumQuantity) && !updatedItem.notificationSent) {
            await notifyOwner({
              title: `⚠️ Estoque Baixo — ${updatedItem.name}`,
              content: `O item **${updatedItem.name}** atingiu o estoque mínimo.\n\nQuantidade atual: ${updatedItem.currentQuantity} ${updatedItem.unit}\nQuantidade mínima: ${updatedItem.minimumQuantity} ${updatedItem.unit}\n\nAcesse o sistema para repor o estoque.`,
            });
            await markStockNotificationSent(updatedItem.id);
          }
        }
        return { success: true };
      }),

    movements: adminProcedure
      .input(z.object({ stockItemId: z.number() }))
      .query(async ({ input }) => {
        return getStockMovements(input.stockItemId);
      }),
  }),

  // ─── Cash ──────────────────────────────────────────────────────────────────
  cash: router({
    list: adminProcedure
      .input(z.object({ period: z.string().default("mes") }))
      .query(async ({ input }) => {
        return getCashTransactions(input.period);
      }),

    summary: adminProcedure
      .input(z.object({ period: z.string().default("mes") }))
      .query(async ({ input }) => {
        return getCashSummary(input.period);
      }),

    create: adminProcedure
      .input(z.object({
        type: z.enum(["entrada", "saida"]),
        amount: z.string(),
        category: z.string().min(1),
        description: z.string().min(1),
        paymentMethod: z.string().optional(),
        referenceDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        await createCashTransaction(input);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCashTransaction(input.id);
        return { success: true };
      }),
  }),

  // ─── Menu ─────────────────────────────────────────────────────────────────
  menu: router({
    categories: adminProcedure.query(async () => {
      const { getMenuCategories } = await import("./db-menu");
      return getMenuCategories();
    }),

    items: adminProcedure.query(async () => {
      const { getMenuItems } = await import("./db-menu");
      return getMenuItems();
    }),

    createCategory: adminProcedure
      .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { createMenuCategory } = await import("./db-menu");
        await createMenuCategory({ ...input, displayOrder: 0 });
        return { success: true };
      }),

    updateCategory: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).optional(), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { updateMenuCategory } = await import("./db-menu");
        const { id, ...data } = input;
        await updateMenuCategory(id, data);
        return { success: true };
      }),

    deleteCategory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteMenuCategory } = await import("./db-menu");
        await deleteMenuCategory(input.id);
        return { success: true };
      }),

    createItem: adminProcedure
      .input(z.object({ categoryId: z.number(), name: z.string().min(1), description: z.string().optional(), price: z.string(), imageUrl: z.string().optional(), available: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const { createMenuItem } = await import("./db-menu");
        await createMenuItem({ ...input, displayOrder: 0, available: input.available ?? true });
        return { success: true };
      }),

    updateItem: adminProcedure
      .input(z.object({ id: z.number(), categoryId: z.number().optional(), name: z.string().optional(), description: z.string().optional(), price: z.string().optional(), imageUrl: z.string().optional(), available: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const { updateMenuItem } = await import("./db-menu");
        const { id, ...data } = input;
        await updateMenuItem(id, data);
        return { success: true };
      }),

    deleteItem: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteMenuItem } = await import("./db-menu");
        await deleteMenuItem(input.id);
        return { success: true };
      }),

    publicMenu: publicProcedure.query(async () => {
      const { getAvailableMenuWithCategories } = await import("./db-menu");
      return getAvailableMenuWithCategories();
    }),
  }),

  // ─── Reports ───────────────────────────────────────────────────────────────
  reports: router({
    salesChart: adminProcedure
      .input(z.object({ period: z.string().default("mes") }))
      .query(async ({ input }) => {
        return getSalesChart(input.period);
      }),

    ordersByStatus: adminProcedure
      .input(z.object({ period: z.string().default("mes") }))
      .query(async ({ input }) => {
        return getOrdersByStatus(input.period);
      }),

    cashFlowChart: adminProcedure
      .input(z.object({ period: z.string().default("mes") }))
      .query(async ({ input }) => {
        return getCashFlowChart(input.period);
      }),

    topProducts: adminProcedure
      .input(z.object({ period: z.string().default("mes") }))
      .query(async ({ input }) => {
        return getTopProducts(input.period);
      }),
  }),
});

export type AppRouter = typeof appRouter;
