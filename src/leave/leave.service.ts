import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Leave } from './entities/leave.entity';
import { Between, Repository } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import * as express from 'express';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

@Injectable()
export class LeaveService {

  constructor(
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) { }

  getLeavesByRange(year: number, startMonth: number, endMonth: number, line: string, departement: string, site: string) {
    return this.leaveRepository.find({ where: { start_date: Between(new Date(year, startMonth, 1), new Date(year, endMonth, 1)), employee: { line, departement, site } }, relations: ['employee'] });
  }

  getLeavesByMonthAndLineAndDepartement(year: number, month: number, line: string, departement: string, site: string) {
    return this.leaveRepository.find({ where: { start_date: Between(new Date(year, month, 1), new Date(year, month, 31)), employee: { line, departement, site } }, relations: ['employee'] });
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

  async importLeaves(file: Express.Multer.File) {
    try {
      console.log("LEAVE SERVICE IMPORT LEAVES");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);
      // await workbook.xlsx.readFile(file.path);await workbook.xlsx.load(file.buffer as any);

      console.log("GETTING WORKSHEET");
      const worksheet = workbook.getWorksheet("donne saisie");
      console.log("WORKSHEET:", worksheet?.name);

      if (!worksheet) {
        const message = 'Aucune feuille trouvée dans le fichier Excel'
        console.log(message)
        throw new Error(message);
      }
      console.log("GETTING HEADER ROW");
      const headerRow = worksheet.getRow(1);
      console.log("HEADER ROW:", headerRow.values);

      const headerMap: Record<string, number> = {};

      headerRow.eachCell((cell, colNumber) => {
        const headerName = cell.value?.toString().trim().toLowerCase();
        console.log("COLUMN NAME:", headerName);
        if (headerName) {
          headerMap[headerName] = colNumber;
        }
      });


      // 2️⃣ Vérifier que les colonnes obligatoires existent
      const requiredColumns = ['mle', 'nom et prenom', 'fonction', 'codeabs', 'debutcongé', 'fincongé'];

      for (const column of requiredColumns) {
        if (!headerMap[column]) {
          throw new Error(`Missing column: ${column}`);
        }
      }
      console.log("HEADER MAP:", headerMap);
      const leaves: Partial<Leave>[] = [];

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const employee = await this.employeeRepository.findOne({ where: { matricule: row.getCell(headerMap['mle']).value?.toString() } });
        let leave_type = row.getCell(headerMap['codeabs']).value?.toString();
        if (leave_type === "Congé annuel") {
          leave_type = "Local_Leave_AMD";
        } else if (leave_type === "Permission") {
          leave_type = "Permission_AMD";
        } else if (leave_type === "Disponibilité") {
          leave_type = "Indisponibilite_AMD";
        }
        if (!employee) {
          console.log("EMPLOYEE NOT FOUND:", row.getCell(headerMap['mle']).value?.toString());
          continue;
        }
        const startDate = row.getCell(headerMap['debutcongé']).value as Date;
        const endDate = row.getCell(headerMap['fincongé']).value as Date;
        const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
        leaves.push({
          employee: employee,
          leave_type: leave_type,
          start_date: startDate,
          end_date: endDate,
          duration: duration,
        });
      }

      await this.leaveRepository.save(leaves);
      return {
        result: 'success',
        message: 'File readed successfully',
      };
    } catch (error) {
      console.log("ERROR:", error);
      return {
        result: 'error',
        message: error.message,
      };
    }
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
      .select(['e.id', 'e.matricule', 'e.fullname', 'e.DOE'])
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
      .andWhere('leave.start_date <= :date', { date: date.toISOString() })
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

    // let soldeCumul = this.calculateCumulBalance(date);

    // 4️⃣ Fusion finale
    // const result = data.map(emp => {
    //   const pris = takenMap.get(emp.id) || 0;
    //   const restant = soldeCumul - pris;

    //   return {
    //     ...emp,
    //     solde_cumul: Number(soldeCumul.toFixed(2)),
    //     solde_pris: Number(pris.toFixed(2)),
    //     solde_restant: Number(restant.toFixed(2)),
    //   };
    // });
    const promises = data.map(async (emp) => {
      const cumulSolde = (await this.getEmployeeSolde(emp.matricule, date)).solde_cumul;
      const pris = takenMap.get(emp.id) || 0;
      const restant = cumulSolde - pris;

      const doeDate = new Date(emp.DOE);


      let soldeDebut = 0;
      if (date.getFullYear() > doeDate.getFullYear() + 1) {
        const dateDebutCompte = new Date(doeDate.getFullYear() + 1, doeDate.getMonth(), doeDate.getDate());
        for (let i = dateDebutCompte.getFullYear(); i <= date.getFullYear(); i += 3) {
          if (date.getFullYear() - i < 3) {
            for (let y = i; y < date.getFullYear(); y++) {
              soldeDebut += (await this.getEmployeeSolde(emp.matricule, new Date(y, 11, 31))).solde_restant;
            }
          }
        }
      }

      return {
        ...emp,
        solde_cumul: Number(cumulSolde.toFixed(2)),
        solde_debut: Number(soldeDebut.toFixed(2)),
        solde_pris: Number(pris.toFixed(2)),
        solde_restant: Number((restant + soldeDebut).toFixed(2)),
      };
    });
    const results = await Promise.all(promises);
    console.log("Results:", results[0]);

    return results[0];
  }

  async getEmployeeSolde(matricule: string, at: Date) {
    const year = at.getFullYear();
    const employee = await this.employeeRepository.findOne({ where: { matricule } });
    if (!employee) return { solde_cumul: 0, solde_pris: 0, solde_restant: 0 };

    const takenLeaves = await this.leaveRepository
      .createQueryBuilder('leave')
      .leftJoin('leave.employee', 'employee')
      .select('employee.id', 'employeeId')
      .addSelect(
        'SUM(DATEDIFF(leave.end_date, leave.start_date) + 1)',
        'daysTaken'
      )
      .where('employee.id = :employeeId', { employeeId: employee.id })
      .andWhere('leave.leave_type = :type', { type: 'Local_Leave_AMD' })
      .andWhere('YEAR(leave.start_date) = :year', { year })
      .andWhere('leave.start_date <= :at', { at })
      .groupBy('employee.id')
      .getRawMany();


    const takenLeavesMap = new Map<string, number>();

    takenLeaves.forEach(l => {
      takenLeavesMap.set(l.employeeId, Number(l.daysTaken));
    });
    // 3️⃣ Calcul solde cumulatif dynamique
    let soldeCumul = 0;

    const getCumul = (date: Date) => {
      let cumul = 0;
      for (let m = 0; m <= date.getMonth(); m++) {
        const daysInMonth = new Date(date.getFullYear(), m + 1, 0).getDate();

        if (m === date.getMonth()) {
          cumul += (2.5 / daysInMonth) * date.getDate();
        } else {
          cumul += 2.5;
        }
      }
      return cumul;
    }

    if (year < at.getFullYear()) {
      // année passée → solde plein
      soldeCumul = 2.5 * 12;
    } else if (year > at.getFullYear()) {
      // année future → rien
      soldeCumul = 0;
    } else {
      // année en cours → calcul journalier
      soldeCumul = getCumul(at);
    }

    const yearAfterDOE = new Date(employee.DOE);
    yearAfterDOE.setFullYear(yearAfterDOE.getFullYear() + 1);
    if (at.getFullYear() === yearAfterDOE.getFullYear()) {
      soldeCumul = soldeCumul - getCumul(yearAfterDOE);
    } else if (at.getFullYear() <= yearAfterDOE.getFullYear()) {
      soldeCumul = 0;
    }

    const pris = takenLeavesMap.get(employee.id) || 0;
    const restant = soldeCumul - pris;

    const result = {
      ...employee,
      solde_cumul: Number(soldeCumul.toFixed(2)),
      solde_pris: Number(pris.toFixed(2)),
      solde_restant: Number(restant.toFixed(2)),
    };

    return result;
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

  async getPaginateEmployeeLeaves(employeeId: string, skip: number = 0, take: number = 10) {
    const [data, count] = await this.leaveRepository.findAndCount({
      where: { employee: { id: employeeId } },
      order: { start_date: 'DESC' },
      skip,
      take,
    });
    return { data, count };
  }

  async getEmployeeLeaves(employeeId: string) {
    return this.leaveRepository.find({ where: { employee: { id: employeeId } }, });
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

  getDatesBetween(startDate: Date, endDate: Date) {

    const dates: Date[] = [];

    const sy = Number(startDate.getFullYear());
    const sm = Number(startDate.getMonth());
    const sd = Number(startDate.getDate());
    const ey = Number(endDate.getFullYear());
    const em = Number(endDate.getMonth());
    const ed = Number(endDate.getDate());

    let current = new Date(sy, sm, sd);
    const end = new Date(ey, em, ed);

    console.log("start year:", sy);
    console.log("start month:", sm);
    console.log("start date:", sd);
    console.log("end year:", ey);
    console.log("end month:", em);
    console.log("end date:", ed);

    console.log("current:", current);
    console.log("end:", end);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    console.log(dates.length);

    return dates;
  }

  async exportLeavePlanning(startDate: Date, endDate: Date, line?: string, departement?: string) {

    const employees = await this.employeeRepository.find({ where: { line, departement }, order: { matricule: 'ASC' } });

    const leaves = await this.leaveRepository.find({
      where: {
        start_date: Between(new Date(startDate), new Date(endDate)),
        employee: { line, departement }
      },
      relations: ['employee']
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Leave Planning");

    const dates = this.getDatesBetween(startDate, endDate);

    const header = [
      "Matricule",
      "Fullname",
      "Departement",
      "Section",
      "Line",
      "Occupation",
      "DOE",
      "Statut",
      // "Solde debut",
      // "Solde pris",
      // "Solde cumul",
      // "Solde restant",
      ...dates.map(d => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }))
    ];

    sheet.addRow(header);

    const headerRow = sheet.getRow(1);

    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFf7ff18" }
      };
    });

    const sundayColumns = new Set<number>();

    dates.forEach((date, index) => {

      if (date.getDay() === 0) { // dimanche

        const columnIndex = index + 9; // 8 colonnes fixes + 1

        sundayColumns.add(columnIndex);

        sheet.getColumn(columnIndex).eachCell(cell => {

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF808080" } // gris foncé
          };

        });
      }

    });

    const leaveMap = new Map();

    leaves.forEach(l => {

      let current = new Date(l.start_date);
      const end = new Date(l.end_date);

      while (current <= end) {

        const key = `${l.employee.id}_${current.toISOString().slice(0, 10)}`;

        leaveMap.set(key, l.leave_type);

        current.setDate(current.getDate() + 1);
      }

    });

    employees.forEach(emp => {

      const rowData = [
        emp.matricule,
        emp.fullname,
        emp.departement,
        emp.section,
        emp.line,
        emp.occupation,
        emp.DOE,
        emp.type,
        // emp.solde_debut,
        // emp.solde_pris,
        // emp.solde_cumul,
        // emp.solde_restant

      ];

      dates.forEach(date => {

        const key = `${emp.id}_${date.toISOString().slice(0, 10)}`;

        rowData.push(leaveMap.get(key) || "");

      });

      const row = sheet.addRow(rowData);

      // 🔹 style colonnes infos employé (gris clair)
      for (let i = 1; i <= 8; i++) {

        const cell = row.getCell(i);

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEFEFEF" }
        };

      }

      // 🔹 style cellules planning
      dates.forEach((date, index) => {

        const columnIndex = index + 9;
        const cell = row.getCell(columnIndex);
        const value = cell.value as string;

        // dimanche → gris foncé (prioritaire)
        if (sundayColumns.has(columnIndex)) {

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF808080" }
          };

          return;
        }

        // couleurs selon type de leave
        if (value === "Local_Leave_AMD") {

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4F81BD" }
          };

        }

        if (value === "Permission_AMD") {

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC0504D" }
          };

        }

        if (value === "Indisponibilite_AMD") {

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF9BBB59" }
          };

        }

      });

    });

    sheet.columns.forEach(col => {
      col.width = 12;
    });

    return workbook;
  }

  async exportEmployeeLeaves(employee: Employee) {
    const leaves = await this.leaveRepository.find({ where: { employee: { id: employee.id } }, order: { start_date: 'DESC' }, relations: ['employee'] })
    console.log("Leaves:", leaves);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("" + employee.fullname);

    const header = [
      "Matricule",
      "Fullname",
      "Departement",
      "Section",
      "Line",
      "Start Date",
      "End Date",
      "Leave Type",
      "Duration"
    ];

    sheet.addRow(header);

    const headerRow = sheet.getRow(1);

    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFf7ff18" }
      };
    });

    leaves.forEach(leave => {
      const rowData = [
        leave.employee.matricule,
        leave.employee.fullname,
        leave.employee.departement,
        leave.employee.section,
        leave.employee.line,
        leave.start_date,
        leave.end_date,
        leave.leave_type,
        leave.duration
      ];

      sheet.addRow(rowData);
    });

    sheet.columns.forEach(col => {
      col.width = 12;
    });

    return workbook;
  }

}


