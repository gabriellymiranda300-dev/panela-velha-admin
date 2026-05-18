import { eq, asc } from "drizzle-orm";
import { getDb } from "./db";
import { menuCategories, menuItems, InsertMenuCategory, InsertMenuItem } from "../drizzle/schema";

// ─── Menu Categories ──────────────────────────────────────────────────────────

export async function getMenuCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuCategories).orderBy(asc(menuCategories.displayOrder));
}

export async function createMenuCategory(data: InsertMenuCategory) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(menuCategories).values(data);
}

export async function updateMenuCategory(id: number, data: Partial<InsertMenuCategory>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(menuCategories).set(data).where(eq(menuCategories.id, id));
}

export async function deleteMenuCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Deletar todos os itens da categoria primeiro
  await db.delete(menuItems).where(eq(menuItems.categoryId, id));
  await db.delete(menuCategories).where(eq(menuCategories.id, id));
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

export async function getMenuItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuItems).orderBy(asc(menuItems.displayOrder));
}

export async function getMenuItemsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(menuItems)
    .where(eq(menuItems.categoryId, categoryId))
    .orderBy(asc(menuItems.displayOrder));
}

export async function getAvailableMenuItems() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(menuItems)
    .where(eq(menuItems.available, true))
    .orderBy(asc(menuItems.displayOrder));
}

export async function createMenuItem(data: InsertMenuItem) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(menuItems).values(data);
}

export async function updateMenuItem(id: number, data: Partial<InsertMenuItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(menuItems).set(data).where(eq(menuItems.id, id));
}

export async function toggleMenuItemAvailability(id: number, available: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(menuItems).set({ available }).where(eq(menuItems.id, id));
}

export async function deleteMenuItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(menuItems).where(eq(menuItems.id, id));
}

// ─── Menu with Categories ─────────────────────────────────────────────────────

export async function getMenuWithCategories() {
  const db = await getDb();
  if (!db) return [];
  const cats = await db.select().from(menuCategories).orderBy(asc(menuCategories.displayOrder));
  const items = await db.select().from(menuItems).orderBy(asc(menuItems.displayOrder));
  return cats.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.categoryId === cat.id),
  }));
}

export async function getAvailableMenuWithCategories() {
  const db = await getDb();
  if (!db) return [];
  const cats = await db.select().from(menuCategories).orderBy(asc(menuCategories.displayOrder));
  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.available, true))
    .orderBy(asc(menuItems.displayOrder));
  return cats
    .map((cat) => ({
      ...cat,
      items: items.filter((i) => i.categoryId === cat.id),
    }))
    .filter((cat) => cat.items.length > 0);
}
