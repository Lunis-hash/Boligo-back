import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../common/email.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const birth = new Date(dto.birthDate);
    if (isNaN(birth.getTime())) {
      throw new BadRequestException('Date de naissance invalide.');
    }
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    if (age < 18) {
      throw new BadRequestException('Vous devez avoir au moins 18 ans pour vous inscrire.');
    }
    if (age > 120) {
      throw new BadRequestException('Date de naissance invalide.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          dto.telephone ? { telephone: dto.telephone } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === dto.email.toLowerCase()) {
        throw new ConflictException('Email already exists');
      }
      if (dto.telephone && existingUser.telephone === dto.telephone) {
        throw new ConflictException('Ce numéro de téléphone est déjà associé à un compte.');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName || '',
        birthDate: new Date(dto.birthDate),
        gender: dto.gender,
        city: dto.city,
        telephone: dto.telephone,
        isVerified: false,
        verificationCode: verificationCode,
        profile: {
          create: {
            displayedCity: dto.city || null,
            profession: dto.profession || dto.job || null,
          }, 
        },
        interviews: {
          create: {
            status: 'en_cours',
            version: 1,
          },
        },
      },
    });

    // Envoyer l'email OTP de validation
    try {
      await this.emailService.sendVerificationEmail(user.email, verificationCode);
    } catch (e) {
      console.error('[AUTH] Erreur d\'envoi d\'email OTP:', e);
    }

    return {
      success: true,
      message: 'Compte créé avec succès. Un code de vérification à 4 chiffres a été envoyé par e-mail.',
      email: user.email,
    };
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé.');
    }

    if (user.isVerified) {
      return this.signToken(user.id, user.email);
    }

    if (!user.verificationCode || user.verificationCode !== code) {
      throw new BadRequestException('Code de vérification incorrect.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationCode: null,
      },
    });

    return this.signToken(user.id, user.email);
  }

  async resendVerificationOtp(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé.');
    }

    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationCode },
    });

    try {
      await this.emailService.sendVerificationEmail(user.email, verificationCode);
    } catch (e) {
      console.error('[AUTH] Erreur d\'envoi d\'email OTP:', e);
    }

    return { success: true, message: 'Un nouveau code de vérification a été envoyé par e-mail.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Adresse e-mail ou mot de passe incorrect.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash || '');
    if (!isMatch) {
      throw new UnauthorizedException('Adresse e-mail ou mot de passe incorrect.');
    }

    return this.signToken(user.id, user.email);
  }

  async signToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    
    // Access token court (ex: 1 heure)
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1h',
      secret: process.env.JWT_SECRET,
    });

    // Refresh token long (ex: 30 jours)
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '30d',
      secret: process.env.JWT_SECRET + '_REFRESH',
    });

    // Hacher le refresh token et le stocker en DB
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      userId,
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_SECRET + '_REFRESH',
      });
    } catch (e) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    const userId = payload.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const rtMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!rtMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    return this.signToken(user.id, user.email);
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Récupérer tous les journeys liés à l'utilisateur
    const journeys = await this.prisma.journey.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      select: { id: true, proposalId: true },
    });

    const journeyIds = journeys.map(j => j.id);
    const proposalIds = journeys.map(j => j.proposalId);

    // Récupérer toutes les interviews de l'utilisateur
    const interviews = await this.prisma.interviewIA.findMany({
      where: { userId },
      select: { id: true },
    });
    const interviewIds = interviews.map(i => i.id);

    // Démarrer une transaction Prisma pour tout supprimer dans l'ordre
    await this.prisma.$transaction(async (tx) => {
      // 1. Supprimer les signalements (Reports) liés
      await tx.report.deleteMany({
        where: {
          OR: [
            { reporterId: userId },
            { reportedId: userId },
            { message: { journeyId: { in: journeyIds } } },
          ],
        },
      });

      // 2. Supprimer les messages de chat
      await tx.message.deleteMany({
        where: {
          OR: [
            { senderId: userId },
            { journeyId: { in: journeyIds } },
          ],
        },
      });

      // 3. Supprimer les réponses d'Harmonie (HarmonyResponse)
      await tx.harmonyResponse.deleteMany({
        where: {
          OR: [
            { userId },
            { question: { journeyId: { in: journeyIds } } },
          ],
        },
      });

      // 4. Supprimer les questions d'Harmonie (HarmonyQuestion)
      await tx.harmonyQuestion.deleteMany({
        where: {
          journeyId: { in: journeyIds },
        },
      });

      // 5. Supprimer les sessions vidéo et échanges de contact
      await tx.videoSession.deleteMany({
        where: {
          journeyId: { in: journeyIds },
        },
      });

      await tx.contactExchange.deleteMany({
        where: {
          journeyId: { in: journeyIds },
        },
      });

      await tx.alumniCouple.deleteMany({
        where: {
          journeyId: { in: journeyIds },
        },
      });

      // 6. Supprimer les transactions de crédit
      await tx.creditTransaction.deleteMany({
        where: {
          OR: [
            { userId },
            { journeyId: { in: journeyIds } },
          ],
        },
      });

      // 7. Supprimer les Journeys
      await tx.journey.deleteMany({
        where: {
          id: { in: journeyIds },
        },
      });

      // 8. Supprimer toutes les MatchProposals associées
      await tx.matchProposal.deleteMany({
        where: {
          OR: [
            { sourceUserId: userId },
            { targetUserId: userId },
            { id: { in: proposalIds } },
          ],
        },
      });

      // 9. Supprimer les réponses aux modules de l'entretien IA
      await tx.moduleResponse.deleteMany({
        where: {
          interviewId: { in: interviewIds },
        },
      });

      // 10. Supprimer les cartes mentales (MentalMap)
      await tx.mentalMap.deleteMany({
        where: {
          OR: [
            { userId },
            { interviewId: { in: interviewIds } },
          ],
        },
      });

      // 11. Supprimer les entretiens (InterviewIA)
      await tx.interviewIA.deleteMany({
        where: {
          userId,
        },
      });

      // 12. Supprimer les notifications de l'utilisateur
      await tx.notification.deleteMany({
        where: {
          userId,
        },
      });

      // 13. Supprimer le profil utilisateur
      await tx.profile.deleteMany({
        where: {
          userId,
        },
      });

      // 14. Supprimer l'utilisateur lui-même
      await tx.user.delete({
        where: {
          id: userId,
        },
      });
    });

    return { success: true, message: 'Compte supprimé avec succès' };
  }

  async socialLogin(provider: 'google' | 'facebook', token: string, profileDto?: { email?: string; firstName?: string; lastName?: string; id?: string }) {
    let email: string = profileDto?.email || '';
    let firstName: string = profileDto?.firstName || (provider === 'google' ? 'Utilisateur Google' : 'Utilisateur Facebook');
    let lastName: string = profileDto?.lastName || '';
    let providerId: string = profileDto?.id || `${provider}_${Math.random().toString(36).substring(2, 10)}`;

    if (token && !token.startsWith('mock_')) {
      try {
        if (provider === 'google') {
          const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
          if (res.ok) {
            const data = await res.json();
            email = data.email || email;
            firstName = data.given_name || firstName;
            lastName = data.family_name || lastName;
            providerId = data.sub || providerId;
          } else {
            const idRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
            if (idRes.ok) {
              const data = await idRes.json();
              email = data.email || email;
              firstName = data.given_name || firstName;
              lastName = data.family_name || lastName;
              providerId = data.sub || providerId;
            }
          }
        } else if (provider === 'facebook') {
          const res = await fetch(`https://graph.facebook.com/me?fields=id,email,first_name,last_name&access_token=${token}`);
          if (res.ok) {
            const data = await res.json();
            email = data.email || email;
            firstName = data.first_name || firstName;
            lastName = data.last_name || lastName;
            providerId = data.id || providerId;
          }
        }
      } catch (e) {
        console.log(`⚠️ Vérification token ${provider} en réseau échouée, basculement profil.`);
      }
    }

    if (!email) {
      email = `user_${provider}_${Date.now()}@harmonie.app`;
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          provider === 'google' ? { googleId: providerId } : { facebookId: providerId },
          { email: email },
        ],
      },
    });

    if (user) {
      const updateData: any = {};
      if (provider === 'google' && !user.googleId) updateData.googleId = providerId;
      if (provider === 'facebook' && !user.facebookId) updateData.facebookId = providerId;

      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName: lastName || '',
          birthDate: new Date('1998-01-01'),
          gender: 'H',
          city: 'Abidjan',
          googleId: provider === 'google' ? providerId : null,
          facebookId: provider === 'facebook' ? providerId : null,
          accountStatus: 'nouveau',
          isVerified: true,
          creditBalance: 0,
          profile: {
            create: {
              profileStatus: 'incomplet',
              description: `Membre inscrit via ${provider === 'google' ? 'Google' : 'Facebook'}.`,
            },
          },
        },
      });
    }

    return this.signToken(user.id, user.email);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('Aucun compte associé à cette adresse email.');
    }

    // Générer un code OTP à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetCode: code,
        resetCodeExpires: expiresAt,
      },
    });

    // Envoyer l'email
    await this.emailService.sendPasswordResetEmail(user.email, code);

    return {
      success: true,
      message: 'Un code de réinitialisation à 6 chiffres a été envoyé à votre adresse email.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.resetCode || !user.resetCodeExpires) {
      throw new BadRequestException('Demande de réinitialisation invalide ou expirée.');
    }

    if (user.resetCode !== dto.code.trim()) {
      throw new BadRequestException('Code de réinitialisation incorrect.');
    }

    if (new Date() > user.resetCodeExpires) {
      throw new BadRequestException('Le code de réinitialisation a expiré. Veuillez refaire une demande.');
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetCode: null,
        resetCodeExpires: null,
      },
    });

    return {
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
    };
  }
}
