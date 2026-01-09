import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // elimina props extra no declaradas en DTO
      forbidNonWhitelisted: true, // si mandan props extra -> 400
      transform: true,            // transforma JSON a instancia del DTO
    }),
  );  

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
