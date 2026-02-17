import { IsString, IsDate, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class CreateEmployeeDto {
    @IsString()
    @IsNotEmpty()
    departement!: string;

    @IsString()
    @IsNotEmpty()
    section!: string;

    @IsString()
    @IsNotEmpty()
    line!: string;

    @IsString()
    @IsNotEmpty()
    matricule!: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(['M', 'F'])
    gender!: string;

    @IsString()
    @IsNotEmpty()
    pay_mode!: string;

    @IsDate()
    @IsNotEmpty()
    DOE!: Date;

    @IsDate()
    @IsNotEmpty()
    DOC!: Date;

    @IsDate()
    @IsOptional()
    DOR?: Date;

    @IsDate()
    @IsNotEmpty()
    effective_start_date!: Date;

    @IsDate()
    @IsOptional()
    effective_end_date?: Date;

    @IsString()
    @IsNotEmpty()
    division!: string;

    @IsString()
    @IsNotEmpty()
    div!: string;

    @IsString()
    @IsNotEmpty()
    fullname!: string;

    @IsString()
    @IsNotEmpty()
    job_level!: string;

    @IsString()
    @IsNotEmpty()
    job_post!: string;

    @IsString()
    @IsNotEmpty()
    occupation!: string;

    @IsString()
    @IsNotEmpty()
    prtr!: string;

    @IsString()
    @IsNotEmpty()
    DI!: string;

    @IsString()
    @IsNotEmpty()
    site!: string;

    @IsString()
    @IsNotEmpty()
    pattern!: string;

    @IsDate()
    @IsNotEmpty()
    date_of_birth!: Date;

    @IsString()
    @IsNotEmpty()
    CIN!: string;

    @IsString()
    @IsNotEmpty()
    CNAPS!: string;

    @IsString()
    @IsNotEmpty()
    adrs_street!: string;

    @IsString()
    @IsNotEmpty()
    adrs_locality!: string;

    @IsString()
    @IsNotEmpty()
    adrs_twnvge!: string;

    @IsString()
    @IsNotEmpty()
    cat_basic!: string;

    @IsString()
    @IsNotEmpty()
    cat_ind!: string;

    @IsString()
    @IsNotEmpty()
    cat_prof!: string;

    @IsString()
    @IsNotEmpty()
    type!: string;
}
