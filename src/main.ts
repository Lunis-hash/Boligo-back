import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  // Render place un relais devant l'application : sans cela, tous les visiteurs
  // partagent la même IP et le même quota de requêtes.
  app.set('trust proxy', 1);
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('[SÉCURITÉ] JWT_SECRET absent en production : les jetons ne sont pas protégés.');
  }
  app.setGlobalPrefix('api');

  // HTTP Response Compression
  app.use(compression());

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Secure HTTP headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: false, // Permet le bon affichage de l'UI Swagger en dev/recette
  }));

  // Global Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));


  // CORS Config supporting Admin dashboard, Front-end website & Mobile App
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('BOLIGO API')
    .setDescription('API BOLIGO')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();

