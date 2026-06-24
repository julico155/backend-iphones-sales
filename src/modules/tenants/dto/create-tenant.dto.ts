import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  // Este regex valida que sea solo minúsculas, números y guiones (ej: chato-store-1)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener letras minúsculas, números y guiones medios (ej: chato-gold)',
  })
  slug!: string;
}