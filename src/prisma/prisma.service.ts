import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Traçabilité des questions du Sondeur (méthode, cible, modèles) : écrite,
    // jamais relue par défaut, donc jamais renvoyée à l'app par mégarde.
    super({ omit: { harmonyQuestion: { meta: true } } });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
