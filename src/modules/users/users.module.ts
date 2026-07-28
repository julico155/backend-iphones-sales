import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminSaaSGuard } from '../auth/guards/admin-saas.guard';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AdminSaaSGuard],
})
export class UsersModule {}
