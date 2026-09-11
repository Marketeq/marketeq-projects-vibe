import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { PortfolioItem } from './entities/portfolio-item.entity';
import { CaseStudy } from './entities/case-study.entity';
import { CaseStudyBlock } from './entities/case-study-block.entity';
import { CaseStudyLike } from './entities/case-study-like.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  entities: [PortfolioItem, CaseStudy, CaseStudyBlock, CaseStudyLike],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
