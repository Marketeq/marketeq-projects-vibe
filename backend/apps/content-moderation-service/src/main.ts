import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  console.log('MOCK_MODE:', process.env.MOCK_MODE);
  const port = process.env.PORT || 3014; // Fallback to port 3014 if PORT is not defined
  // Only apply body parsers if not multipart/form-data
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log('[MIDDLEWARE] Incoming request:', req.method, req.url, req.headers['content-type']);
    if ((req.headers['content-type'] || '').includes('multipart/form-data')) {
      console.log('[MIDDLEWARE] Skipping body parser for multipart/form-data');
      next();
    } else {
      bodyParser.json({ limit: '10mb' })(req, res, (err) => {
        if (err) return next(err);
        bodyParser.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
      });
    }
  });
  await app.listen(port);
  console.log(
    ` Content Moderation Service is running on: http://localhost:${port}`,
  );
}
bootstrap();
