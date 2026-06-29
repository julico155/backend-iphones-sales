import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remueve propiedades del body que no estén en el DTO
      forbidNonWhitelisted: true, // Lanza un error si envían propiedades no permitidas
      transform: true, // Transforma los tipos automáticamente (ej. string a number)
    }),
  );

  app.enableCors({
    origin: true, // Refleja automáticamente el origen de la petición
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'], // Asegúrate de incluir tu header personalizado
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Chato POS API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    jsonDocumentUrl: 'api-json',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
