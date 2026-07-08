import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile found.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  async getProfile(@Req() req: any) {
    return this.profileService.getProfile(req.user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated.' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.id, dto);
  }
}
