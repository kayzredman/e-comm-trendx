"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.posHoldsRelations = exports.posShiftsRelations = exports.posRegistersRelations = exports.posHolds = exports.posShifts = exports.posRegisters = exports.notificationLog = exports.notificationStatusEnum = exports.notificationChannelEnum = exports.discountCodes = exports.discountTypeEnum = exports.reviewsRelations = exports.reviews = exports.reviewStatusEnum = exports.customersRelations = exports.orderItemsRelations = exports.ordersRelations = exports.productsRelations = exports.categoriesRelations = exports.deliverySettings = exports.deliveryZones = exports.cmsSections = exports.orderItems = exports.orders = exports.customers = exports.products = exports.categories = exports.users = exports.sectionPageEnum = exports.sectionTypeEnum = exports.feeStrategyEnum = exports.posHoldStatusEnum = exports.posShiftStatusEnum = exports.orderSourceEnum = exports.paymentMethodEnum = exports.orderStatusEnum = exports.productStatusEnum = exports.userRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const cuid2_1 = require("@paralleldrive/cuid2");
// ── Enums ─────────────────────────────────────────────────────────────────────
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', ['OWNER', 'MANAGER', 'CONTENT_EDITOR', 'ORDER_MANAGER', 'VIEWER', 'STAFF', 'CASHIER']);
exports.productStatusEnum = (0, pg_core_1.pgEnum)('product_status', ['ACTIVE', 'DRAFT', 'ARCHIVED']);
exports.orderStatusEnum = (0, pg_core_1.pgEnum)('order_status', [
    'PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
]);
exports.paymentMethodEnum = (0, pg_core_1.pgEnum)('payment_method', ['CASH_ON_DELIVERY', 'MOBILE_MONEY', 'CARD', 'CASH']);
exports.orderSourceEnum = (0, pg_core_1.pgEnum)('order_source', ['ONLINE', 'POS']);
exports.posShiftStatusEnum = (0, pg_core_1.pgEnum)('pos_shift_status', ['OPEN', 'CLOSED']);
exports.posHoldStatusEnum = (0, pg_core_1.pgEnum)('pos_hold_status', ['HELD', 'RESUMED', 'VOIDED']);
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
    customerId: (0, pg_core_1.varchar)('customer_id', { length: 128 }),
    status: (0, exports.orderStatusEnum)('status').notNull().default('PENDING'),
    source: (0, exports.orderSourceEnum)('source').notNull().default('ONLINE'),
    subtotal: (0, pg_core_1.numeric)('subtotal', { precision: 12, scale: 2 }).notNull(),
    deliveryFee: (0, pg_core_1.numeric)('delivery_fee', { precision: 12, scale: 2 }).notNull().default('0'),
    discountAmount: (0, pg_core_1.numeric)('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    discountReason: (0, pg_core_1.varchar)('discount_reason', { length: 255 }),
    taxAmount: (0, pg_core_1.numeric)('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    total: (0, pg_core_1.numeric)('total', { precision: 12, scale: 2 }).notNull(),
    notes: (0, pg_core_1.text)('notes'),
    paymentMethod: (0, exports.paymentMethodEnum)('payment_method').notNull().default('CASH_ON_DELIVERY'),
    // POS-specific
    cashierId: (0, pg_core_1.varchar)('cashier_id', { length: 128 }),
    shiftId: (0, pg_core_1.varchar)('shift_id', { length: 128 }),
    registerId: (0, pg_core_1.varchar)('register_id', { length: 128 }),
    tenderedAmount: (0, pg_core_1.numeric)('tendered_amount', { precision: 12, scale: 2 }),
    changeAmount: (0, pg_core_1.numeric)('change_amount', { precision: 12, scale: 2 }),
    momoReference: (0, pg_core_1.varchar)('momo_reference', { length: 64 }),
    cardLast4: (0, pg_core_1.varchar)('card_last4', { length: 4 }),
    receiptNumber: (0, pg_core_1.varchar)('receipt_number', { length: 32 }),
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
// ── Reviews (FEATURE_REVIEWS) ────────────────────────────────────────────────
exports.reviewStatusEnum = (0, pg_core_1.pgEnum)('review_status', ['PENDING', 'PUBLISHED', 'HIDDEN']);
exports.reviews = (0, pg_core_1.pgTable)('reviews', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    productId: (0, pg_core_1.varchar)('product_id', { length: 128 }).notNull(),
    customerId: (0, pg_core_1.varchar)('customer_id', { length: 128 }).notNull(),
    orderId: (0, pg_core_1.varchar)('order_id', { length: 128 }),
    rating: (0, pg_core_1.integer)('rating').notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }),
    body: (0, pg_core_1.text)('body'),
    status: (0, exports.reviewStatusEnum)('status').notNull().default('PENDING'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.reviewsRelations = (0, drizzle_orm_1.relations)(exports.reviews, ({ one }) => ({
    product: one(exports.products, { fields: [exports.reviews.productId], references: [exports.products.id] }),
    customer: one(exports.customers, { fields: [exports.reviews.customerId], references: [exports.customers.id] }),
    order: one(exports.orders, { fields: [exports.reviews.orderId], references: [exports.orders.id] }),
}));
// ── Discount codes (FEATURE_DISCOUNTS) ───────────────────────────────────────
exports.discountTypeEnum = (0, pg_core_1.pgEnum)('discount_type', ['PERCENT', 'FIXED']);
exports.discountCodes = (0, pg_core_1.pgTable)('discount_codes', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    code: (0, pg_core_1.varchar)('code', { length: 64 }).notNull().unique(),
    type: (0, exports.discountTypeEnum)('type').notNull(),
    value: (0, pg_core_1.numeric)('value', { precision: 12, scale: 2 }).notNull(),
    minSubtotal: (0, pg_core_1.numeric)('min_subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    maxUses: (0, pg_core_1.integer)('max_uses'),
    usedCount: (0, pg_core_1.integer)('used_count').notNull().default(0),
    expiresAt: (0, pg_core_1.timestamp)('expires_at'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// ── Notification log (FEATURE_NOTIFICATIONS) ─────────────────────────────────
exports.notificationChannelEnum = (0, pg_core_1.pgEnum)('notification_channel', ['SMS', 'EMAIL']);
exports.notificationStatusEnum = (0, pg_core_1.pgEnum)('notification_status', ['QUEUED', 'SENT', 'FAILED']);
exports.notificationLog = (0, pg_core_1.pgTable)('notification_log', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    orderId: (0, pg_core_1.varchar)('order_id', { length: 128 }),
    customerId: (0, pg_core_1.varchar)('customer_id', { length: 128 }),
    channel: (0, exports.notificationChannelEnum)('channel').notNull(),
    template: (0, pg_core_1.varchar)('template', { length: 64 }).notNull(),
    recipient: (0, pg_core_1.varchar)('recipient', { length: 255 }).notNull(),
    status: (0, exports.notificationStatusEnum)('status').notNull().default('QUEUED'),
    providerId: (0, pg_core_1.varchar)('provider_id', { length: 255 }),
    errorMessage: (0, pg_core_1.text)('error_message'),
    payload: (0, pg_core_1.jsonb)('payload').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    sentAt: (0, pg_core_1.timestamp)('sent_at'),
});
// ── POS Registers ─────────────────────────────────────────────────────────────
exports.posRegisters = (0, pg_core_1.pgTable)('pos_registers', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    location: (0, pg_core_1.varchar)('location', { length: 255 }),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// ── POS Shifts (clock in/out per cashier per register) ───────────────────────
exports.posShifts = (0, pg_core_1.pgTable)('pos_shifts', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    registerId: (0, pg_core_1.varchar)('register_id', { length: 128 }).notNull(),
    cashierId: (0, pg_core_1.varchar)('cashier_id', { length: 128 }).notNull(),
    status: (0, exports.posShiftStatusEnum)('status').notNull().default('OPEN'),
    openingFloat: (0, pg_core_1.numeric)('opening_float', { precision: 12, scale: 2 }).notNull().default('0'),
    closingCash: (0, pg_core_1.numeric)('closing_cash', { precision: 12, scale: 2 }),
    expectedCash: (0, pg_core_1.numeric)('expected_cash', { precision: 12, scale: 2 }),
    cashVariance: (0, pg_core_1.numeric)('cash_variance', { precision: 12, scale: 2 }),
    notes: (0, pg_core_1.text)('notes'),
    openedAt: (0, pg_core_1.timestamp)('opened_at').notNull().defaultNow(),
    closedAt: (0, pg_core_1.timestamp)('closed_at'),
});
// ── POS Held Carts (suspended sales) ─────────────────────────────────────────
exports.posHolds = (0, pg_core_1.pgTable)('pos_holds', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    shiftId: (0, pg_core_1.varchar)('shift_id', { length: 128 }).notNull(),
    cashierId: (0, pg_core_1.varchar)('cashier_id', { length: 128 }).notNull(),
    customerId: (0, pg_core_1.varchar)('customer_id', { length: 128 }),
    label: (0, pg_core_1.varchar)('label', { length: 100 }),
    cart: (0, pg_core_1.jsonb)('cart').$type().notNull(),
    status: (0, exports.posHoldStatusEnum)('status').notNull().default('HELD'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    resolvedAt: (0, pg_core_1.timestamp)('resolved_at'),
});
// ── POS Relations ─────────────────────────────────────────────────────────────
exports.posRegistersRelations = (0, drizzle_orm_1.relations)(exports.posRegisters, ({ many }) => ({
    shifts: many(exports.posShifts),
}));
exports.posShiftsRelations = (0, drizzle_orm_1.relations)(exports.posShifts, ({ one, many }) => ({
    register: one(exports.posRegisters, { fields: [exports.posShifts.registerId], references: [exports.posRegisters.id] }),
    cashier: one(exports.users, { fields: [exports.posShifts.cashierId], references: [exports.users.id] }),
    orders: many(exports.orders),
    holds: many(exports.posHolds),
}));
exports.posHoldsRelations = (0, drizzle_orm_1.relations)(exports.posHolds, ({ one }) => ({
    shift: one(exports.posShifts, { fields: [exports.posHolds.shiftId], references: [exports.posShifts.id] }),
    cashier: one(exports.users, { fields: [exports.posHolds.cashierId], references: [exports.users.id] }),
    customer: one(exports.customers, { fields: [exports.posHolds.customerId], references: [exports.customers.id] }),
}));
//# sourceMappingURL=schema.js.map