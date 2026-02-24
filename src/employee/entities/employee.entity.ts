import { Leave } from 'src/leave/entities/leave.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('employees')
export class Employee {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    departement!: string;

    @Column()
    section!: string;

    @Column()
    line!: string;

    @Column({ unique: true })
    matricule!: string;

    @Column()
    gender!: string;

    @Column()
    pay_mode!: string;

    @Column({ type: 'date' })
    DOE!: Date;

    @Column({ type: 'date' })
    DOC!: Date;

    @Column({ type: 'date', nullable: true })
    DOR!: Date | null;

    @Column({ type: 'date' })
    effective_start_date!: Date;

    @Column({ type: 'date', nullable: true })
    effective_end_date!: Date | null;

    @Column()
    division!: string;

    @Column()
    div!: string;

    @Column()
    fullname!: string;

    @Column()
    job_level!: string;

    @Column()
    job_post!: string;

    @Column()
    occupation!: string;

    @Column()
    prtr!: string;

    @Column()
    DI!: string;

    @Column()
    site!: string;

    @Column()
    pattern!: string;

    @Column({ type: 'date' })
    date_of_birth!: Date;

    @Column()
    CIN!: string;

    @Column()
    CNAPS!: string;

    @Column()
    adrs_street!: string;

    @Column()
    adrs_locality!: string;

    @Column()
    adrs_twnvge!: string;

    @Column()
    cat_basic!: string;

    @Column()
    cat_ind!: string;

    @Column()
    cat_prof!: string;

    @Column()
    type!: string;

    @OneToMany(() => Leave, leave => leave.employee)
    leaves: Leave[];
}