import { Controller, Get, Post, Body, Patch, Param, Delete, UploadedFile, Render, UseInterceptors, Res, Query } from '@nestjs/common';
import express from 'express'; // ✅ SEULE VERSION CORRECTE
import { FileInterceptor } from '@nestjs/platform-express';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { memoryStorage } from 'multer';

@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) { }

  @Get('finding/search-list')
  async search(@Query('q') q: string) {
    return this.employeeService.search(q);
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
    @Query('line') line: string,
    @Query('departement') departement: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 50,
    @Query('year') year: number = new Date().getFullYear(),
  ) {
    const employees = await this.employeeService.getEmployeesWithBalances(line, departement, +skip, +take, +year);
    console.log("employees", employees);
    return employees;
    // return this.employeeService.findAllByLineAndDepartement(line, departement, +skip, +take, year);
  }

  @Get('test')
  async test(
    @Query('line') line: string,
    @Query('departement') departement: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 50,
    @Query('year') year: number = new Date().getFullYear(),
  ) {
    const employees = await this.employeeService.getEmployeesWithBalances(line, departement, +skip, +take, +year);
    console.log("employees", employees);
    return employees;
    // return this.employeeService.findAllByLineAndDepartement(line, departement, +skip, +take, year);
  }

  @Get('import-master-file')
  @Render('import-master-file')
  async importMasterFile() {
    return { pageTitle: "Import Master File" };
  }

  @Post('import-master-file')
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
      console.log("ERROR:", error)
      res.redirect(`/employee?error=${encodeURIComponent(error.message)}`);
    }
  }

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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeeService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeeService.remove(id);
  }

}
