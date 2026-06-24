import { PartialType } from '@nestjs/mapped-types';
import { CreatePublicDto } from './create-public.dto';

export class UpdatePublicDto extends PartialType(CreatePublicDto) {}
