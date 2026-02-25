import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Leave } from './entities/leave.entity';
import { Between, Repository } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import * as express from 'express';

@Injectable()
export class LeaveService {

  constructor(
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) { }

  getLeavesByRange(year: number, startMonth: number, endMonth: number, line: string, departement: string) {
    return this.leaveRepository.find({ where: { start_date: Between(new Date(year, startMonth, 1), new Date(year, endMonth, 1)), employee: { line, departement } }, relations: ['employee'] });
  }

  async create(createLeaveDto: CreateLeaveDto, res: express.Response) {
    const employee = await this.employeeRepository.findOne({
      where: { id: createLeaveDto.employee },
    });

    if (!employee) {
      return res.status(500).redirect('/leave/new-leave?error=employeeNotFound');
    }

    const leave = await this.leaveRepository.create({
      ...createLeaveDto,
      employee,
    });

    const startDate = new Date(createLeaveDto.start_date);
    const endDate = new Date(createLeaveDto.end_date);

    if (startDate > endDate) {
      return res.status(500).redirect('/leave/new-leave?error=startDateAfterEndDate');
    }



    const nbDate = endDate.getTime() - startDate.getTime();

    leave.duration = (nbDate / (1000 * 60 * 60 * 24)) + 1;
    await this.leaveRepository.save(leave);

    return res.status(200).redirect('/leave/planning-view?line=' + employee.line + '&departement=' + employee.departement);
  }

  async getEmployeeCumulativeBalance(employeeId: string = "", date: Date) {
    if (!employeeId) {
      return null;
    }
    console.log("Employee ID:", employeeId);
    console.log("Date:", date.toISOString());
    const [data] = await this.employeeRepository
      .createQueryBuilder('e')
      // .leftJoin('users', 'u', 'u.employee = e.matricule')
      .where(
        'e.id = :id',
        { id: employeeId },
      )
      // .andWhere('u.id IS NULL')
      .select(['e.id', 'e.matricule', 'e.fullname'])
      .take(10)
      .getManyAndCount();

    console.log("EMPLOYEES:", data);

    const takenLeaves = await this.leaveRepository
      .createQueryBuilder('leave')
      .leftJoin('leave.employee', 'employee')
      .select('employee.id', 'employeeId')
      .addSelect(
        'SUM(DATEDIFF(leave.end_date, leave.start_date) + 1)',
        'daysTaken'
      )
      .where('employee.id IN (:...employeeIds)', { employeeIds: [employeeId] })
      .andWhere('leave.leave_type = :type', { type: 'Local_Leave_AMD' })
      .andWhere('YEAR(leave.start_date) = :year', { year: date.getFullYear() })
      .groupBy('employee.id')
      .getRawMany();
    console.log("Data:", takenLeaves);
    // // return data;

    // console.log("takenLeaves:", takenLeaves);

    const takenMap = new Map<string, number>();

    takenLeaves.forEach(l => {
      takenMap.set(l.employeeId, Number(l.daysTaken));
    });

    // 3️⃣ Calcul solde cumulatif dynamique
    // const today = new Date();

    let soldeCumul = this.calculateCumulBalance(date);

    // 4️⃣ Fusion finale
    const result = data.map(emp => {
      const pris = takenMap.get(emp.id) || 0;
      const restant = soldeCumul - pris;

      return {
        ...emp,
        solde_cumul: Number(soldeCumul.toFixed(2)),
        solde_pris: Number(pris.toFixed(2)),
        solde_restant: Number(restant.toFixed(2)),
      };
    });
    return result[0];
  }

  calculateCumulBalance(date: Date) {
    let soldeCumul = 0;
    for (let m = 0; m <= date.getMonth(); m++) {
      const daysInMonth = new Date(date.getFullYear(), m + 1, 0).getDate();

      if (m === date.getMonth()) {
        soldeCumul += (2.5 / daysInMonth) * date.getDate();
      } else {
        soldeCumul += 2.5;
      }
    }
    return soldeCumul;
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


