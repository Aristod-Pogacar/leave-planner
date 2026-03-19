import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Site, UserRole } from "../entities/user.entity";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    firstName: string;

    @IsString()
    @IsOptional()
    phone: string;

    @IsString()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    confirmPassword: string;

    @IsEnum(UserRole)
    role: UserRole;

    @IsEnum(Site)
    @IsOptional()
    site: Site;
}
