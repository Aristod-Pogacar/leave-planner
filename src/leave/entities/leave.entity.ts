import { Employee } from 'src/employee/entities/employee.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity('leaves')
export class Leave {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Employee, employee => employee.leaves)
    @JoinColumn({ name: 'employee_id' })
    employee!: Employee;

    @Column()
    leave_type!: string;

    @Column({ type: 'date' })
    start_date!: Date;

    @Column({ type: 'date' })
    end_date!: Date;

    @Column()
    duration!: number;

    @Column()
    status!: string;

    @Column({ nullable: true })
    reason?: string;

    @Column({ type: 'date', nullable: true })
    approved_date?: Date;

    @Column({ nullable: true })
    approver_id?: string;

    @Column({ default: () => "CURRENT_TIMESTAMP" })
    created_at?: Date;
}
