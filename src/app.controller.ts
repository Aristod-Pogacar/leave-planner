import { Body, Controller, Get, Post, Render, Req, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import * as express from 'express';
import { AuthService } from './auth/auth.service';
import { SuperAdminGuard } from './superadmin/superadmin.guard';
import { UserService } from './user/user.service';
import { UserRole } from './user/entities/user.entity';
import { RolesGuard } from './user/role.guard';
import { Roles } from './user/role.decorator';
import { EmployeeService } from './employee/employee.service';
import { AuthGuard } from './auth/auth.guard';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly employeeService: EmployeeService,
  ) { }

  @UseGuards(AuthGuard)
  @Get()
  getHello(@Res() res: express.Response) {
    return res.redirect('/leave/planning-view');
  }

  @Get('login')
  async getLogin(@Req() req: any, @Res() res: any) {

    if (req.session.user) {
      return res.redirect('/');
    }

    res.render('login', { title: 'Login' });
  }

  @Post('login')
  async login(@Body() body, @Req() req: any, @Res() res: any) {
    const user = await this.authService.validateUser(
      body.email,
      body.password,
    );

    if (!user) {
      return res.render('login', { error: 'Invalid credentials' });
    }

    req.session.user = user;

    return res.redirect('/');
  }

  // @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('register')
  @Render('register')
  getRegister(): { title: string; UserRole: typeof UserRole; } {
    return { title: 'Register', UserRole: UserRole };
  }

  // @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Post('register')
  async register(@Body() body, @Req() req: any, @Res() res: any) {
    if (body.password !== body.confirmPassword) {
      return res.render('register', { error: 'Passwords do not match' });
    }
    const user = await this.userService.create(body);

    if (!user) {
      return res.render('register', { error: 'Invalid credentials' });
    }

    return res.redirect('/');
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('logout')
  async logout(@Req() req: any, @Res() res: any) {
    req.session.destroy();
    return res.redirect('/login');
  }

  @Get("test")
  async test(@Req() req: any, @Res() res: any) {
    // const departementList = await this.employeeService.findAllDepartments()
    // const lineList = await this.employeeService.findAllLines()
    return res.render('import-test', { title: 'Test' });
  }
}
