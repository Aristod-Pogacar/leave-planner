import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEnum, IsOptional, IsString } from "class-validator";
import { Site, UserRole } from '../entities/user.entity';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @IsString()
    @IsOptional()
    nom: string;

    @IsString()
    @IsOptional()
    prenom: string;

    @IsString()
    @IsOptional()
    telephone: string;

    @IsString()
    @IsOptional()
    email: string;

    @IsString()
    @IsOptional()
    password: string;

    @IsString()
    @IsOptional()
    confirmPassword: string;

    @IsEnum(UserRole)
    @IsOptional()
    role: UserRole;

    @IsEnum(Site)
    @IsOptional()
    site: Site;
}
