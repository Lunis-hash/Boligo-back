import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { runDbTransfer } from './maintenance/db-transfer';
import { adminOrigins, corsDelegate } from './common/cors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  // Render place un relais devant l'application : sans cela, tous les visiteurs
  // partagent la même IP et le même quota de requêtes.
  app.set('trust proxy', 1);
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('[SÉCURITÉ] JWT_SECRET absent en production : les jetons ne sont pas protégés.');
  }
  app.setGlobalPrefix('api');
  // Render interroge la racine « / » au démarrage : réponse simple plutôt qu'une 404.
  app
    .getHttpAdapter()
    .get('/', (_req: Request, res: Response) =>
      res.json({ service: 'BOLIGO API', status: 'ok' }),
    );

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


  // CORS : application et site ouverts ; tableau de bord admin limité à ses adresses BOLIGO.
  const allowedAdmin = adminOrigins(process.env.ADMIN_ALLOWED_ORIGINS);
  app.enableCors(corsDelegate(allowedAdmin));

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

  // Transfert ponctuel vers la base dédiée de BOLIGO, en arrière-plan : le
  // service continue de répondre sur la base actuelle pendant la copie.
  const transferTarget = process.env.DB_TRANSFER_TARGET_URL;
  if (transferTarget) {
    void runDbTransfer(process.env.DATABASE_URL ?? '', transferTarget).catch((err) =>
      console.error('[DB-TRANSFER] erreur inattendue', err instanceof Error ? err.message : err),
    );
  }
}
bootstrap();

