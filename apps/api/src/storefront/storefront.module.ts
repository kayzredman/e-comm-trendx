import { Module } from '@nestjs/common'
import { StorefrontService } from './storefront.service'
import { StorefrontController } from './storefront.controller'
import { ProductsModule } from '../products/products.module'
import { CustomersModule } from '../customers/customers.module'
import { OrdersModule } from '../orders/orders.module'
import { DeliveryModule } from '../delivery/delivery.module'
import { CmsModule } from '../cms/cms.module'

@Module({
  imports: [ProductsModule, CustomersModule, OrdersModule, DeliveryModule, CmsModule],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}
