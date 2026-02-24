import { Controller, Get, Post, Body, Patch, Param, Delete, Render, Res, Query } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import * as express from 'express';
import { EmployeeService } from 'src/employee/employee.service';

@Controller('leave')
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly employeeService: EmployeeService
  ) { }

  @Get('new-leave')
  @Render('new-leave')
  async newLeave(@Query() query: any, @Query() error?: string) {
    return { pageTitle: "New Leave", error: error ? error : null };
  }

  @Post('new-leave')
  async createNewLeave(@Body() createLeaveDto: CreateLeaveDto, @Res() res: express.Response) {
    const leave = await this.leaveService.create(createLeaveDto, res);
    // res.redirect('/leave/new-leave');
  }

  @Get('employee-leaves/:employeeId')
  async getEmployeeLeaves(@Param('employeeId') employeeId: string, @Query() query: any) {
    return this.leaveService.getEmployeeLeaves(employeeId);
  }

  @Get('employee-leaves/:employeeId/:month/:year')
  async getEmployeeLeavesByMonth(@Param('employeeId') employeeId: string, @Param('month') month: number, @Param('year') year: number) {
    return this.leaveService.getEmployeeLeavesByMonth(employeeId, month, year);
  }

  @Get('employee-leaves/:employeeId/:year')
  async getEmployeeLeavesByYear(@Param('employeeId') employeeId: string, @Param('year') year: number) {
    return this.leaveService.getEmployeeLeavesByYear(employeeId, year);
  }

  @Get('employee-leaves/:employeeId/:startDate/:endDate')
  async getEmployeeLeavesByRange(@Param('employeeId') employeeId: string, @Param('startDate') startDate: Date, @Param('endDate') endDate: Date) {
    return this.leaveService.getEmployeeLeavesByRange(employeeId, startDate, endDate);
  }

  @Get('leaves-line/:line')
  async getLeavesByLine(@Param('line') line: string) {
    return this.leaveService.getLeavesByLine(line);
  }

  @Get('leaves-section/:section')
  async getLeavesBySection(@Param('section') section: string) {
    return this.leaveService.getLeavesBySection(section);
  }

  @Get('leaves-month-year/:month/:year')
  async getLeavesByMonth(@Param('month') month: number, @Param('year') year: number) {
    return this.leaveService.getLeavesByMonth(month, year);
  }

  @Get('leaves-year/:year')
  async getLeavesByYear(@Param('year') year: number) {
    return this.leaveService.getLeavesByYear(year);
  }

  @Get('leaves-line-section/:line/:section')
  async getLeavesByLineAndSection(@Param('line') line: string, @Param('section') section: string) {
    return this.leaveService.getLeavesByLineAndSection(line, section);
  }

  @Get('range')
  async getLeavesByRange(
    @Query('year') year: number,
    @Query('startMonth') startMonth: number,
    @Query('endMonth') endMonth: number,
    @Query('line') line: string,
    @Query('departement') departement: string,
  ) {
    console.log("LINE:", line);
    console.log("DEPARTEMENT:", departement);
    return this.leaveService.getLeavesByRange(year, startMonth, endMonth, line, departement);
  }

  @Get('planning')
  async getPlanning(
    @Query('year') year: number,
    @Query('startMonth') startMonth: number,
    @Query('endMonth') endMonth: number,
    @Query('line') line: string,
    @Query('section') section: string,
    @Query('skip') skip: number,
    @Query('take') take: number,
  ) {
    return this.leaveService.getPlanning(year, startMonth, endMonth, line, section, skip, take);
  }

  @Post('simulate-cumul-balance')
  async getEmployeeCumulativeBalance(@Body('matricule') matricule: string, @Body('date') date: string) {
    console.log("MATRICULE:", matricule);
    console.log("DATE(string):", date);
    console.log("DATE:", new Date(date).toISOString());
    const employee = await this.employeeService.findOneByMatricule(matricule);
    console.log("Employee:", employee);
    // return { OK: "OK" };
    return this.leaveService.getEmployeeCumulativeBalance(employee?.id, new Date(date));
  }

  @Get('planning-view')
  @Render('leave-planning')
  async planningView() {
    const departementList = await this.employeeService.findAllDepartments()
    console.log("departement:", departementList)
    const lineList = await this.employeeService.findAllLines()
    console.log("line:", lineList)
    return { pageTitle: "Planning View", departementList, lineList };
  }

  @Post()
  create(@Body() createLeaveDto: CreateLeaveDto, @Res() res: express.Response) {
    return this.leaveService.create(createLeaveDto, res);
  }

  @Get()
  findAll() {
    return this.leaveService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leaveService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeaveDto: UpdateLeaveDto) {
    return this.leaveService.update(id, updateLeaveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leaveService.remove(id);
  }
}
