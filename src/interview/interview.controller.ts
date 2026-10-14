import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { InterviewService } from './interview.service';
import { QuestionsService } from './questions.service';
import { SaveModuleDto } from './dto/save-module.dto';
import { SensitiveConsentDto } from './dto/sensitive-consent.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { InterviewLanguage, parseLanguage } from './questions.en';
import { presentOptions } from './questions.data';
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
  @ApiQuery({ name: 'lang', required: false, description: 'fr (défaut) ou en' })
  async getQuestions(
    @Req() req: any,
    @Param('moduleNumber') moduleNumber: string,
    @Query('lang') lang?: string,
  ) {
    return this.servedQuestions(
      req.user.id,
      parseInt(moduleNumber, 10),
      parseLanguage(lang),
    );
  }

  /**
   * Relecture d'un module (retour en arrière, reprise) : toutes ses questions
   * applicables, déjà répondues comprises, et les réponses enregistrées.
   */
  @Get('module/:moduleNumber')
  @ApiOperation({ summary: 'Questions et réponses enregistrées d’un module' })
  @ApiQuery({ name: 'lang', required: false, description: 'fr (défaut) ou en' })
  async getModule(
    @Req() req: { user: { id: string } },
    @Param('moduleNumber') moduleNumber: string,
    @Query('lang') lang?: string,
  ) {
    const n = parseInt(moduleNumber, 10);
    const [questions, saved] = await Promise.all([
      this.servedQuestions(req.user.id, n, parseLanguage(lang), true),
      this.interviewService.moduleAnswers(req.user.id, n),
    ]);
    return { questions, ...saved };
  }

  @Post('answer')
  @ApiOperation({
    summary:
      'Enregistre ou remplace une réponse (les réponses de suite devenues sans objet sont effacées)',
  })
  async saveAnswer(
    @Req() req: { user: { id: string } },
    @Body() dto: SaveAnswerDto,
  ) {
    return this.interviewService.saveAnswer(req.user.id, dto);
  }

  /**
   * V7.1 : options « aucun » signalées ; sans accord explicite, les options
   * sensibles d'une question ordinaire ne sont pas proposées.
   */
  private async servedQuestions(
    userId: string,
    moduleNumber: number,
    lang: InterviewLanguage,
    includeAnswered = false,
  ) {
    const [questions, { consent }] = await Promise.all([
      this.questionsService.getQuestionsForUser(
        userId,
        moduleNumber,
        lang,
        includeAnswered,
      ),
      this.interviewService.getSensitiveConsent(userId),
    ]);
    return questions.map((q) => presentOptions(q, consent === true));
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

  @Get('summary')
  @ApiOperation({ summary: 'Get generated mental map and dynamic pillars' })
  async getSummary(@Req() req: any) {
    return this.interviewService.getMentalMap(req.user.id);
  }

  @Get('mental-map')
  @ApiOperation({
    summary: 'Get generated mental map and dynamic pillars (alias)',
  })
  async getMentalMap(@Req() req: any) {
    return this.interviewService.getMentalMap(req.user.id);
  }

  // Alias de compatibilite pour le frontend existant.
  @Post('save-module')
  async saveModule(@Req() req: any, @Body() dto: SaveModuleDto) {
    return this.interviewService.saveModule(req.user.id, dto);
  }

  @Get('sensitive-consent')
  @ApiOperation({
    summary:
      'Accord pour les questions sensibles (religion, vie intime, violences subies)',
  })
  async getSensitiveConsent(@Req() req: any) {
    return this.interviewService.getSensitiveConsent(req.user.id);
  }

  @Post('sensitive-consent')
  @ApiOperation({
    summary:
      'Donner ou retirer cet accord ; un retrait efface les réponses sensibles',
  })
  async setSensitiveConsent(@Req() req: any, @Body() dto: SensitiveConsentDto) {
    return this.interviewService.setSensitiveConsent(req.user.id, dto.accepted);
  }
}
