import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ProductsModule } from './modules/products/products.module';
import { ItemsModule } from './modules/items/items.module';
import { PrismaModule } from 'prisma/prisma.module';
import { SalesModule } from './modules/sales/sales.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PublicModule } from './modules/public/public.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ProductsModule,
    ItemsModule,
    PrismaModule,
    SalesModule,
    TenantsModule,
    AuthModule,
    UsersModule,
    PublicModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
