import { Module } from '@nestjs/common';
import { GatewayHttpModule } from '../http/gateway-http.module';
import { UserController } from './user.controller';
import { UsersController } from './users.controller';
import { SkillsController } from './skills.controller';
import { PortfolioController } from './portfolio.controller';
import { EducationController } from './education.controller';
import { ExperiencesController } from './experiences.controller';
import { UserSettingsController } from './user-settings.controller';
import { ClientController } from './client.controller';
import { LanguagesController } from './languages.controller';

@Module({
  imports: [GatewayHttpModule],
  controllers: [
    UserController,
    UsersController,
    SkillsController,
    PortfolioController,
    EducationController,
    ExperiencesController,
    UserSettingsController,
    ClientController,
    LanguagesController,
  ],
})
export class UserModule {}
