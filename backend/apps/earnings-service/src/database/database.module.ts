import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EarningsCache } from '../entities/earnings-cache.entity';
import { BalanceSnapshot } from '../entities/balance-snapshot.entity';
import { FxRateCache } from '../entities/fx-rate-cache.entity';
import { ContractLabelCache } from '../entities/contract-label-cache.entity';
import { DataSource, DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';

// Converts entity camelCase property names to snake_case column names
class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(className: string, customName: string): string {
    return customName ? customName : snakeCase(className);
  }
  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return snakeCase(embeddedPrefixes.concat(customName ? customName : propertyName).join('_'));
  }
  relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }
  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(relationName + '_' + referencedColumnName);
  }
  joinTableName(firstTableName: string, secondTableName: string): string {
    return snakeCase(firstTableName + '_' + secondTableName);
  }
  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return snakeCase(tableName + '_' + (columnName ? columnName : propertyName));
  }
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [EarningsCache, BalanceSnapshot, FxRateCache, ContractLabelCache],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        logging: config.get('NODE_ENV') !== 'production',
        namingStrategy: new SnakeNamingStrategy(),
        ssl:
          config.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [EarningsCache, BalanceSnapshot, FxRateCache, ContractLabelCache],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(),
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});
