/**
 * admin-service — a stub, and recommended for removal.
 *
 * It had exactly one route, `GET /admin/dashboard`, which returned the
 * hardcoded string "Admin Dashboard v2". It carried no guard of any kind, so
 * any signed-in account could reach it through the gateway, and the service
 * has no entities, no business logic and no callers anywhere in this
 * repository or the frontend.
 *
 * That route is now removed, leaving only `/health` (which the module never
 * actually registered before). The reasoning, and the steps to delete the
 * service outright, are in
 * docs/md/CyberSecurity/Privileged Access & RBAC — Audit and Implementation.md §2.7.
 *
 * Nothing new should be added here. Under the agreed model, administration
 * happens in the service that owns the data — users in user-service, wires in
 * wire-review-service, payouts in payout-service — behind the platform role
 * guard, so that a privileged action is checked and audited where it takes
 * effect rather than in a separate service that has to be trusted to ask.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UadminUserviceController } from './admin-service.controller';
import { UadminUserviceService } from './admin-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/admin-service/.env', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT ?? 5432),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: (process.env.DATABASE_SSL_ENABLED ?? 'false').toLowerCase() === 'true'
        ? { rejectUnauthorized: false }
        : false,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: false,
    }),
  ],
  controllers: [UadminUserviceController],
  providers: [UadminUserviceService],
})
export class AdminServiceModuleModule {}
