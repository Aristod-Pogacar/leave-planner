import { Body, Controller, Get, Post, Render, Req, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import * as express from 'express';
import { AuthService } from './auth/auth.service';
import { SuperAdminGuard } from './superadmin/superadmin.guard';
import { UserService } from './user/user.service';
import { UserRole } from './user/entities/user.entity';
import { RolesGuard } from './user/role.guard';
import { Roles } from './user/role.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) { }

  @Get()
  getHello(@Res() res: express.Response) {
    return res.redirect('/leave/planning-view');
  }

  @Get('login')
  @Render('login')
  async getLogin(@Req() req: any, @Res() res: any) {
    if (req.session.user) {
      return res.redirect('/');
    } else {
      return { title: 'Login' };
    }
  }

  @Post('login')
  async login(@Body() body, @Req() req: any, @Res() res: any) {
    console.log("PASSWORD:", body.password)
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

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('register')
  @Render('register')
  getRegister() {
    return { title: 'Register', UserRole: UserRole };
  }

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
}
