import { Controller, Get, Post, Body, Patch, Param, Delete, Render, Res, Query, UseGuards, ParseIntPipe, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import * as express from 'express';
import { EmployeeService } from 'src/employee/employee.service';
import { SuperAdminGuard } from 'src/superadmin/superadmin.guard';
import { RolesGuard } from 'src/user/role.guard';
import { Roles } from 'src/user/role.decorator';
import { UserRole, Site } from 'src/user/entities/user.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('leave')
export class LeaveController {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly employeeService: EmployeeService
  ) { }

  private getAllowedSites(userSite: string): string[] {

    if (userSite === Site.MADA) {
      return [Site.ABE1, Site.ABE2, Site.TANA]; // pas de filtre
    }

    if (userSite === Site.ANTSIRABE) {
      return [Site.ABE1, Site.ABE2];
    }

    return [userSite];
  }

  @Get('new-leave')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @Render('new-leave')
  async newLeave(@Query() query: any, @Query() error?: string) {
    return { title: "New Leave", error: error ? error : null };
  }

  @Post('new-leave')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  async createNewLeave(@Body() createLeaveDto: CreateLeaveDto, @Res() res: express.Response) {
    const leave = await this.leaveService.create(createLeaveDto, res);
    // res.redirect('/leave/new-leave');
  }

  @Get('leave-history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @Render('leave-history')
  async leaveHistory(@Query() query: any, @Query() error?: string) {
    return { title: "Leave History", error: error ? error : null };
  }

  @Get('employee-leaves/paginate/:employeeId')
  async getEmployeeLeaves(@Param('employeeId') employeeId: string, @Query('skip') skip: number, @Query('take') take: number) {
    return this.leaveService.getPaginateEmployeeLeaves(employeeId, skip, take);
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
    @Query('site') site: string,
  ) {
    return this.leaveService.getLeavesByRange(year, startMonth, endMonth, line, departement, site);
  }

  @Get('month-line-departement')
  async getLeavesByMonthAndLineAndDepartement(
    @Query('year') year: number,
    @Query('month') month: number,
    @Query('line') line: string,
    @Query('departement') departement: string,
    @Query('site') site: string,
  ) {
    return this.leaveService.getLeavesByMonthAndLineAndDepartement(year, month, line, departement, site);
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
    const employee = await this.employeeService.findOneByMatricule(matricule);
    return this.leaveService.getEmployeeCumulativeBalance(employee?.id, new Date(date));
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @Get('import-leaves')
  @Render('import-leaves')
  async importLeavesView(@Req() req: any) {
    return { title: "Import Leaves", error: req.query.error };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @Post('import-leaves')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async importLeavesPost(@UploadedFile() file: Express.Multer.File, @Res() res: express.Response) {
    try {
      console.log("FILE:", file);
      const result = await this.leaveService.importLeaves(file);
      if (result.result === 'error') {
        return res.redirect(`/leave/import-leaves?error=${result.message}`);
      }
      return res.redirect(`/leave/planning-view`);
    } catch (error) {
      return res.redirect(`/leave/import-leaves?error=${error.message}`);
    }
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @Get('export')
  @Render('export')
  async exportView() {
    const departementList = await this.employeeService.findAllDepartments()
    const lineList = await this.employeeService.findAllLines()
    return { title: "Export", departementList, lineList };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @Post('export-planning')
  async exportPlanningPost(
    @Body('startDate') startDate: Date,
    @Body('endDate') endDate: Date,
    @Body('line') line: string,
    @Body('departement') departement: string,
    @Res() res: express.Response
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const workbook = await this.leaveService.exportLeavePlanning(start, end, line, departement);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=planning-${startDate}-${endDate}.xlsx`
    );

    await workbook.xlsx.write(res);
    console.log("Exported successfully");
    res.end();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @Get('export-employee-leaves')
  async exportEmployeeLeaves(
    @Query('employeeId') employeeId: string,
    @Res() res: express.Response
  ) {
    console.log("Employee ID:", employeeId);
    const employee = await this.employeeService.findOne(employeeId);
    console.log("Employee:", employee);

    if (!employee) {
      return res.status(404).send('Employee not found');
    }

    const workbook = await this.leaveService.exportEmployeeLeaves(employee);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=employee-leaves-${employee.matricule}-${employee.fullname}.xlsx`
    );

    await workbook.xlsx.write(res);
    console.log("Exported successfully");
    res.end();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @Get('planning-view')
  @Render('leave-planning')
  async planningView(@Req() req: any) {
    const allowedSites = this.getAllowedSites(req.session.user.site);
    const departementList = await this.employeeService.findAllDepartments()
    const lineList = await this.employeeService.findAllLines()
    const KEYS = allowedSites.map(val => {
      // On cherche la clé dans l'objet Site qui possède cette valeur
      const key = (Object.keys(Site) as (keyof typeof Site)[]).find(
        k => Site[k] === val
      );
      return key;
    });
    return { title: "Planning View", departementList, lineList, allowedSites, KEYS };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Get('new-leave-test')
  @Render('new-leave-test')
  async newLeaveView() {
    return { title: "New leave" };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.PAYROLL)
  @Get('simulate-leave')
  @Render('simulate-leave')
  async simulateLeave() {
    return { title: "Simulate leave", userRole: UserRole };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
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
