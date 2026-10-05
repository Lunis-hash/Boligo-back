import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../common/email.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { meetingScopeAnswer } from '../interview/meeting-scope';

/**
 * Mode de test des codes à usage unique : code passe-partout « 1234 » et code
 * renvoyé dans la réponse d'inscription. Désactivé tant que OTP_DEBUG n'est
 * pas explicitement à « true » (jamais en production).
 */
const OTP_DEBUG = process.env.OTP_DEBUG === 'true';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Comparaison à temps constant de deux chaînes. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function normalizeEmail(email: string): string {
  return (email ?? '').trim().toLowerCase();
}

const MIN_AGE = 18;
const MAX_AGE = 99;
const EMAIL_TAKEN_MESSAGE = 'Un compte existe déjà avec cet e-mail.';
const PHONE_TAKEN_MESSAGE = 'Ce numéro de téléphone est déjà utilisé.';
const TERMS_REQUIRED_MESSAGE =
  "Vous devez accepter les conditions générales d'utilisation et la politique de confidentialité pour créer un compte.";

/**
 * « AAAA-MM-JJ » (ou date ISO complète des anciennes versions de l'application)
 * → Date ; null si la chaîne est invalide ou désigne un jour inexistant (31/02…).
 */
function parseBirthDate(value: string): Date | null {
  const raw = (value ?? '').trim();
  const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (dayOnly) {
    const [y, m, d] = [Number(dayOnly[1]), Number(dayOnly[2]), Number(dayOnly[3])];
    const date = new Date(Date.UTC(y, m - 1, d));
    const exists = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
    return exists ? date : null;
  }
  const date = new Date(raw);
  return isNaN(date.getTime()) ? null : date;
}

/** Traduit une violation d'unicité Prisma (deux inscriptions simultanées) en 409 explicite. */
function rethrowUniqueViolation(e: any): never {
  if (e?.code === 'P2002') {
    const target = String(e?.meta?.target ?? '');
    throw new ConflictException(target.includes('telephone') ? PHONE_TAKEN_MESSAGE : EMAIL_TAKEN_MESSAGE);
  }
  throw e;
}

/** Âge révolu, calculé en UTC pour ne pas dépendre du fuseau du serveur. */
function ageInYears(birth: Date, now: Date): number {
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age--;
  }
  return age;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    // Acceptation expresse des CGU : déjà exigée par le DTO (@Equals(true)),
    // revérifiée ici pour tout appel qui ne passerait pas par la validation.
    if (dto.acceptTerms !== true) {
      throw new BadRequestException(TERMS_REQUIRED_MESSAGE);
    }
    const termsVersion =
      typeof dto.termsVersion === 'string' && dto.termsVersion.trim()
        ? dto.termsVersion.trim().slice(0, 32)
        : null;

    const birth = parseBirthDate(dto.birthDate);
    if (!birth) {
      throw new BadRequestException('Date de naissance invalide.');
    }
    const now = new Date();
    if (birth.getTime() > now.getTime()) {
      throw new BadRequestException('La date de naissance ne peut pas être dans le futur.');
    }
    const age = ageInYears(birth, now);
    if (age < MIN_AGE) {
      throw new BadRequestException('Vous devez avoir au moins 18 ans pour vous inscrire.');
    }
    if (age > MAX_AGE) {
      throw new BadRequestException('Date de naissance invalide : l’âge maximum accepté est de 99 ans.');
    }

    const email = normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          dto.telephone ? { telephone: dto.telephone } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (existingUser) {
      // Messages distincts : l'application propose la connexion pour un e-mail
      // déjà inscrit, et la correction du numéro pour un téléphone déjà utilisé.
      if (dto.telephone && existingUser.telephone === dto.telephone && normalizeEmail(existingUser.email) !== email) {
        throw new ConflictException(PHONE_TAKEN_MESSAGE);
      }
      throw new ConflictException(EMAIL_TAKEN_MESSAGE);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const verificationCode = randomInt(1000, 10000).toString();

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName || '',
        birthDate: birth,
        gender: dto.gender,
        city: dto.city,
        telephone: dto.telephone,
        isVerified: false,
        verificationCode: verificationCode,
        termsAcceptedAt: now,
        termsVersion,
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
            ...(dto.meetingScope
              ? {
                  responses: {
                    create: {
                      moduleNumber: 0,
                      moduleName: 'Filtres non-négociables',
                      rawResponses: {
                        M0_Q02: meetingScopeAnswer(dto.meetingScope),
                      },
                    },
                  },
                }
              : {}),
          },
        },
      },
    }).catch(rethrowUniqueViolation);

    // Envoyer l'email OTP de validation de façon asynchrone (sans bloquer la réponse)
    this.emailService.sendVerificationEmail(user.email, verificationCode).catch((e) => {
      console.error('[AUTH] Erreur d\'envoi d\'email OTP:', e);
    });

    return {
      success: true,
      message: 'Compte créé avec succès. Un code de vérification à 4 chiffres a été envoyé par e-mail.',
      email: user.email,
      ...(OTP_DEBUG ? { otpDebugCode: verificationCode } : {}),
    };
  }

  /** Recherche par e-mail insensible à la casse (comptes anciens en casse mixte). */
  private findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email: { equals: normalizeEmail(email), mode: 'insensitive' } },
    });
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.findUserByEmail(email);
    const submitted = (code ?? '').trim();

    // Un compte déjà vérifié ne reçoit JAMAIS de session par cette route :
    // sinon connaître l'e-mail d'un membre suffirait à se connecter à sa place.
    if (!user || user.isVerified) {
      throw new BadRequestException(
        'Code invalide ou compte déjà vérifié. Connectez-vous avec votre mot de passe.',
      );
    }

    const isValidCode =
      (OTP_DEBUG && submitted === '1234') ||
      (!!user.verificationCode && safeEqual(user.verificationCode, submitted));

    if (!isValidCode) {
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
    const user = await this.findUserByEmail(email);

    // Réponse identique que le compte existe ou non (pas d'énumération).
    if (!user || user.isVerified) {
      return { success: true, message: 'Si un compte en attente existe, un nouveau code a été envoyé par e-mail.' };
    }

    const verificationCode = randomInt(1000, 10000).toString();

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
    const user = await this.findUserByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Adresse e-mail ou mot de passe incorrect.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash || '');
    if (!isMatch) {
      throw new UnauthorizedException('Adresse e-mail ou mot de passe incorrect.');
    }

    if (user.accountStatus === 'suspendu') {
      throw new ForbiddenException('Compte suspendu. Contactez le support BOLIGO.');
    }

    if (!user.isVerified) {
      const verificationCode = user.verificationCode || randomInt(1000, 10000).toString();
      if (!user.verificationCode) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { verificationCode },
        });
      }
      this.emailService.sendVerificationEmail(user.email, verificationCode).catch((e) => {
        console.error('[AUTH] Erreur renvoi OTP lors du login:', e);
      });

      return {
        isVerified: false,
        message: 'Votre compte doit être validé. Un code de vérification a été envoyé par e-mail.',
        email: user.email,
      };
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

    // Empreinte SHA-256 du refresh token (bcrypt ne lirait que les 72 premiers
    // octets, identiques pour tous les jetons d'un même membre).
    const hashedRefreshToken = sha256(refreshToken);
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
    if (user.accountStatus === 'suspendu') {
      throw new ForbiddenException('Compte suspendu. Contactez le support BOLIGO.');
    }

    // Les anciennes empreintes bcrypt ne sont plus acceptées : reconnexion requise.
    if (!safeEqual(sha256(refreshToken), user.hashedRefreshToken)) {
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

  async socialLogin(provider: 'google' | 'facebook', token: string, _profileDto?: unknown) {
    // Seule l'identité confirmée par Google / Facebook fait foi : le profil
    // envoyé par le client et les jetons « mock_ » sont ignorés.
    if (!token || token.startsWith('mock_') || (provider !== 'google' && provider !== 'facebook')) {
      throw new UnauthorizedException('Connexion sociale invalide.');
    }
    const identity = provider === 'google' ? await this.verifyGoogleToken(token) : await this.verifyFacebookToken(token);
    const email = normalizeEmail(identity.email);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          provider === 'google' ? { googleId: identity.providerId } : { facebookId: identity.providerId },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
    });

    // Pas de création de compte ici : l'inscription passe par le formulaire
    // (date de naissance, genre, acceptation des CGU).
    if (!user) {
      throw new UnauthorizedException(
        "Aucun compte BOLIGO n'est associé à cette adresse. Créez d'abord votre compte avec le formulaire d'inscription.",
      );
    }
    if (user.accountStatus === 'suspendu') {
      throw new ForbiddenException('Compte suspendu. Contactez le support BOLIGO.');
    }

    const link: { googleId?: string; facebookId?: string } = {};
    if (provider === 'google' && !user.googleId) link.googleId = identity.providerId;
    if (provider === 'facebook' && !user.facebookId) link.facebookId = identity.providerId;
    if (Object.keys(link).length > 0) {
      await this.prisma.user.update({ where: { id: user.id }, data: link });
    }

    return this.signToken(user.id, user.email);
  }

  /**
   * Jeton Google : il doit avoir été émis pour une application BOLIGO
   * (GOOGLE_CLIENT_IDS) — sinon un jeton obtenu par une autre application
   * permettrait de se connecter au compte de quelqu'un d'autre.
   */
  private async verifyGoogleToken(token: string) {
    const allowed = (process.env.GOOGLE_CLIENT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (allowed.length === 0) {
      throw new UnauthorizedException('La connexion avec Google n’est pas disponible.');
    }
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`, {
        signal: AbortSignal.timeout(8000),
      });
      const info: any = res.ok ? await res.json() : null;
      const audienceOk = info && (allowed.includes(info.aud) || allowed.includes(info.azp));
      const verified = info && (info.email_verified === true || info.email_verified === 'true');
      if (!audienceOk || !verified || !info.email || !info.sub) {
        throw new UnauthorizedException('Connexion sociale invalide.');
      }
      return { providerId: String(info.sub), email: String(info.email) };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Vérification de la connexion sociale impossible.');
    }
  }

  /** Jeton Facebook : vérifié avec la clé de l'application BOLIGO (debug_token). */
  private async verifyFacebookToken(token: string) {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) {
      throw new UnauthorizedException('La connexion avec Facebook n’est pas disponible.');
    }
    try {
      const debug = await fetch(
        `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`,
        { signal: AbortSignal.timeout(8000) },
      );
      const check: any = debug.ok ? await debug.json() : null;
      if (!check?.data?.is_valid || String(check.data.app_id) !== String(appId)) {
        throw new UnauthorizedException('Connexion sociale invalide.');
      }
      const me = await fetch(`https://graph.facebook.com/me?fields=id,email&access_token=${encodeURIComponent(token)}`, {
        signal: AbortSignal.timeout(8000),
      });
      const data: any = me.ok ? await me.json() : null;
      if (!data?.id || !data?.email || String(data.id) !== String(check.data.user_id)) {
        throw new UnauthorizedException('Connexion sociale invalide.');
      }
      return { providerId: String(data.id), email: String(data.email) };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Vérification de la connexion sociale impossible.');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findUserByEmail(dto.email);
    const genericResponse = {
      success: true,
      message: 'Si un compte est associé à cette adresse, un code de réinitialisation à 6 chiffres vient d’être envoyé.',
    };

    // Réponse identique que le compte existe ou non (pas d'énumération des membres).
    if (!user) {
      return genericResponse;
    }

    // Code à 6 chiffres issu d'un générateur cryptographique
    const code = randomInt(100000, 1000000).toString();
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

    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.findUserByEmail(dto.email);

    if (!user || !user.resetCode || !user.resetCodeExpires) {
      throw new BadRequestException('Demande de réinitialisation invalide ou expirée.');
    }

    if (!safeEqual(user.resetCode, dto.code.trim())) {
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
        // Toutes les sessions existantes sont révoquées.
        hashedRefreshToken: null,
      },
    });

    return {
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
    };
  }
}
