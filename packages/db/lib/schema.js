"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentProviderEnum = exports.payoutMethodEnum = exports.paymentVerificationStatusEnum = exports.deliveryEventTypeEnum = exports.assignmentStatusEnum = exports.courierTypeEnum = exports.productVariantsRelations = exports.productVariants = exports.productImagesRelations = exports.productImages = exports.imageSourceEnum = exports.posHoldsRelations = exports.posShiftsRelations = exports.posRegistersRelations = exports.posHolds = exports.posShifts = exports.posRegisters = exports.notificationLog = exports.notificationStatusEnum = exports.notificationChannelEnum = exports.discountCodes = exports.discountTypeEnum = exports.reviewsRelations = exports.reviews = exports.reviewStatusEnum = exports.customersRelations = exports.orderItemsRelations = exports.ordersRelations = exports.productsRelations = exports.categoriesRelations = exports.deliverySettings = exports.deliveryZones = exports.cmsSections = exports.orderItems = exports.orders = exports.customers = exports.products = exports.categories = exports.users = exports.sectionPageEnum = exports.sectionTypeEnum = exports.feeStrategyEnum = exports.posHoldStatusEnum = exports.posShiftStatusEnum = exports.orderSourceEnum = exports.paymentMethodEnum = exports.paymentStatusEnum = exports.orderStatusEnum = exports.productStatusEnum = exports.userRoleEnum = void 0;
exports.paymentVerificationsRelations = exports.payoutsRelations = exports.deliveryEventsRelations = exports.deliveryAssignmentsRelations = exports.couriersRelations = exports.paymentVerifications = exports.payouts = exports.deliveryEvents = exports.deliveryAssignments = exports.couriers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const cuid2_1 = require("@paralleldrive/cuid2");
// ── Enums ─────────────────────────────────────────────────────────────────────
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', ['OWNER', 'MANAGER', 'CONTENT_EDITOR', 'ORDER_MANAGER', 'VIEWER', 'STAFF', 'CASHIER']);
exports.productStatusEnum = (0, pg_core_1.pgEnum)('product_status', ['ACTIVE', 'DRAFT', 'ARCHIVED']);
exports.orderStatusEnum = (0, pg_core_1.pgEnum)('order_status', [
    'PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
]);
exports.paymentStatusEnum = (0, pg_core_1.pgEnum)('payment_status', ['PENDING', 'PAID', 'FAILED', 'REFUNDED']);
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
    // Delivery v1
    paymentStatus: (0, exports.paymentStatusEnum)('payment_status').notNull().default('PENDING'),
    paidAt: (0, pg_core_1.timestamp)('paid_at'),
    zoneId: (0, pg_core_1.varchar)('zone_id', { length: 128 }),
    // 4-digit OTP shown to customer; courier reads it at handoff
    deliveryCode: (0, pg_core_1.varchar)('delivery_code', { length: 8 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.orderItems = (0, pg_core_1.pgTable)('order_items', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    orderId: (0, pg_core_1.varchar)('order_id', { length: 128 }).notNull(),
    productId: (0, pg_core_1.varchar)('product_id', { length: 128 }).notNull(),
    productName: (0, pg_core_1.varchar)('product_name', { length: 255 }).notNull(),
    /** Snapshot of the variant at order time. NULL for variant-less products
     *  or legacy orders placed before the variants feature. */
    variantId: (0, pg_core_1.varchar)('variant_id', { length: 128 }),
    variantLabel: (0, pg_core_1.varchar)('variant_label', { length: 255 }),
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
    // When true, orders to this zone must be paid before fulfilment (no COD)
    requiresPrepayment: (0, pg_core_1.boolean)('requires_prepayment').notNull().default(false),
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
    imageAssets: many(exports.productImages),
    variants: many(exports.productVariants),
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
    // Surface this code passively on storefront (top strip + checkout suggestion).
    isPromoted: (0, pg_core_1.boolean)('is_promoted').notNull().default(false),
    // Optional human-friendly tagline shown alongside the code.
    promoLabel: (0, pg_core_1.varchar)('promo_label', { length: 140 }),
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
// ── Product images (FEATURE_IMAGE_UPLOAD) ────────────────────────────────────
// Per-image metadata for uploaded product photos. URL-only images (legacy
// products.images[] strings, or merchant-pasted external URLs) live as
// rows with source='external' and storageKey=NULL.
exports.imageSourceEnum = (0, pg_core_1.pgEnum)('image_source', ['upload', 'external']);
exports.productImages = (0, pg_core_1.pgTable)('product_images', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    productId: (0, pg_core_1.varchar)('product_id', { length: 128 }).notNull(),
    source: (0, exports.imageSourceEnum)('source').notNull().default('upload'),
    /** R2/local object key (e.g. "products/abc/9f3.../original.jpg"). NULL for source='external'. */
    storageKey: (0, pg_core_1.text)('storage_key'),
    /** For external images: the raw URL. For uploads: NULL (URL is computed from storageKey + variant). */
    externalUrl: (0, pg_core_1.text)('external_url'),
    /** Original file metadata. */
    width: (0, pg_core_1.integer)('width'),
    height: (0, pg_core_1.integer)('height'),
    format: (0, pg_core_1.varchar)('format', { length: 16 }),
    byteSize: (0, pg_core_1.integer)('byte_size'),
    /** Tiny base64 placeholder for next/image blur, e.g. "data:image/webp;base64,...". */
    blurDataUrl: (0, pg_core_1.text)('blur_data_url'),
    alt: (0, pg_core_1.varchar)('alt', { length: 255 }),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    isPrimary: (0, pg_core_1.boolean)('is_primary').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.productImagesRelations = (0, drizzle_orm_1.relations)(exports.productImages, ({ one }) => ({
    product: one(exports.products, { fields: [exports.productImages.productId], references: [exports.products.id] }),
}));
// ── Product variants (FEATURE_VARIANTS) ──────────────────────────────────────
// One row per purchasable SKU within a product. A product is sold as a single
// SKU when it has zero variants (legacy products.inventory / products.price
// still apply). When variants exist, they override stock and (optionally) price
// at the variant level.
exports.productVariants = (0, pg_core_1.pgTable)('product_variants', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    productId: (0, pg_core_1.varchar)('product_id', { length: 128 }).notNull(),
    /** Optional human-readable axes. NULL is allowed so a "color-only" or
     *  "size-only" product is supported without inventing a placeholder. */
    size: (0, pg_core_1.varchar)('size', { length: 64 }),
    color: (0, pg_core_1.varchar)('color', { length: 64 }),
    /** Hex like "#1a1a2e" — used by storefront swatches. */
    colorHex: (0, pg_core_1.varchar)('color_hex', { length: 16 }),
    /** Open-ended extra axes for future use (material, width, fit, …). */
    attributes: (0, pg_core_1.jsonb)('attributes').$type().notNull().default({}),
    sku: (0, pg_core_1.varchar)('sku', { length: 100 }),
    /** NULL = use the parent product's price. */
    priceOverride: (0, pg_core_1.numeric)('price_override', { precision: 12, scale: 2 }),
    inventory: (0, pg_core_1.integer)('inventory').notNull().default(0),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.productVariantsRelations = (0, drizzle_orm_1.relations)(exports.productVariants, ({ one }) => ({
    product: one(exports.products, { fields: [exports.productVariants.productId], references: [exports.products.id] }),
}));
// ── Delivery v1 ───────────────────────────────────────────────────────────────
exports.courierTypeEnum = (0, pg_core_1.pgEnum)('courier_type', ['FLEET', 'FREELANCE']);
exports.assignmentStatusEnum = (0, pg_core_1.pgEnum)('assignment_status', ['ASSIGNED', 'PICKED_UP', 'DELIVERED', 'FAILED', 'CANCELLED']);
exports.deliveryEventTypeEnum = (0, pg_core_1.pgEnum)('delivery_event_type', [
    'CREATED', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP',
    'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED',
    'FAILED', 'CANCELLED', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'NOTE',
]);
exports.paymentVerificationStatusEnum = (0, pg_core_1.pgEnum)('payment_verification_status', ['PENDING', 'VERIFIED', 'REJECTED']);
exports.payoutMethodEnum = (0, pg_core_1.pgEnum)('payout_method', ['MOMO', 'CASH', 'BANK']);
exports.paymentProviderEnum = (0, pg_core_1.pgEnum)('payment_provider', ['MTN_MOMO', 'VODAFONE_CASH', 'AIRTELTIGO', 'BANK', 'OTHER']);
exports.couriers = (0, pg_core_1.pgTable)('couriers', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 30 }).notNull(),
    employmentType: (0, exports.courierTypeEnum)('employment_type').notNull().default('FREELANCE'),
    /** Percent of delivery fee paid out to FREELANCE couriers (0–100). Ignored for FLEET. */
    commissionPct: (0, pg_core_1.numeric)('commission_pct', { precision: 5, scale: 2 }).notNull().default('15'),
    /** Optional flat amount per delivery — when set, used instead of commission. */
    flatPerDelivery: (0, pg_core_1.numeric)('flat_per_delivery', { precision: 10, scale: 2 }),
    vehicle: (0, pg_core_1.varchar)('vehicle', { length: 120 }),
    momoNumber: (0, pg_core_1.varchar)('momo_number', { length: 30 }),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.deliveryAssignments = (0, pg_core_1.pgTable)('delivery_assignments', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    orderId: (0, pg_core_1.varchar)('order_id', { length: 128 }).notNull(),
    courierId: (0, pg_core_1.varchar)('courier_id', { length: 128 }).notNull(),
    status: (0, exports.assignmentStatusEnum)('status').notNull().default('ASSIGNED'),
    /** Snapshot of the delivery fee at assignment time. */
    deliveryFee: (0, pg_core_1.numeric)('delivery_fee', { precision: 12, scale: 2 }).notNull(),
    /** Snapshot of what we owe the courier for this delivery (0 for FLEET). */
    commissionAmount: (0, pg_core_1.numeric)('commission_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    assignedBy: (0, pg_core_1.varchar)('assigned_by', { length: 128 }),
    assignedAt: (0, pg_core_1.timestamp)('assigned_at').notNull().defaultNow(),
    pickedUpAt: (0, pg_core_1.timestamp)('picked_up_at'),
    deliveredAt: (0, pg_core_1.timestamp)('delivered_at'),
    failedAt: (0, pg_core_1.timestamp)('failed_at'),
    failureReason: (0, pg_core_1.text)('failure_reason'),
    /** Set when this assignment's commission has been included in a payout. */
    payoutId: (0, pg_core_1.varchar)('payout_id', { length: 128 }),
});
exports.deliveryEvents = (0, pg_core_1.pgTable)('delivery_events', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    orderId: (0, pg_core_1.varchar)('order_id', { length: 128 }).notNull(),
    type: (0, exports.deliveryEventTypeEnum)('type').notNull(),
    actorId: (0, pg_core_1.varchar)('actor_id', { length: 128 }),
    actorName: (0, pg_core_1.varchar)('actor_name', { length: 255 }),
    courierId: (0, pg_core_1.varchar)('courier_id', { length: 128 }),
    note: (0, pg_core_1.text)('note'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.payouts = (0, pg_core_1.pgTable)('payouts', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    courierId: (0, pg_core_1.varchar)('courier_id', { length: 128 }).notNull(),
    amount: (0, pg_core_1.numeric)('amount', { precision: 12, scale: 2 }).notNull(),
    method: (0, exports.payoutMethodEnum)('method').notNull().default('MOMO'),
    reference: (0, pg_core_1.varchar)('reference', { length: 120 }),
    periodFrom: (0, pg_core_1.timestamp)('period_from').notNull(),
    periodTo: (0, pg_core_1.timestamp)('period_to').notNull(),
    deliveryCount: (0, pg_core_1.integer)('delivery_count').notNull().default(0),
    paidBy: (0, pg_core_1.varchar)('paid_by', { length: 128 }),
    paidAt: (0, pg_core_1.timestamp)('paid_at').notNull().defaultNow(),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.paymentVerifications = (0, pg_core_1.pgTable)('payment_verifications', {
    id: (0, pg_core_1.varchar)('id', { length: 128 }).$defaultFn(() => (0, cuid2_1.createId)()).primaryKey(),
    orderId: (0, pg_core_1.varchar)('order_id', { length: 128 }).notNull(),
    amount: (0, pg_core_1.numeric)('amount', { precision: 12, scale: 2 }).notNull(),
    provider: (0, exports.paymentProviderEnum)('provider').notNull(),
    providerRef: (0, pg_core_1.varchar)('provider_ref', { length: 120 }),
    fromPhone: (0, pg_core_1.varchar)('from_phone', { length: 30 }),
    screenshotUrl: (0, pg_core_1.text)('screenshot_url'),
    status: (0, exports.paymentVerificationStatusEnum)('status').notNull().default('PENDING'),
    verifiedBy: (0, pg_core_1.varchar)('verified_by', { length: 128 }),
    verifiedAt: (0, pg_core_1.timestamp)('verified_at'),
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// Relations
exports.couriersRelations = (0, drizzle_orm_1.relations)(exports.couriers, ({ many }) => ({
    assignments: many(exports.deliveryAssignments),
    payouts: many(exports.payouts),
}));
exports.deliveryAssignmentsRelations = (0, drizzle_orm_1.relations)(exports.deliveryAssignments, ({ one }) => ({
    order: one(exports.orders, { fields: [exports.deliveryAssignments.orderId], references: [exports.orders.id] }),
    courier: one(exports.couriers, { fields: [exports.deliveryAssignments.courierId], references: [exports.couriers.id] }),
    payout: one(exports.payouts, { fields: [exports.deliveryAssignments.payoutId], references: [exports.payouts.id] }),
}));
exports.deliveryEventsRelations = (0, drizzle_orm_1.relations)(exports.deliveryEvents, ({ one }) => ({
    order: one(exports.orders, { fields: [exports.deliveryEvents.orderId], references: [exports.orders.id] }),
    courier: one(exports.couriers, { fields: [exports.deliveryEvents.courierId], references: [exports.couriers.id] }),
}));
exports.payoutsRelations = (0, drizzle_orm_1.relations)(exports.payouts, ({ one, many }) => ({
    courier: one(exports.couriers, { fields: [exports.payouts.courierId], references: [exports.couriers.id] }),
    assignments: many(exports.deliveryAssignments),
}));
exports.paymentVerificationsRelations = (0, drizzle_orm_1.relations)(exports.paymentVerifications, ({ one }) => ({
    order: one(exports.orders, { fields: [exports.paymentVerifications.orderId], references: [exports.orders.id] }),
}));
//# sourceMappingURL=schema.js.map