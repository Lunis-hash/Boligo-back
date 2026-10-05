import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { loadSelfPortrait } from '../portrait/self-portrait';
import {
  keepCountry,
  meetingScopeAnswer,
  meetingScopeOf,
  MeetingScope,
} from '../interview/meeting-scope';
import { collectRawAnswers } from '../matching/divergence.engine';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        mentalMaps: {
          orderBy: { generatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('Profile not found');
    }

    const mentalMap = user.mentalMaps[0] || null;
    const displayedCity = user.profile.displayedCity || user.city || null;
    // Fiche rédigée à partir du Grand Entretien (bio, 3 mots, clarté par module).
    const portrait = await loadSelfPortrait(this.prisma, userId);

    return {
      ...user.profile,
      displayedCity,
      meetingScope: await this.meetingScope(userId),
      user: {
        id: user.id,
        email: user.email,
        telephone: user.telephone,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        birthDate: user.birthDate,
        city: user.city || displayedCity,
        accountStatus: user.accountStatus,
        creditBalance: user.creditBalance,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      mentalMap,
      portrait: portrait
        ? {
            headline: portrait.headline,
            bio: portrait.bio,
            analysis: portrait.analysis,
            threeWords: portrait.threeWords,
            values: portrait.values,
            redFlags: portrait.redFlags,
            clarity: portrait.clarity,
            modules: portrait.modules.map((m) => ({
              id: m.id,
              label: m.label,
              emoji: m.emoji,
              clarity: m.clarity,
              description: m.description,
            })),
          }
        : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('Profile not found');
    }

    const { meetingScope, ...fields } = dto;

    // Séparer les champs User des champs Profile
    const userFields = ['firstName', 'lastName', 'telephone', 'city'];
    const userData: any = {};
    const profileData: any = {};

    for (const [key, value] of Object.entries(fields)) {
      if (userFields.includes(key)) {
        userData[key] = value;
      } else {
        profileData[key] = value;
      }
    }

    // Une ville saisie sans pays garde le pays enregistré (filtre national).
    if (typeof userData.city === 'string') {
      userData.city = keepCountry(userData.city, user.city);
    }
    if (typeof profileData.displayedCity === 'string') {
      profileData.displayedCity = keepCountry(
        profileData.displayedCity,
        user.profile.displayedCity || user.city,
      );
    }

    // La ville de résidence sert aux filtres : la ville affichée ne la remplace
    // que pour un membre qui n'en a pas encore.
    if (userData.city && !profileData.displayedCity) {
      profileData.displayedCity = userData.city;
    }
    if (profileData.displayedCity && !userData.city && !user.city) {
      userData.city = profileData.displayedCity;
    }

    // Mettre à jour User si nécessaire
    if (Object.keys(userData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: userData,
      });
    }

    // Mettre à jour Profile si nécessaire
    if (Object.keys(profileData).length > 0) {
      await this.prisma.profile.update({
        where: { userId: userId },
        data: profileData,
      });
    }

    if (meetingScope) await this.setMeetingScope(userId, meetingScope);

    // Retourner le profil mis à jour
    return this.getProfile(userId);
  }

  /** Dernier entretien du membre (en cours ou terminé). */
  private latestInterview(userId: string) {
    return this.prisma.interviewIA.findFirst({
      where: { userId, status: { in: ['en_cours', 'termine'] } },
      orderBy: { startDate: 'desc' },
      include: { responses: true },
    });
  }

  /** Périmètre de rencontre enregistré (réponse M0_Q02), null s'il n'y en a pas. */
  private async meetingScope(userId: string): Promise<MeetingScope | null> {
    const interview = await this.latestInterview(userId);
    return meetingScopeOf(collectRawAnswers(interview?.responses).M0_Q02);
  }

  /**
   * Modifie le périmètre de rencontre : seule la réponse M0_Q02 change, le
   * statut de l'entretien et les autres réponses restent tels quels.
   */
  private async setMeetingScope(userId: string, scope: MeetingScope) {
    const answer = meetingScopeAnswer(scope);
    const interview = await this.latestInterview(userId);
    const module0 = interview?.responses.find((r) => r.moduleNumber === 0);
    if (module0) {
      await this.prisma.moduleResponse.update({
        where: { id: module0.id },
        data: {
          rawResponses: {
            ...((module0.rawResponses as Record<string, string>) || {}),
            M0_Q02: answer,
          },
        },
      });
      return;
    }
    const response = {
      moduleNumber: 0,
      moduleName: 'Filtres non-négociables',
      rawResponses: { M0_Q02: answer },
    };
    if (interview) {
      await this.prisma.moduleResponse.create({
        data: { interviewId: interview.id, ...response },
      });
    } else {
      await this.prisma.interviewIA.create({
        data: {
          userId,
          status: 'en_cours',
          version: 1,
          responses: { create: response },
        },
      });
    }
  }
}
