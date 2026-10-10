import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsString,
  MaxLength,
} from 'class-validator';

/** Suppression d'un membre : l'administrateur retape l'adresse e-mail du compte. */
export class DeleteUserDto {
  @IsEmail()
  @MaxLength(200)
  confirmEmail: string;
}

/** Nombre maximal de comptes supprimés en une seule fois. */
export const BULK_DELETE_MAX = 50;

/**
 * Suppression en masse : l'administrateur retape « SUPPRIMER <nombre> »,
 * le nombre étant celui des comptes sélectionnés.
 */
export class BulkDeleteUsersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_DELETE_MAX)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  ids: string[];

  @IsString()
  @MaxLength(40)
  confirm: string;
}
