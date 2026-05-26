export declare const userRoleEnum: import("drizzle-orm/pg-core").PgEnum<["OWNER", "MANAGER", "CONTENT_EDITOR", "ORDER_MANAGER", "VIEWER", "STAFF"]>;
export declare const productStatusEnum: import("drizzle-orm/pg-core").PgEnum<["ACTIVE", "DRAFT", "ARCHIVED"]>;
export declare const orderStatusEnum: import("drizzle-orm/pg-core").PgEnum<["PENDING", "CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]>;
export declare const paymentMethodEnum: import("drizzle-orm/pg-core").PgEnum<["CASH_ON_DELIVERY", "MOBILE_MONEY", "CARD"]>;
export declare const feeStrategyEnum: import("drizzle-orm/pg-core").PgEnum<["FLAT", "DISTANCE_BASED", "FREE_THRESHOLD", "COMBINED"]>;
export declare const sectionTypeEnum: import("drizzle-orm/pg-core").PgEnum<["HERO", "FEATURED", "BANNER", "ANNOUNCEMENT"]>;
export declare const sectionPageEnum: import("drizzle-orm/pg-core").PgEnum<["HOME"]>;
export declare const users: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "users";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "users";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        clerkId: import("drizzle-orm/pg-core").PgColumn<{
            name: "clerk_id";
            tableName: "users";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        email: import("drizzle-orm/pg-core").PgColumn<{
            name: "email";
            tableName: "users";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "users";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        role: import("drizzle-orm/pg-core").PgColumn<{
            name: "role";
            tableName: "users";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "OWNER" | "MANAGER" | "CONTENT_EDITOR" | "ORDER_MANAGER" | "VIEWER" | "STAFF";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["OWNER", "MANAGER", "CONTENT_EDITOR", "ORDER_MANAGER", "VIEWER", "STAFF"];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "users";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "users";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const categories: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "categories";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "categories";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "categories";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        slug: import("drizzle-orm/pg-core").PgColumn<{
            name: "slug";
            tableName: "categories";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        parentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "parent_id";
            tableName: "categories";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        imageUrl: import("drizzle-orm/pg-core").PgColumn<{
            name: "image_url";
            tableName: "categories";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "categories";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const products: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "products";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "products";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "products";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        slug: import("drizzle-orm/pg-core").PgColumn<{
            name: "slug";
            tableName: "products";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "products";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        price: import("drizzle-orm/pg-core").PgColumn<{
            name: "price";
            tableName: "products";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        comparePrice: import("drizzle-orm/pg-core").PgColumn<{
            name: "compare_price";
            tableName: "products";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sku: import("drizzle-orm/pg-core").PgColumn<{
            name: "sku";
            tableName: "products";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        inventory: import("drizzle-orm/pg-core").PgColumn<{
            name: "inventory";
            tableName: "products";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        categoryId: import("drizzle-orm/pg-core").PgColumn<{
            name: "category_id";
            tableName: "products";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        images: import("drizzle-orm/pg-core").PgColumn<{
            name: "images";
            tableName: "products";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "products";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "ACTIVE" | "DRAFT" | "ARCHIVED";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["ACTIVE", "DRAFT", "ARCHIVED"];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "products";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "products";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const customers: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "customers";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "customers";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "customers";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        email: import("drizzle-orm/pg-core").PgColumn<{
            name: "email";
            tableName: "customers";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        phone: import("drizzle-orm/pg-core").PgColumn<{
            name: "phone";
            tableName: "customers";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        address: import("drizzle-orm/pg-core").PgColumn<{
            name: "address";
            tableName: "customers";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                street: string;
                city: string;
                region: string;
                country: string;
                zip: string | null;
            };
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "customers";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const orders: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "orders";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "orders";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        customerId: import("drizzle-orm/pg-core").PgColumn<{
            name: "customer_id";
            tableName: "orders";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "orders";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "PENDING" | "CONFIRMED" | "PROCESSING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["PENDING", "CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
            baseColumn: never;
        }, {}, {}>;
        subtotal: import("drizzle-orm/pg-core").PgColumn<{
            name: "subtotal";
            tableName: "orders";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        deliveryFee: import("drizzle-orm/pg-core").PgColumn<{
            name: "delivery_fee";
            tableName: "orders";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        total: import("drizzle-orm/pg-core").PgColumn<{
            name: "total";
            tableName: "orders";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        notes: import("drizzle-orm/pg-core").PgColumn<{
            name: "notes";
            tableName: "orders";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        paymentMethod: import("drizzle-orm/pg-core").PgColumn<{
            name: "payment_method";
            tableName: "orders";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "CASH_ON_DELIVERY" | "MOBILE_MONEY" | "CARD";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["CASH_ON_DELIVERY", "MOBILE_MONEY", "CARD"];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "orders";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "orders";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const orderItems: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "order_items";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "order_items";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        orderId: import("drizzle-orm/pg-core").PgColumn<{
            name: "order_id";
            tableName: "order_items";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        productId: import("drizzle-orm/pg-core").PgColumn<{
            name: "product_id";
            tableName: "order_items";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        productName: import("drizzle-orm/pg-core").PgColumn<{
            name: "product_name";
            tableName: "order_items";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        unitPrice: import("drizzle-orm/pg-core").PgColumn<{
            name: "unit_price";
            tableName: "order_items";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        quantity: import("drizzle-orm/pg-core").PgColumn<{
            name: "quantity";
            tableName: "order_items";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const cmsSections: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "cms_sections";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "cms_sections";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        page: import("drizzle-orm/pg-core").PgColumn<{
            name: "page";
            tableName: "cms_sections";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "HOME";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["HOME"];
            baseColumn: never;
        }, {}, {}>;
        type: import("drizzle-orm/pg-core").PgColumn<{
            name: "type";
            tableName: "cms_sections";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "HERO" | "FEATURED" | "BANNER" | "ANNOUNCEMENT";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["HERO", "FEATURED", "BANNER", "ANNOUNCEMENT"];
            baseColumn: never;
        }, {}, {}>;
        data: import("drizzle-orm/pg-core").PgColumn<{
            name: "data";
            tableName: "cms_sections";
            dataType: "json";
            columnType: "PgJsonb";
            data: Record<string, unknown>;
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        order: import("drizzle-orm/pg-core").PgColumn<{
            name: "order";
            tableName: "cms_sections";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isActive: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_active";
            tableName: "cms_sections";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "cms_sections";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const deliveryZones: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "delivery_zones";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "delivery_zones";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "delivery_zones";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        baseFee: import("drizzle-orm/pg-core").PgColumn<{
            name: "base_fee";
            tableName: "delivery_zones";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        feeStrategy: import("drizzle-orm/pg-core").PgColumn<{
            name: "fee_strategy";
            tableName: "delivery_zones";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "FLAT" | "DISTANCE_BASED" | "FREE_THRESHOLD" | "COMBINED";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["FLAT", "DISTANCE_BASED", "FREE_THRESHOLD", "COMBINED"];
            baseColumn: never;
        }, {}, {}>;
        feePerKm: import("drizzle-orm/pg-core").PgColumn<{
            name: "fee_per_km";
            tableName: "delivery_zones";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        freeThreshold: import("drizzle-orm/pg-core").PgColumn<{
            name: "free_threshold";
            tableName: "delivery_zones";
            dataType: "string";
            columnType: "PgNumeric";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isActive: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_active";
            tableName: "delivery_zones";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const deliverySettings: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "delivery_settings";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "delivery_settings";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        defaultStrategy: import("drizzle-orm/pg-core").PgColumn<{
            name: "default_strategy";
            tableName: "delivery_settings";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "FLAT" | "DISTANCE_BASED" | "FREE_THRESHOLD" | "COMBINED";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["FLAT", "DISTANCE_BASED", "FREE_THRESHOLD", "COMBINED"];
            baseColumn: never;
        }, {}, {}>;
        estimatedDaysMin: import("drizzle-orm/pg-core").PgColumn<{
            name: "estimated_days_min";
            tableName: "delivery_settings";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        estimatedDaysMax: import("drizzle-orm/pg-core").PgColumn<{
            name: "estimated_days_max";
            tableName: "delivery_settings";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const categoriesRelations: import("drizzle-orm").Relations<"categories", {
    parent: import("drizzle-orm").One<"categories", false>;
    children: import("drizzle-orm").Many<"categories">;
    products: import("drizzle-orm").Many<"products">;
}>;
export declare const productsRelations: import("drizzle-orm").Relations<"products", {
    category: import("drizzle-orm").One<"categories", false>;
    orderItems: import("drizzle-orm").Many<"order_items">;
}>;
export declare const ordersRelations: import("drizzle-orm").Relations<"orders", {
    customer: import("drizzle-orm").One<"customers", true>;
    items: import("drizzle-orm").Many<"order_items">;
}>;
export declare const orderItemsRelations: import("drizzle-orm").Relations<"order_items", {
    order: import("drizzle-orm").One<"orders", true>;
    product: import("drizzle-orm").One<"products", true>;
}>;
export declare const customersRelations: import("drizzle-orm").Relations<"customers", {
    orders: import("drizzle-orm").Many<"orders">;
}>;
//# sourceMappingURL=schema.d.ts.map