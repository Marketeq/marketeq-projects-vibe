import 'dotenv/config';
import { DataSource } from 'typeorm';
import { PortfolioItem } from './portfolio/portfolio.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [PortfolioItem],
  migrations: ['apps/portfolio-service/migrations/*.ts'],
});
