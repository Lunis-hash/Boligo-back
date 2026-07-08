import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

function secondsToExpireFromString(input: string): number {
  const timeUnits: Record<string, number> = {
    '1m': 60,
    '5m': 300,
    '1h': 3600,
    '1d': 86400,
    '7d': 604800,
    '1w': 604800 * 7,
    '1M': 604800 * 30,
  };

  const value = input.toLowerCase().trim();

  if (value in timeUnits) {
    return timeUnits[value];
  }

  // Si la valeur n’est pas reconnue, retourner une valeur par défaut
  return 604800;
}

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const expiresIn = secondsToExpireFromString(
          configService.get<string>('JWT_EXPIRES_IN') || '7d'
        );

        return {
          secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
          signOptions: {
            expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}