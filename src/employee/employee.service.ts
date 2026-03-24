import { Injectable } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { In, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { Leave } from 'src/leave/entities/leave.entity';
import { Site } from 'src/user/entities/user.entity';

@Injectable()
export class EmployeeService {

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,
  ) { }
  create(createEmployeeDto: CreateEmployeeDto) {
    return this.employeeRepository.save(createEmployeeDto);
  }

  findAllByLineAndDepartement(line: string | undefined, departement: string | undefined, skip: number, take: number, year: number) {
    return this.employeeRepository.find({ where: { line, departement }, skip, take, order: { matricule: 'ASC' } });
  }

  private calculateAccruedLeave(year: number): number {
    const today = new Date();

    let total = 0;

    for (let month = 0; month <= today.getMonth(); month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      if (month === today.getMonth()) {
        total += (2.5 / daysInMonth) * today.getDate();
      } else {
        total += 2.5;
      }
    }

    return parseFloat(total.toFixed(2));
  }

  private getAllowedSites(userSite: string): string[] {

    if (userSite === Site.MADA) {
      return [Site.ABE1, Site.ABE2, Site.TANA];
    } else if (userSite === Site.ANTSIRABE) {
      return [Site.ABE1, Site.ABE2];
    } else if (userSite === Site.TANA) {
      return [Site.TANA];
    } else if (userSite === Site.ABE1) {
      return [Site.ABE1];
    } else if (userSite === Site.ABE2) {
      return [Site.ABE2];
    } else {
      return [];
    }
  }

  async getEmployeesWithBalances(
    line: string,
    departement: string,
    site: string,
    skip: number,
    take: number,
    year: number,
  ) {

    // 1️⃣ Récupérer les employés
    const [employees, total] = await this.employeeRepository.findAndCount({
      where: { line, departement, site },
      order: { matricule: 'ASC' },
      skip,
      take,
    });

    if (employees.length === 0) {
      return { data: [], total };
    }

    const employeeIds = employees.map(e => e.id);
    // console.log("employeeIds:", employeeIds);

    const today = new Date();
    // console.log("today:", today);

    // 2️⃣ Calcul jours pris (Local_Leave_AMD uniquement)
    const takenLeaves = await this.leaveRepository
      .createQueryBuilder('leave')
      .leftJoin('leave.employee', 'employee')
      .select('employee.id', 'employeeId')
      .addSelect(
        'SUM(DATEDIFF(leave.end_date, leave.start_date) + 1)',
        'daysTaken'
      )
      .where('employee.id IN (:...employeeIds)', { employeeIds })
      .andWhere('leave.leave_type = :type', { type: 'Local_Leave_AMD' })
      .andWhere('YEAR(leave.start_date) = :year', { year })
      .andWhere('leave.start_date <= :today', { today })
      .andWhere('employee.site = :site', { site })
      .groupBy('employee.id')
      .getRawMany();

    // console.log("takenLeaves:", takenLeaves);

    const takenPermissions = await this.leaveRepository
      .createQueryBuilder('leave')
      .leftJoin('leave.employee', 'employee')
      .select('employee.id', 'employeeId')
      .addSelect(
        'SUM(DATEDIFF(leave.end_date, leave.start_date) + 1)',
        'daysTaken'
      )
      .where('employee.id IN (:...employeeIds)', { employeeIds })
      .andWhere('leave.leave_type = :type', { type: 'Permission_AMD' })
      .andWhere('YEAR(leave.start_date) = :year', { year })
      .andWhere('leave.start_date <= :today', { today })
      .andWhere('employee.site = :site', { site })
      .groupBy('employee.id')
      .getRawMany();

    const takenLeaveMap = new Map<string, number>();

    takenLeaves.forEach(l => {
      takenLeaveMap.set(l.employeeId, Number(l.daysTaken));
    });

    const takenPermissionMap = new Map<string, number>();

    takenPermissions.forEach(l => {
      takenPermissionMap.set(l.employeeId, Number(l.daysTaken));
    });

    // 3️⃣ Calcul solde cumulatif dynamique
    // const today = new Date();

    let soldeCumul = 0;

    if (year < today.getFullYear()) {
      // année passée → solde plein
      soldeCumul = 2.5 * 12;
    } else if (year > today.getFullYear()) {
      // année future → rien
      soldeCumul = 0;
    } else {
      // année en cours → calcul journalier
      for (let m = 0; m <= today.getMonth(); m++) {
        const daysInMonth = new Date(year, m + 1, 0).getDate();

        if (m === today.getMonth()) {
          soldeCumul += (2.5 / daysInMonth) * today.getDate();
        } else {
          soldeCumul += 2.5;
        }
      }
    }

    // console.log("employees", employees);

    // 4️⃣ Fusion finale
    // 1. Crée le tableau de promesses avec .map()
    const promises = employees.map(async (emp) => {
      const cumulSolde = (await this.getEmployeeSolde(emp.matricule, today)).solde_cumul;
      const pris = takenLeaveMap.get(emp.id) || 0;
      const prisPermission = takenPermissionMap.get(emp.id) || 0;
      const restant = cumulSolde - pris;

      const doeDate = new Date(emp.DOE);


      let soldeDebut = 0;
      if (year > doeDate.getFullYear() + 1) {
        const dateDebutCompte = new Date(doeDate.getFullYear() + 1, doeDate.getMonth(), doeDate.getDate());
        for (let i = dateDebutCompte.getFullYear(); i <= year; i += 3) {
          if (year - i < 3) {
            for (let y = i; y < year; y++) {
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
        solde_pris_permission: Number(prisPermission.toFixed(2)),
        solde_restant: Number((restant + soldeDebut).toFixed(2)),
      };
    });

    // 2. Attends que TOUTES les promesses soient résolues
    const results = await Promise.all(promises);

    return { data: results, total };
  }

  async getEmployees(
    line: string,
    departement: string,
  ) {
    const [employees, total] = await this.employeeRepository.findAndCount({
      where: { line, departement },
      order: { matricule: 'ASC' },
    });

    if (employees.length === 0) {
      return { data: [], total };
    } else {
      return { data: employees, total };
    }
  }

  async findDepartement() {
    const results = await this.employeeRepository
      .createQueryBuilder('empoyee')
      .select('DISTINCT empoyee.departement', 'departement')
      .getRawMany();

    // this.employeeRepository.find({
    //   select: ['departement'],
    //   where: {}
    // })

    return results.map(res => res.value);
  }


  async findAllDepartments(): Promise<string[]> {
    const results = await this.employeeRepository
      .createQueryBuilder('employee')
      .select('DISTINCT employee.departement', 'departement')
      .where('employee.departement IS NOT NULL')
      .orderBy('employee.departement', 'ASC')
      .getRawMany();

    return results.map((res) => res.departement);
  }

  async findAllLines(): Promise<string[]> {
    const results = await this.employeeRepository
      .createQueryBuilder('employee')
      .select('DISTINCT employee.line', 'line')
      .where('employee.line IS NOT NULL')
      .orderBy('employee.line', 'ASC')
      .getRawMany();

    return results.map((res) => res.line);
  }


  findAll() {
    return this.employeeRepository.find({ order: { matricule: 'ASC' } });
  }

  findOne(id: string) {
    return this.employeeRepository.findOne({ where: { id } });
  }

  update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeeRepository.update(id, updateEmployeeDto);
  }

  remove(id: string) {
    return this.employeeRepository.delete(id);
  }

  async processExcelBuffer(file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    if (file.originalname.endsWith('.xls')) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);
      // const salt = await bcrypt.genSalt(10);
      // console.log("rows:", rows);

      // 🎯 Sélectionner uniquement certains champs
      const filtered = rows.map(row => ({
        type: row['Type'],
        div: row['Div'],
        departement: row['Dept'],
        section: row['Sect'],
        line: row['Line'],
        matricule: row['Emp No'],
        gender: row['Gender'],
        pay_mode: row['Pay Mode'],
        DOE: row['D.O.E'],
        DOC: row['D.O.C'],
        DOR: row['D.O.R'],
        effective_start_date: row['Effec. Start Date'],
        effective_end_date: row['Effec. End Date'],
        division: row['Division'],
        fullname: row['Fullname'],
        job_level: row['Job Level'],
        job_post: row['Job Post'],
        occupation: row['Occupation'],
        prtr: row['PRTR'],
        DI: row['DI'],
        site: row['Sit'],
        pattern: row['Pattern'],
        date_of_birth: row['D.O.B'],
        CIN: row['NIC No'],
        CNAPS: row['CNAPS No'],
        adrs_street: row['Adrs street'],
        adrs_locality: row['Adrs locality'],
        adrs_twnvge: row['Adrs twnvge'],
        cat_basic: row['Cat Basic'],
        cat_ind: row['Cat Ind'],
        cat_prof: row['Cat Prof']
      }));

      // ❗ ignorer lignes vides
      const cleanData = filtered.filter(x => x.matricule);

      // 📌 Insérer dans MySQL
      try {
        await this.employeeRepository
          .createQueryBuilder()
          .insert()
          .into(Employee)
          .values(cleanData)
          .orIgnore()  // ⚡ ignore les doublons automatiquement
          .execute();
      } catch (e) {
        console.log(e);
      }
      return {
        result: 'success',
        message: 'Master file imported successfully',
      };

    }
    await workbook.xlsx.load(file.buffer as any);
    // await workbook.xlsx.readFile(file.path);await workbook.xlsx.load(file.buffer as any);

    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      throw new Error('Aucune feuille trouvée dans le fichier Excel');
    }
    const headerRow = worksheet.getRow(1);

    const headerMap: Record<string, number> = {};

    headerRow.eachCell((cell, colNumber) => {
      const headerName = cell.value?.toString().trim().toLowerCase();
      console.log("COLUMN NAME:", headerName);
      if (headerName) {
        headerMap[headerName] = colNumber;
      }
    });

    // 2️⃣ Vérifier que les colonnes obligatoires existent
    const requiredColumns = ['emp no', 'type', 'division'];

    for (const column of requiredColumns) {
      if (!headerMap[column]) {
        throw new Error(`Colonne manquante: ${column}`);
      }
    }
    console.log("HEADER MAP:", headerMap);
    const employees: Partial<Employee>[] = [];

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);

      employees.push({
        type: row.getCell(headerMap['type']).value?.toString(),
        div: row.getCell(headerMap['div']).value?.toString(),
        departement: row.getCell(headerMap['dept']).value?.toString(),
        section: row.getCell(headerMap['sect']).value?.toString(),
        line: row.getCell(headerMap['line']).value?.toString(),
        matricule: row.getCell(headerMap['emp no']).value?.toString(),
        gender: row.getCell(headerMap['gender']).value?.toString(),
        pay_mode: row.getCell(headerMap['pay mode']).value?.toString(),
        DOE: row.getCell(headerMap['d.o.e']).value as Date,
        DOC: row.getCell(headerMap['d.o.c']).value as Date,
        DOR: row.getCell(headerMap['d.o.r']).value as Date,
        effective_start_date: row.getCell(headerMap['effec. start date']).value as Date,
        effective_end_date: row.getCell(headerMap['effec. end date']).value as Date,
        division: row.getCell(headerMap['division']).value?.toString(),
        fullname: row.getCell(headerMap['fullname']).value?.toString(),
        job_level: row.getCell(headerMap['job level']).value?.toString(),
        job_post: row.getCell(headerMap['job post']).value?.toString(),
        occupation: row.getCell(headerMap['occupation']).value?.toString(),
        prtr: row.getCell(headerMap['prtr']).value?.toString(),
        DI: row.getCell(headerMap['di']).value?.toString(),
        site: row.getCell(headerMap['sit']).value?.toString(),
        pattern: row.getCell(headerMap['pattern']).value?.toString(),
        date_of_birth: row.getCell(headerMap['d.o.b']).value as Date,
        CIN: row.getCell(headerMap['nic no']).value?.toString(),
        CNAPS: row.getCell(headerMap['cnaps no']).value?.toString(),
        adrs_street: row.getCell(headerMap['adrs street']).value?.toString(),
        adrs_locality: row.getCell(headerMap['adrs locality']).value?.toString(),
        adrs_twnvge: row.getCell(headerMap['adrs twnvge']).value?.toString(),
        cat_basic: row.getCell(headerMap['cat basic']).value?.toString(),
        cat_ind: row.getCell(headerMap['cat ind']).value?.toString(),
        cat_prof: row.getCell(headerMap['cat prof']).value?.toString()
      });
    }

    await this.employeeRepository.save(employees);
    return {
      result: 'success',
      message: 'Master file imported successfully',
    };
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

  async search(q: string, site: any) {
    const allowedSites = this.getAllowedSites(site);
    if (!q) return [];
    const year = new Date().getFullYear();
    const [data] = await this.employeeRepository
      .createQueryBuilder('e')
      // .leftJoin('users', 'u', 'u.employee = e.matricule')
      .where(
        '(e.matricule LIKE :q OR e.fullname LIKE :q)',
        { q: `%${q}%` },
      )
      .andWhere('e.site IN (:...allowedSites)', { allowedSites })
      // .andWhere('u.id IS NULL')
      .select(['e.id', 'e.matricule', 'e.fullname', 'e.line', 'e.departement', 'e.section', 'e.site', 'e.section', 'e.DOE'])
      .take(10)
      .getManyAndCount();

    if (data.length === 0 || !data) return [];
    const date = new Date(data[0].DOE);
    date.setFullYear(date.getFullYear() + 1);
    let yearAfter3 = date.getFullYear();
    while (2026 - yearAfter3 > 3) {
      yearAfter3 = yearAfter3 + 3;
    }
    date.setFullYear(yearAfter3);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const takenLeaves = await this.leaveRepository
      .createQueryBuilder('leave')
      .leftJoin('leave.employee', 'employee')
      .select('employee.id', 'employeeId')
      .addSelect(
        'SUM(DATEDIFF(leave.end_date, leave.start_date) + 1)',
        'daysTaken'
      )
      .where('employee.id IN (:...employeeIds)', { employeeIds: data.map((e) => e.id) })
      .andWhere('leave.leave_type = :type', { type: 'Local_Leave_AMD' })
      .andWhere('YEAR(leave.start_date) = :year', { year })
      .andWhere('leave.start_date <= :today', { today })
      .andWhere('employee.site IN (:...allowedSites)', { allowedSites })
      .groupBy('employee.id')
      .getRawMany();

    const takenPermissions = await this.leaveRepository
      .createQueryBuilder('leave')
      .leftJoin('leave.employee', 'employee')
      .select('employee.id', 'employeeId')
      .addSelect(
        'SUM(DATEDIFF(leave.end_date, leave.start_date) + 1)',
        'daysTaken'
      )
      .where('employee.id IN (:...employeeIds)', { employeeIds: data.map((e) => e.id) })
      .andWhere('leave.leave_type = :type', { type: 'Permission_AMD' })
      .andWhere('YEAR(leave.start_date) = :year', { year })
      .andWhere('leave.start_date <= :today', { today })
      .andWhere('employee.site IN (:...allowedSites)', { allowedSites })
      .groupBy('employee.id')
      .getRawMany();
    // console.log("Data:", takenLeaves);
    // // return data;

    // console.log("takenLeaves:", takenLeaves);

    const takenLeavesMap = new Map<string, number>();
    const takenPermissionsMap = new Map<string, number>();

    takenLeaves.forEach(l => {
      takenLeavesMap.set(l.employeeId, Number(l.daysTaken));
    });

    takenPermissions.forEach(l => {
      takenPermissionsMap.set(l.employeeId, Number(l.daysTaken));
    });

    // 3️⃣ Calcul solde cumulatif dynamique
    let soldeCumul = 0;

    if (year < today.getFullYear()) {
      // année passée → solde plein
      soldeCumul = 2.5 * 12;
    } else if (year > today.getFullYear()) {
      // année future → rien
      soldeCumul = 0;
    } else {
      // année en cours → calcul journalier
      for (let m = 0; m <= today.getMonth(); m++) {
        const daysInMonth = new Date(year, m + 1, 0).getDate();

        if (m === today.getMonth()) {
          soldeCumul += (2.5 / daysInMonth) * today.getDate();
        } else {
          soldeCumul += 2.5;
        }
      }
    }

    // 4️⃣ Fusion finale
    const result = data.map(emp => {
      const pris = takenLeavesMap.get(emp.id) || 0;
      const permissions = takenPermissionsMap.get(emp.id) || 0;
      const restant = soldeCumul - pris;

      return {
        ...emp,
        solde_cumul: Number(soldeCumul.toFixed(2)),
        solde_pris: Number(pris.toFixed(2)),
        solde_restant: Number(restant.toFixed(2)),
        permissions: Number(permissions.toFixed(2)),
      };
    });

    return result;
  }

  async findOneByMatricule(matricule: string) {
    return this.employeeRepository.findOneBy({ matricule });
  }

  async findOneByFullName(fullname: string) {
    return this.employeeRepository.findOneBy({ fullname });
  }

  async findByLine(line: string) {
    return this.employeeRepository.findBy({ line });
  }

  async findBySection(section: string) {
    return this.employeeRepository.findBy({ section });
  }

  async findByLineAndSection(line: string, section: string) {
    return this.employeeRepository.findBy({ line, section });
  }

}
