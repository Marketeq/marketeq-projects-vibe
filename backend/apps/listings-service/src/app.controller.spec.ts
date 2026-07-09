import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { ProjectService } from './listings/project.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const projectServiceMock = {
      create: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ProjectService,
          useValue: projectServiceMock,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return service health', () => {
      expect(appController.health()).toEqual({ ok: true });
    });
  });
});
