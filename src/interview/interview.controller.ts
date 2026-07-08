import { Controller, Get, Post, Body, UseGuards, Req, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { InterviewService } from './interview.service';
import { QuestionsService } from './questions.service';
import { SaveModuleDto } from './dto/save-module.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Interview')
@Controller('interview')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class InterviewController {
  constructor(
    private interviewService: InterviewService,
    private questionsService: QuestionsService,
  ) {}

  @Get('questions/:moduleNumber')
  @ApiOperation({ summary: 'Get filtered questions for a specific module' })
  async getQuestions(@Req() req: any, @Param('moduleNumber') moduleNumber: string) {
    return this.questionsService.getQuestionsForUser(req.user.id, parseInt(moduleNumber, 10));
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current interview status and progress' })
  async getStatus(@Req() req: any) {
    return this.interviewService.getStatus(req.user.id);
  }

  @Post('start')
  @ApiOperation({ summary: 'Start or resume an interview' })
  async start(@Req() req: any) {
    return this.interviewService.startInterview(req.user.id);
  }

  @Post('submit-module')
  @ApiOperation({ summary: 'Submit answers for a specific module (0-10)' })
  @ApiResponse({ status: 200, description: 'Module saved successfully.' })
  async submitModule(@Req() req: any, @Body() dto: SaveModuleDto) {
    return this.interviewService.saveModule(req.user.id, dto);
  }

  // Alias de compatibilite pour le frontend existant.
  @Post('save-module')
  async saveModule(@Req() req: any, @Body() dto: SaveModuleDto) {
    return this.interviewService.saveModule(req.user.id, dto);
  }
}
