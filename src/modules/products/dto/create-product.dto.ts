import { IsNotEmpty, IsString, IsOptional, MaxLength, IsNumber } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del producto es requerido (ej: iPhone 15 Pro Max).' })
  @MaxLength(100)
  model!: string;


  @IsString()
  @IsNotEmpty({ message: 'El nombre del producto es requerido (ej: iPhone 15 Pro Max).' })
  @MaxLength(100)
  storage!: string;


  @IsString()
  @IsNotEmpty({ message: 'El color es requerido (ej: Space Black).' })
  @MaxLength(50)
  color!: string;

    
  @IsNumber()
  @IsOptional()
  suggestedPrice?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}