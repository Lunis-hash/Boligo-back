import { IsString, MaxLength } from 'class-validator';

/** Jeton du lien privé, lu après « # » dans l'adresse de l'Espace partenaire. */
export class PartnerPortalDto {
  @IsString()
  @MaxLength(100)
  token: string;
}
