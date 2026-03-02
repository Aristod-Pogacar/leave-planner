import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN',
    SUPERADMIN = 'SUPERADMIN'
}

@Entity()
export class User {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    nom: string;

    @Column({ nullable: true })
    prenom: string;

    @Column({ nullable: true })
    telephone: string;

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