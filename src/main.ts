import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import type { Request } from 'express';
import { config } from 'dotenv';
import { AppModule } from './app.module';

config();

type RequestWithRawBody = Request & { rawBody?: Buffer };

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.use(
    json({
      verify: (req: RequestWithRawBody, _res, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`WhatsApp service listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
