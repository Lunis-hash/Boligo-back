import { IsString, IsNotEmpty } from 'class-validator';

export class JoinJourneyDto {
  @IsString()
  @IsNotEmpty()
  journeyId: string;
}
