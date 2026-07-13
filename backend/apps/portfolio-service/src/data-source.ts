import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { PortfolioItem } from './entities/portfolio-item.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  entities: [PortfolioItem],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
