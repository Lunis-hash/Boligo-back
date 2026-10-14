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
import { configReport } from './common/config-report';
import {
  assertPreviewSafe,
  isPreview,
  previewGuard,
  previewStatic,
} from './common/preview';

async function bootstrap() {
  // Prévisualisation de recette : refus explicite si la base est Supabase ou
  // si une clé Stripe LIVE est présente (src/common/preview.ts).
  assertPreviewSafe();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  // Render place un relais devant l'application : sans cela, tous les visiteurs
  // partagent la même IP et le même quota de requêtes.
  app.set('trust proxy', 1);
  // Réglages vérifiables dans les journaux de l'hébergeur (aucun secret écrit).
  console.log(`[CONFIG] ${configReport()}`);
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error(
      '[SÉCURITÉ] JWT_SECRET absent en production : les jetons ne sont pas protégés.',
    );
  }
  app.setGlobalPrefix('api');
  if (!isPreview()) {
    // Render interroge la racine « / » au démarrage : réponse simple plutôt qu'une 404.
    app
      .getHttpAdapter()
      .get('/', (_req: Request, res: Response) =>
        res.json({ service: 'BOLIGO API', status: 'ok' }),
      );
  }

  // HTTP Response Compression
  app.use(compression());

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Secure HTTP headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Permet le bon affichage de l'UI Swagger en dev/recette
    }),
  );

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS : application et site ouverts ; tableau de bord admin limité à ses adresses BOLIGO.
  const allowedAdmin = adminOrigins(process.env.ADMIN_ALLOWED_ORIGINS);
  app.enableCors(corsDelegate(allowedAdmin));
  if (isPreview()) {
    // Un seul service : mot de passe HTTP partout (sauf santé et webhook),
    // puis webapp à la racine et admin sous /admin, l'API restant sous /api.
    app.use(previewGuard());
    app.use(
      previewStatic(
        process.env.PREVIEW_WEB_DIR || 'public-web',
        process.env.PREVIEW_ADMIN_DIR || 'public-admin',
      ),
    );
    console.log(
      '[PRÉVISUALISATION] Recette : /, /admin, /api (mot de passe HTTP actif).',
    );
  }

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
    void runDbTransfer(process.env.DATABASE_URL ?? '', transferTarget).catch(
      (err) =>
        console.error(
          '[DB-TRANSFER] erreur inattendue',
          err instanceof Error ? err.message : err,
        ),
    );
  }
}
bootstrap();
