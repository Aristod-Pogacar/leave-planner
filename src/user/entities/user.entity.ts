import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN',
    PAYROLL = 'PAYROLL',
    SUPERADMIN = 'SUPERADMIN'
}

@Entity()
export class User {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    firstName: string;

    @Column({ nullable: true })
    phone: string;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER
    })
    role: UserRole;

    @Column({ nullable: true })
    verificationCode: string;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
    createdAt: Date;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
    updatedAt: Date;

    // @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", nullable: true })
    // deletedAt: Date;

    @Column({ default: false })
    isActive: boolean;

    @Column({ default: false })
    isVerified: boolean;

    @Column({ default: false })
    isDeleted: boolean;

    @Column({ default: false })
    isBlocked: boolean;

    @Column({ default: false })
    isSuspended: boolean;

    @Column({ default: false })
    isArchived: boolean;
}