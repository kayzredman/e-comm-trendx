"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customersRelations = exports.orderItemsRelations = exports.ordersRelations = exports.productsRelations = exports.categoriesRelations = exports.deliverySettings = exports.deliveryZones = exports.cmsSections = exports.orderItems = exports.orders = exports.customers = exports.products = exports.categories = exports.users = exports.sectionPageEnum = exports.sectionTypeEnum = exports.feeStrategyEnum = exports.paymentMethodEnum = exports.orderStatusEnum = exports.productStatusEnum = exports.userRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const cuid2_1 = require("@paralleldrive/cuid2");
// ── Enums ─────────────────────────────────────────────────────────────────────
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', ['OWNER', 'MANAGER', 'CONTENT_EDITOR', 'ORDER_MANAGER', 'VIEWER', 'STAFF']);
exports.productStatusEnum = (0, pg_core_1.pgEnum)('product_status', ['ACTIVE', 'DRAFT', 'ARCHIVED']);
exports.orderStatusEnum = (0, pg_core_1.pgEnum)('order_status', [
    'PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
]);
exports.paymentMethodEnum = (0, pg_core_1.pgEnum)('payment_method', ['CASH_ON_DELIVERY', 'MOBILE_MONEY', 'CARD']);
exports.feeStrategyEnum = (0, pg_core_1.pgEnum)('fee_strategy', ['FLAT', 'DISTANCE_BASED', 'FREE_THRESHOLD', 'COMBINED']);
exports.sectionTypeEnum = (0, pg_core_1.pgEnum)('section_type', ['HERO', 'FEATURED', 'BANNER', 'ANNOUNCEMENT']);
exports.sectionPageEnum = (0, pg_core_1.pgEnum)('section_page', ['HOME']);
// ── Users (admin/staff — Clerk synced) ───────────────────────────────────────
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    clerkId: (0, pg_core_1.varchar)('clerk_id', { length: 255 }).notNull().unique(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    role: (0, exports.userRoleEnum)('role').notNull().default('STAFF'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
// ── Categories ────────────────────────────────────────────────────────────────
exports.categories = (0, pg_core_1.pgTable)('categories', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    slug: (0, pg_core_1.varchar)('slug', { length: 255 }).notNull().unique(),
    parentId: (0, pg_core_1.varchar)('parent_id', { length: 128 }),
    imageUrl: (0, pg_core_1.text)('image_url'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// ── Products ──────────────────────────────────────────────────────────────────
exports.products = (0, pg_core_1.pgTable)('products', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    slug: (0, pg_core_1.varchar)('slug', { length: 255 }).notNull().unique(),
    description: (0, pg_core_1.text)('description'),
    price: (0, pg_core_1.numeric)('price', { precision: 12, scale: 2 }).notNull(),
    comparePrice: (0, pg_core_1.numeric)('compare_price', { precision: 12, scale: 2 }),
    sku: (0, pg_core_1.varchar)('sku', { length: 100 }),
    inventory: (0, pg_core_1.integer)('inventory').notNull().default(0),
    categoryId: (0, pg_core_1.varchar)('category_id', { length: 128 }),
    images: (0, pg_core_1.jsonb)('images').$type().notNull().default([]),
    status: (0, exports.productStatusEnum)('status').notNull().default('DRAFT'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
// ── Customers (guest — no auth) ───────────────────────────────────────────────
exports.customers = (0, pg_core_1.pgTable)('customers', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    phone: (0, pg_core_1.varchar)('phone', { length: 30 }).notNull(),
    address: (0, pg_core_1.jsonb)('address').$type().notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// ── Orders ────────────────────────────────────────────────────────────────────
exports.orders = (0, pg_core_1.pgTable)('orders', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    customerId: (0, pg_core_1.varchar)('customer_id', { length: 128 }).notNull(),
    status: (0, exports.orderStatusEnum)('status').notNull().default('PENDING'),
    subtotal: (0, pg_core_1.numeric)('subtotal', { precision: 12, scale: 2 }).notNull(),
    deliveryFee: (0, pg_core_1.numeric)('delivery_fee', { precision: 12, scale: 2 }).notNull().default('0'),
    total: (0, pg_core_1.numeric)('total', { precision: 12, scale: 2 }).notNull(),
    notes: (0, pg_core_1.text)('notes'),
    paymentMethod: (0, exports.paymentMethodEnum)('payment_method').notNull().default('CASH_ON_DELIVERY'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.orderItems = (0, pg_core_1.pgTable)('order_items', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    orderId: (0, pg_core_1.varchar)('order_id', { length: 128 }).notNull(),
    productId: (0, pg_core_1.varchar)('product_id', { length: 128 }).notNull(),
    productName: (0, pg_core_1.varchar)('product_name', { length: 255 }).notNull(),
    unitPrice: (0, pg_core_1.numeric)('unit_price', { precision: 12, scale: 2 }).notNull(),
    quantity: (0, pg_core_1.integer)('quantity').notNull(),
});
// ── CMS Sections ──────────────────────────────────────────────────────────────
exports.cmsSections = (0, pg_core_1.pgTable)('cms_sections', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    page: (0, exports.sectionPageEnum)('page').notNull().default('HOME'),
    type: (0, exports.sectionTypeEnum)('type').notNull(),
    data: (0, pg_core_1.jsonb)('data').$type().notNull().default({}),
    order: (0, pg_core_1.integer)('order').notNull().default(0),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
// ── Delivery Zones ────────────────────────────────────────────────────────────
exports.deliveryZones = (0, pg_core_1.pgTable)('delivery_zones', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    baseFee: (0, pg_core_1.numeric)('base_fee', { precision: 10, scale: 2 }).notNull().default('0'),
    feeStrategy: (0, exports.feeStrategyEnum)('fee_strategy').notNull().default('FLAT'),
    feePerKm: (0, pg_core_1.numeric)('fee_per_km', { precision: 8, scale: 2 }),
    freeThreshold: (0, pg_core_1.numeric)('free_threshold', { precision: 12, scale: 2 }),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
});
exports.deliverySettings = (0, pg_core_1.pgTable)('delivery_settings', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    defaultStrategy: (0, exports.feeStrategyEnum)('default_strategy').notNull().default('FLAT'),
    estimatedDaysMin: (0, pg_core_1.integer)('estimated_days_min').notNull().default(1),
    estimatedDaysMax: (0, pg_core_1.integer)('estimated_days_max').notNull().default(3),
});
// ── Relations ─────────────────────────────────────────────────────────────────
exports.categoriesRelations = (0, drizzle_orm_1.relations)(exports.categories, ({ one, many }) => ({
    parent: one(exports.categories, { fields: [exports.categories.parentId], references: [exports.categories.id], relationName: 'parentChildren' }),
    children: many(exports.categories, { relationName: 'parentChildren' }),
    products: many(exports.products),
}));
exports.productsRelations = (0, drizzle_orm_1.relations)(exports.products, ({ one, many }) => ({
    category: one(exports.categories, { fields: [exports.products.categoryId], references: [exports.categories.id] }),
    orderItems: many(exports.orderItems),
}));
exports.ordersRelations = (0, drizzle_orm_1.relations)(exports.orders, ({ one, many }) => ({
    customer: one(exports.customers, { fields: [exports.orders.customerId], references: [exports.customers.id] }),
    items: many(exports.orderItems),
}));
exports.orderItemsRelations = (0, drizzle_orm_1.relations)(exports.orderItems, ({ one }) => ({
    order: one(exports.orders, { fields: [exports.orderItems.orderId], references: [exports.orders.id] }),
    product: one(exports.products, { fields: [exports.orderItems.productId], references: [exports.products.id] }),
}));
exports.customersRelations = (0, drizzle_orm_1.relations)(exports.customers, ({ many }) => ({
    orders: many(exports.orders),
}));
//# sourceMappingURL=schema.js.map