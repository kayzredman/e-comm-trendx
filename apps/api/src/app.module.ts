import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DbModule } from './db/db.module'
import { AuthModule } from './auth/auth.module'
import { ProductsModule } from './products/products.module'
import { CategoriesModule } from './categories/categories.module'
import { OrdersModule } from './orders/orders.module'
import { CustomersModule } from './customers/customers.module'
import { CmsModule } from './cms/cms.module'
import { DeliveryModule } from './delivery/delivery.module'
import { StorefrontModule } from './storefront/storefront.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { UsersModule } from './users/users.module'
import { HealthModule } from './health/health.module'
import { ReviewsModule } from './reviews/reviews.module'
import { DiscountsModule } from './discounts/discounts.module'
import { NotificationsModule } from './notifications/notifications.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    CustomersModule,
    CmsModule,
    DeliveryModule,
    StorefrontModule,
    AnalyticsModule,
    HealthModule,
    ReviewsModule,
    DiscountsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
