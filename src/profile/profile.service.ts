import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { loadSelfPortrait } from '../portrait/self-portrait';

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
    const profile = await this.prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Séparer les champs User des champs Profile
    const userFields = ['firstName', 'lastName', 'telephone', 'city'];
    const userData: any = {};
    const profileData: any = {};

    for (const [key, value] of Object.entries(dto)) {
      if (userFields.includes(key)) {
        userData[key] = value;
      } else {
        profileData[key] = value;
      }
    }

    if (dto.city && !profileData.displayedCity) {
      profileData.displayedCity = dto.city;
    }
    if (profileData.displayedCity && !userData.city) {
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

    // Retourner le profil mis à jour
    return this.getProfile(userId);
  }
}
