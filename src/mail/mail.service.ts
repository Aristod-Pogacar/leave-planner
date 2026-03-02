import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'stagedp@aquarabe.mg',
                pass: 'Pass1234$'
            }
        });
    }
    async sendVerificationEmail(email: string, code: string) {

        await this.transporter.sendMail({
            from: '"DP-AQUARABE" <stagedp@aquarabe.mg>',
            to: email,
            subject: 'Code de vérification',
            html: `<h2>Votre code de vérification: ${code}</h2>`
        });
    }
}
