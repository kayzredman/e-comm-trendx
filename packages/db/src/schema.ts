import { pgTable, text, varchar, integer, numeric, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

// ── Enums ─────────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', ['OWNER', 'MANAGER', 'CONTENT_EDITOR', 'ORDER_MANAGER', 'VIEWER', 'STAFF'])
export const productStatusEnum = pgEnum('product_status', ['ACTIVE', 'DRAFT', 'ARCHIVED'])
export const orderStatusEnum = pgEnum('order_status', [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
])
export const paymentMethodEnum = pgEnum('payment_method', ['CASH_ON_DELIVERY', 'MOBILE_MONEY', 'CARD'])
export const feeStrategyEnum = pgEnum('fee_strategy', ['FLAT', 'DISTANCE_BASED', 'FREE_THRESHOLD', 'COMBINED'])
export const sectionTypeEnum = pgEnum('section_type', ['HERO', 'FEATURED', 'BANNER', 'ANNOUNCEMENT'])
export const sectionPageEnum = pgEnum('section_page', ['HOME'])

// ── Users (admin/staff — Clerk synced) ───────────────────────────────────────
export const users = pgTable('users', {
  id: varchar('id', { length: 128 }).$defaultFn(() => createId()).primaryKey(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('STAFF'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── Categories ────────────────────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: varchar('id', { length: 128 }).$defaultFn(() => createId()).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  parentId: varchar('parent_id', { length: 128 }),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Products ──────────────────────────────────────────────────────────────────
export const products = pgTable('products', {
  id: varchar('id', { length: 128 }).$defaultFn(() => createId()).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  comparePrice: numeric('compare_price', { precision: 12, scale: 2 }),
  sku: varchar('sku', { length: 100 }),
  inventory: integer('inventory').notNull().default(0),
  categoryId: varchar('category_id', { length: 128 }),
  images: jsonb('images').$type<string[]>().notNull().default([]),
  status: productStatusEnum('status').notNull().default('DRAFT'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── Customers (guest — no auth) ───────────────────────────────────────────────
export const customers = pgTable('customers', {
  id: varchar('id', { length: 128 }).$defaultFn(() => createId()).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }).notNull(),
  address: jsonb('address').$type<{
    street: string
    city: string
    region: string
    country: string
    zip: string | null
  }>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Orders ────────────────────────────────────────────────────────────────────
export const orders = pgTable('orders', {
  id: varchar('id', { length: 128 }).$defaultFn(() => createId()).primaryKey(),
  customerId: varchar('customer_id', { length: 128 }).notNull(),
  status: orderStatusEnum('status').notNull().default('PENDING'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  deliveryFee: numeric('delivery_fee', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  notes: text('notes'),
  paymentMethod: paymentMethodEnum('payment_method').notNull().default('CASH_ON_DELIVERY'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const orderItems = pgTable('order_items', {
  id: varchar('id', { length: 128 }).$defaultFn(() => createId()).primaryKey(),
  orderId: varchar('order_id', { length: 128 }).notNull(),
  productId: varchar('product_id', { length: 128 }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
})

// ── CMS Sections ──────────────────────────────────────────────────────────────
export const cmsSections = pgTable('cms_sections', {
  id: varchar('id', { length: 128 }).$defaultFn(() => createId()).primaryKey(),
  page: sectionPageEnum('page').notNull().default('HOME'),
  type: sectionTypeEnum('type').notNull(),
  data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
  order: integer('order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── Delivery Zones ────────────────────────────────────────────────────────────
export const deliveryZones = pgTable('delivery_zones', {
  id: varchar('id', { length: 128 }).$defaultFn(() => createId()).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  baseFee: numeric('base_fee', { precision: 10, scale: 2 }).notNull().default('0'),
  feeStrategy: feeStrategyEnum('fee_strategy').notNull().default('FLAT'),
  feePerKm: numeric('fee_per_km', { precision: 8, scale: 2 }),
  freeThreshold: numeric('free_threshold', { precision: 12, scale: 2 }),
  isActive: boolean('is_active').notNull().default(true),
})

export const deliverySettings = pgTable('delivery_settings', {
  id: varchar('id', { length: 128 }).$defaultFn(() => createId()).primaryKey(),
  defaultStrategy: feeStrategyEnum('default_strategy').notNull().default('FLAT'),
  estimatedDaysMin: integer('estimated_days_min').notNull().default(1),
  estimatedDaysMax: integer('estimated_days_max').notNull().default(3),
})

// ── Relations ─────────────────────────────────────────────────────────────────
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: 'parentChildren' }),
  children: many(categories, { relationName: 'parentChildren' }),
  products: many(products),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  orderItems: many(orderItems),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}))

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}))
