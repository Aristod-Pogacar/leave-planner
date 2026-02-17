import { IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateLeaveDto {

    @IsString()
    employee: string;

    @IsNotEmpty()
    @IsDate()
    start_date: Date;

    @IsNotEmpty()
    @IsDate()
    end_date: Date;

    @IsNotEmpty()
    @IsString()
    leave_type: string;

    @IsOptional()
    @IsString()
    reason?: string;

}