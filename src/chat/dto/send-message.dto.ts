import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum MessageType {
  TEXTE = 'texte',
  EMOJI = 'emoji',
  VOCAL = 'vocal',
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  journeyId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;
}
