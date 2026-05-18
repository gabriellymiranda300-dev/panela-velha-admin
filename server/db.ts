import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  cashTransactions,
  orderItems,
  orders,
  stockItems,
  stockMovements,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function getOrders(status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = status ? [eq(orders.status, status as any)] : [];
  return db.select().from(orders).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return { ...order, items };
}

export async function createOrder(data: {
  customerName: string;
  customerPhone?: string;
  notes?: string;
  paymentMethod?: string;
  items: { productName: string; quantity: number; unitPrice: string }[];
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const total = data.items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
  const [result] = await db.insert(orders).values({
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    notes: data.notes,
    paymentMethod: data.paymentMethod,
    totalAmount: String(total.toFixed(2)),
  });
  const orderId = (result as any).insertId;
  if (data.items.length > 0) {
    await db.insert(orderItems).values(data.items.map((i) => ({ orderId, ...i })));
  }
  return orderId;
}

export async function updateOrderStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set({ status: status as any }).where(eq(orders.id, id));
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export async function getStockItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stockItems).orderBy(stockItems.name);
}

export async function createStockItem(data: {
  name: string; category?: string; unit: string;
  currentQuantity: string; minimumQuantity: string; costPerUnit?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(stockItems).values({ ...data, notificationSent: false });
}

export async function updateStockItem(id: number, data: Partial<{
  name: string; category: string; unit: string;
  currentQuantity: string; minimumQuantity: string; costPerUnit: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(stockItems).set({ ...data, notificationSent: false }).where(eq(stockItems.id, id));
}

export async function deleteStockItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(stockItems).where(eq(stockItems.id, id));
}

export async function addStockMovement(data: {
  stockItemId: number; type: "entrada" | "saida" | "ajuste"; quantity: string; reason?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(stockMovements).values(data);
  const [item] = await db.select().from(stockItems).where(eq(stockItems.id, data.stockItemId)).limit(1);
  if (item) {
    const current = Number(item.currentQuantity);
    const qty = Number(data.quantity);
    let newQty = current;
    if (data.type === "entrada") newQty = current + qty;
    else if (data.type === "saida") newQty = Math.max(0, current - qty);
    else newQty = qty;
    const isLow = newQty <= Number(item.minimumQuantity);
    await db.update(stockItems).set({
      currentQuantity: String(newQty.toFixed(3)),
      notificationSent: isLow ? item.notificationSent : false,
    }).where(eq(stockItems.id, data.stockItemId));
  }
  return item;
}

export async function getStockMovements(stockItemId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stockMovements).where(eq(stockMovements.stockItemId, stockItemId)).orderBy(desc(stockMovements.createdAt)).limit(50);
}

export async function getLowStockItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stockItems).where(
    and(
      sql`${stockItems.currentQuantity} <= ${stockItems.minimumQuantity}`,
      eq(stockItems.notificationSent, false)
    )
  );
}

export async function markStockNotificationSent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(stockItems).set({ notificationSent: true }).where(eq(stockItems.id, id));
}

// ─── Cash ─────────────────────────────────────────────────────────────────────

function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);
  if (period === "semana") {
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
  } else if (period === "mes") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "ano") {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    start = new Date(2020, 0, 1);
  }
  return { start, end };
}

export async function getCashTransactions(period: string) {
  const db = await getDb();
  if (!db) return [];
  const { start, end } = getPeriodRange(period);
  return db.select().from(cashTransactions)
    .where(and(gte(cashTransactions.referenceDate, start), lte(cashTransactions.referenceDate, end)))
    .orderBy(desc(cashTransactions.referenceDate));
}

export async function getCashSummary(period: string) {
  const db = await getDb();
  if (!db) return { totalIncome: "0", totalExpense: "0" };
  const { start, end } = getPeriodRange(period);
  const txs = await db.select().from(cashTransactions)
    .where(and(gte(cashTransactions.referenceDate, start), lte(cashTransactions.referenceDate, end)));
  const totalIncome = txs.filter((t) => t.type === "entrada").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = txs.filter((t) => t.type === "saida").reduce((s, t) => s + Number(t.amount), 0);
  return { totalIncome: String(totalIncome.toFixed(2)), totalExpense: String(totalExpense.toFixed(2)) };
}

export async function createCashTransaction(data: {
  type: "entrada" | "saida"; amount: string; category: string;
  description: string; paymentMethod?: string; referenceDate: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(cashTransactions).values(data);
}

export async function deleteCashTransaction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(cashTransactions).where(eq(cashTransactions.id, id));
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardSummary() {
  const db = await getDb();
  if (!db) return { todayOrders: 0, todayRevenue: "0", activeOrders: 0, lowStockItems: 0, recentOrders: [] };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayOrdersList = await db.select().from(orders)
    .where(and(gte(orders.createdAt, today), lte(orders.createdAt, tomorrow)));

  const todayRevenue = todayOrdersList
    .filter((o) => o.status !== "cancelado")
    .reduce((s, o) => s + Number(o.totalAmount), 0);

  const activeOrders = todayOrdersList.filter((o) => ["novo", "em_preparo", "pronto"].includes(o.status)).length;

  const allStock = await db.select().from(stockItems);
  const lowStockItems = allStock.filter((i) => Number(i.currentQuantity) <= Number(i.minimumQuantity)).length;

  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);

  return {
    todayOrders: todayOrdersList.length,
    todayRevenue: String(todayRevenue.toFixed(2)),
    activeOrders,
    lowStockItems,
    recentOrders,
  };
}

export async function getWeeklyChart() {
  const db = await getDb();
  if (!db) return [];

  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const next = new Date(date);
    next.setDate(date.getDate() + 1);

    const dayOrders = await db.select().from(orders)
      .where(and(gte(orders.createdAt, date), lte(orders.createdAt, next)));

    const revenue = dayOrders.filter((o) => o.status !== "cancelado")
      .reduce((s, o) => s + Number(o.totalAmount), 0);

    result.push({ day: days[date.getDay()], revenue: Number(revenue.toFixed(2)), orders: dayOrders.length });
  }
  return result;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function getSalesChart(period: string) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const result: { label: string; revenue: number; orders: number }[] = [];

  if (period === "semana") {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const next = new Date(date);
      next.setDate(date.getDate() + 1);
      const dayOrders = await db.select().from(orders)
        .where(and(gte(orders.createdAt, date), lte(orders.createdAt, next)));
      const revenue = dayOrders.filter((o) => o.status !== "cancelado").reduce((s, o) => s + Number(o.totalAmount), 0);
      result.push({ label: days[date.getDay()], revenue: Number(revenue.toFixed(2)), orders: dayOrders.length });
    }
  } else if (period === "mes") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      const next = new Date(now.getFullYear(), now.getMonth(), d + 1);
      const dayOrders = await db.select().from(orders)
        .where(and(gte(orders.createdAt, date), lte(orders.createdAt, next)));
      const revenue = dayOrders.filter((o) => o.status !== "cancelado").reduce((s, o) => s + Number(o.totalAmount), 0);
      result.push({ label: String(d), revenue: Number(revenue.toFixed(2)), orders: dayOrders.length });
    }
  } else {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (let m = 0; m < 12; m++) {
      const start = new Date(now.getFullYear(), m, 1);
      const end = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59);
      const monthOrders = await db.select().from(orders)
        .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));
      const revenue = monthOrders.filter((o) => o.status !== "cancelado").reduce((s, o) => s + Number(o.totalAmount), 0);
      result.push({ label: months[m], revenue: Number(revenue.toFixed(2)), orders: monthOrders.length });
    }
  }
  return result;
}

export async function getOrdersByStatus(period: string) {
  const db = await getDb();
  if (!db) return [];
  const { start, end } = getPeriodRange(period);
  const allOrders = await db.select().from(orders)
    .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));
  const counts: Record<string, number> = {};
  allOrders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
  return Object.entries(counts).map(([status, count]) => ({ status, count }));
}

export async function getCashFlowChart(period: string) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const result: { label: string; income: number; expense: number }[] = [];

  if (period === "semana") {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const next = new Date(date);
      next.setDate(date.getDate() + 1);
      const txs = await db.select().from(cashTransactions)
        .where(and(gte(cashTransactions.referenceDate, date), lte(cashTransactions.referenceDate, next)));
      const income = txs.filter((t) => t.type === "entrada").reduce((s, t) => s + Number(t.amount), 0);
      const expense = txs.filter((t) => t.type === "saida").reduce((s, t) => s + Number(t.amount), 0);
      result.push({ label: days[date.getDay()], income: Number(income.toFixed(2)), expense: Number(expense.toFixed(2)) });
    }
  } else if (period === "mes") {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      const next = new Date(now.getFullYear(), now.getMonth(), d + 1);
      const txs = await db.select().from(cashTransactions)
        .where(and(gte(cashTransactions.referenceDate, date), lte(cashTransactions.referenceDate, next)));
      const income = txs.filter((t) => t.type === "entrada").reduce((s, t) => s + Number(t.amount), 0);
      const expense = txs.filter((t) => t.type === "saida").reduce((s, t) => s + Number(t.amount), 0);
      result.push({ label: String(d), income: Number(income.toFixed(2)), expense: Number(expense.toFixed(2)) });
    }
  } else {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (let m = 0; m < 12; m++) {
      const start = new Date(now.getFullYear(), m, 1);
      const end = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59);
      const txs = await db.select().from(cashTransactions)
        .where(and(gte(cashTransactions.referenceDate, start), lte(cashTransactions.referenceDate, end)));
      const income = txs.filter((t) => t.type === "entrada").reduce((s, t) => s + Number(t.amount), 0);
      const expense = txs.filter((t) => t.type === "saida").reduce((s, t) => s + Number(t.amount), 0);
      result.push({ label: months[m], income: Number(income.toFixed(2)), expense: Number(expense.toFixed(2)) });
    }
  }
  return result;
}

export async function getTopProducts(period: string) {
  const db = await getDb();
  if (!db) return [];
  const { start, end } = getPeriodRange(period);
  const periodOrders = await db.select().from(orders)
    .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));
  if (periodOrders.length === 0) return [];
  const orderIds = periodOrders.map((o) => o.id);
  const allItems = await db.select().from(orderItems);
  const filtered = allItems.filter((i) => orderIds.includes(i.orderId));
  const counts: Record<string, number> = {};
  filtered.forEach((i) => { counts[i.productName] = (counts[i.productName] || 0) + i.quantity; });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}
