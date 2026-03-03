import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { MailService } from 'src/mail/mail.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly mailService: MailService,
        private readonly jwtService: JwtService,
    ) { }

    async register(email: any, password: any, name: any, firstName: any, phone: any, role: any, res: any) {
        const existing = await this.userRepo.findOne({ where: { email } });

        if (existing) {
            return res.status(400).redirect('/auth/register?error=emailAlreadyExists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const user = this.userRepo.create({
            email,
            password: hashedPassword,
            name,
            firstName,
            phone,
            role,
            verificationCode,
        });

        await this.userRepo.save(user);

        await this.mailService.sendVerificationEmail(user.email, verificationCode);

        return res.status(200).redirect('/auth/login?message=checkYourEmailForVerificationCode');
    }

    async validateUser(email: string, password: string) {

        const isSuperAdmin = await bcrypt.compare(password, process.env.SUPERADMIN_PASSWORD);
        console.log("PASSWORD:", password);

        if (
            email === process.env.SUPERADMIN_EMAIL &&
            isSuperAdmin
        ) {
            console.log('🔥 SUPERADMIN LOGGED IN 🔥');
            return {
                id: 'superadmin',
                email: process.env.SUPERADMIN_EMAIL,
                role: UserRole.SUPERADMIN,
                isSuperAdmin: true,
            };
        }

        // 👇 Sinon vérification normale en base
        const user = await this.userRepo.findOne({ where: { email } });
        console.log("USER:", user);


        if (!user) return null;

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return null;

        return user;
    }

    // async register(dto: CreateUserDto) {

    //     const existing = await this.userRepo.findOne({
    //         where: { email: dto.email }
    //     });

    //     if (existing) {
    //         throw new BadRequestException('Email already exists');
    //     }

    //     const hashed = await bcrypt.hash(dto.password, 10);

    //     const code = Math.floor(100000 + Math.random() * 900000).toString();

    //     const user = this.userRepo.create({
    //         ...dto,
    //         password: hashed,
    //         verificationCode: code,
    //         isVerified: false,
    //         isActive: false
    //     });

    //     await this.userRepo.save(user);

    //     await this.mailService.sendVerificationEmail(user.email, code);

    //     return { message: "Check your email for verification code" };
    // }

    // async verify(email: string, code: string) {

    //     const user = await this.userRepo.findOne({
    //         where: { email }
    //     });

    //     if (!user) throw new BadRequestException("User not found");

    //     if (user.verificationCode !== code)
    //         throw new BadRequestException("Invalid code");

    //     user.isVerified = true;
    //     user.isActive = true;

    //     await this.userRepo.save(user);

    //     return { message: "Email verified. Waiting admin approval." };
    // }
}
