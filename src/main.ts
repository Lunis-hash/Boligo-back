import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api');

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
    .setDescription('Backend API for Project Harmonie (BOLIGO)')
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

