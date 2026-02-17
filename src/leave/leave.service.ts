import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Leave } from './entities/leave.entity';
import { Between, Repository } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';

@Injectable()
export class LeaveService {

  constructor(
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) { }

  async create(createLeaveDto: CreateLeaveDto) {
    const employee = await this.employeeRepository.findOne({
      where: { id: createLeaveDto.employee },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const leave = await this.leaveRepository.create({
      ...createLeaveDto,
      employee,
    });

    const startDate = new Date(createLeaveDto.start_date);
    const endDate = new Date(createLeaveDto.end_date);

    const nbDate = endDate.getTime() - startDate.getTime();

    leave.duration = (nbDate / (1000 * 60 * 60 * 24)) + 1;

    return this.leaveRepository.save(leave);
  }

  findAll() {
    return this.leaveRepository.find();
  }

  findOne(id: string) {
    return this.leaveRepository.findOne({ where: { id } });
  }

  async update(id: string, updateLeaveDto: UpdateLeaveDto) {
    const employee = await this.employeeRepository.findOne({
      where: { id: updateLeaveDto.employee },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return this.leaveRepository.update(id, {
      ...updateLeaveDto,
      employee,
    });
  }

  remove(id: string) {
    return this.leaveRepository.delete(id);
  }

  async getEmployeeLeaves(employeeId: string) {
    return this.leaveRepository.find({ where: { employee: { id: employeeId } } });
  }

  async getEmployeeLeavesByDate(employeeId: string, date: Date) {
    return this.leaveRepository.find({ where: { employee: { id: employeeId }, start_date: date } });
  }

  async getEmployeeLeavesByMonth(employeeId: string, month: number, year: number) {
    return this.leaveRepository.find({ where: { employee: { id: employeeId }, start_date: Between(new Date(year, month, 1), new Date(year, month + 1, 1)) } });
  }

  async getEmployeeLeavesByYear(employeeId: string, year: number) {
    return this.leaveRepository.find({ where: { employee: { id: employeeId }, start_date: Between(new Date(year, 0, 1), new Date(year + 1, 0, 1)) } });
  }

  async getEmployeeLeavesByRange(employeeId: string, startDate: Date, endDate: Date) {
    return this.leaveRepository.find({ where: { employee: { id: employeeId }, start_date: Between(startDate, endDate) } });
  }

  async getLeavesByLine(line: string) {
    return this.leaveRepository.find({ where: { employee: { line } } });
  }

  async getLeavesBySection(section: string) {
    return this.leaveRepository.find({ where: { employee: { section } } });
  }

  async getLeavesByMonth(month: number, year: number) {
    return this.leaveRepository.find({ where: { start_date: Between(new Date(year, month, 1), new Date(year, month + 1, 1)) } });
  }

  async getLeavesByYear(year: number) {
    return this.leaveRepository.find({ where: { start_date: Between(new Date(year, 0, 1), new Date(year + 1, 0, 1)) } });
  }

  async getLeavesByLineAndSection(line: string, section: string) {
    return this.leaveRepository.find({ where: { employee: { line, section } } });
  }

  async getPlanning(
    year: number,
    startMonth: number,
    endMonth: number,
    line?: string,
    section?: string,
    skip = 0,
    take = 30,
  ) {
    const startDate = new Date(year, startMonth - 1, 1);
    const endDate = new Date(year, endMonth, 0); // dernier jour du mois

    const query = this.leaveRepository
      .createQueryBuilder('leave')
      .leftJoin('leave.employee', 'employee')
      .select([
        'leave.id',
        'leave.start_date',
        'leave.end_date',
        'leave.leave_type',
        'employee.id',
        'employee.fullname',
        'employee.line',
      ])
      .where(
        `
      leave.start_date <= :endDate
      AND leave.end_date >= :startDate
      `,
        { startDate, endDate },
      );

    if (line) {
      query.andWhere('employee.line = :line', { line });
    }

    if (section) {
      query.andWhere('employee.section = :section', { section });
    }

    query
      .orderBy('employee.id', 'ASC')
      .skip(skip)
      .take(take);

    return query.getMany();
  }
}


