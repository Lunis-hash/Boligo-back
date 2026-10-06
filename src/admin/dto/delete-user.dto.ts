import { IsEmail, MaxLength } from 'class-validator';

/** Suppression d'un membre : l'administrateur retape l'adresse e-mail du compte. */
export class DeleteUserDto {
  @IsEmail()
  @MaxLength(200)
  confirmEmail: string;
}
