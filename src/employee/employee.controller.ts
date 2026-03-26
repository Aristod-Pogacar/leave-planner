import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, Render, UseInterceptors, Res, Query, UseGuards, Req } from '@nestjs/common';
import express from 'express'; // ✅ SEULE VERSION CORRECTE
import { FileInterceptor } from '@nestjs/platform-express';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { memoryStorage } from 'multer';
import { RolesGuard } from 'src/user/role.guard';
import { Roles } from 'src/user/role.decorator';
import { Site, UserRole } from 'src/user/entities/user.entity';

@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) { }

  private getAllowedSites(userSite: string): string[] {

    if (userSite === Site.MADA) {
      return [Site.ABE1, Site.ABE2, Site.TANA]; // pas de filtre
    }

    if (userSite === Site.ABE1) {
      return [Site.ABE1, Site.ABE2];
    }

    return [userSite];
  }
  @Get('finding/search-list')
  async search(@Query('q') q: string, @Req() req: any) {
    return this.employeeService.search(q, req.session.user.site);
  }

  @Get('find-one-by-matricule')
  async findOneByMatricule(@Query('matricule') matricule: string) {
    console.log('FIND ONE BY MATRICULE');
    return await this.employeeService.findOneByMatricule(matricule);
  }

  @Get('find-one-by-fullname')
  async findOneByFullName(@Query('fullname') fullname: string) {
    return this.employeeService.findOneByFullName(fullname);
  }

  @Get('find-by-line')
  async findByLine(@Query('line') line: string) {
    return this.employeeService.findByLine(line);
  }

  @Get('find-by-section')
  async findBySection(@Query('section') section: string) {
    return this.employeeService.findBySection(section);
  }

  @Get('find-by-line-and-section')
  async findByLineAndSection(@Query('line') line: string, @Query('section') section: string) {
    return this.employeeService.findByLineAndSection(line, section);
  }

  @Get('find-all')
  async findAllByLineAndSection(
    @Req() req: any,
    @Query('line') line: string,
    @Query('departement') departement: string,
    @Query('site') site: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 50,
    @Query('year') year: number = new Date().getFullYear(),
  ) {
    // const test = await this.employeeService.getEmployeeSolde("10784", new Date("2017-12-31"))
    // console.log("TEST 10784 2017-01-10:", test);

    const employees = await this.employeeService.getEmployeesWithBalances(line, departement, site, +skip, +take, +year);
    // console.log("employees", employees);
    // console.log("SESSION:", req.session.user);
    return employees;
    // return this.employeeService.findAllByLineAndDepartement(line, departement, +skip, +take, year);
  }

  @Get('test')
  async test(
    @Req() req: any,
    @Query('line') line: string,
    @Query('departement') departement: string,
    @Query('site') site: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 50,
    @Query('year') year: number = new Date().getFullYear(),
  ) {
    const employees = await this.employeeService.getEmployeesWithBalances(line, departement, site, +skip, +take, +year);
    console.log("employees", employees);
    return employees;
    // return this.employeeService.findAllByLineAndDepartement(line, departement, +skip, +take, year);
  }

  @Get('new-employee')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @Render('new-employee')
  async newEmployee(
    @Req() req, any,
    @Query('line') line: string,
    @Query('departement') departement: string,
  ) {
    const allowedSites = this.getAllowedSites(req.session.user.site);
    const employees = await this.employeeService.getEmployees(line, departement);
    return { title: "New Employee", employees, allowedSites };
  }

  @Post('new-employee')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  async newEmployeePost(@Body() body: any, @Res() res: express.Response) {
    console.log("BODY:", body);
    await this.employeeService.create(body);
    return res.redirect('/');
  }

  @Get('import-master-file')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @Render('import-master-file')
  async importMasterFile(@Req() req: any) {
    return { title: "Import Master File", error: req.query.error };
  }

  @Post('import-master-file')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async import(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: express.Response,
  ) {
    console.log("FILE:", file);

    try {
      const result = await this.employeeService.processExcelBuffer(file);

      // Redirection vers la liste des employés avec message
      res.redirect(`/leave/planning-view`);
    } catch (error) {
      // Gestion d'erreur
      console.log("ERROR:", error.message)
      res.redirect(`/employee/import-master-file?error=${encodeURIComponent(error.message)}`);
    }
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.create(createEmployeeDto);
  }

  @Get()
  findAll() {
    return this.employeeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeeService.update(id, updateEmployeeDto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeeService.remove(id);
  }

}
