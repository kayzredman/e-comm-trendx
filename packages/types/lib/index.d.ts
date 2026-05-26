export type UserRole = 'OWNER' | 'STAFF';
export interface User {
    id: string;
    clerkId: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt: Date;
}
export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
export interface Category {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    imageUrl: string | null;
    createdAt: Date;
}
export interface Product {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    comparePrice: number | null;
    sku: string | null;
    inventory: number;
    categoryId: string | null;
    images: string[];
    status: ProductStatus;
    createdAt: Date;
    updatedAt: Date;
}
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'CASH_ON_DELIVERY' | 'MOBILE_MONEY' | 'CARD';
export interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    address: CustomerAddress;
    createdAt: Date;
}
export interface CustomerAddress {
    street: string;
    city: string;
    region: string;
    country: string;
    zip: string | null;
}
export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
}
export interface Order {
    id: string;
    customerId: string;
    status: OrderStatus;
    subtotal: number;
    deliveryFee: number;
    total: number;
    notes: string | null;
    paymentMethod: PaymentMethod;
    items: OrderItem[];
    createdAt: Date;
    updatedAt: Date;
}
export type SectionType = 'HERO' | 'FEATURED' | 'BANNER' | 'ANNOUNCEMENT';
export type SectionPage = 'HOME';
export interface CmsSection {
    id: string;
    page: SectionPage;
    type: SectionType;
    data: Record<string, unknown>;
    order: number;
    isActive: boolean;
    updatedAt: Date;
}
export type FeeStrategy = 'FLAT' | 'DISTANCE_BASED' | 'FREE_THRESHOLD' | 'COMBINED';
export interface DeliveryZone {
    id: string;
    name: string;
    baseFee: number;
    feeStrategy: FeeStrategy;
    feePerKm: number | null;
    freeThreshold: number | null;
    isActive: boolean;
}
export interface ApiResponse<T> {
    data: T;
    message?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
//# sourceMappingURL=index.d.ts.map