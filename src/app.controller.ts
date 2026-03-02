import { Body, Controller, Get, Post, Render, Req, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import * as express from 'express';
import { AuthService } from './auth/auth.service';
import { SuperAdminGuard } from './superadmin/superadmin.guard';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService
  ) { }

  @Get()
  getHello(@Res() res: express.Response) {
    return res.redirect('/leave/planning-view');
  }

  @Get('login')
  @Render('login')
  async getLogin() {
    return { title: 'Login' };
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

  @Get('register')
  @Render('register')
  getRegister() {
    return { title: 'Register' };
  }
}
