import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import * as express from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(@Res() res: express.Response) {
    return res.redirect('/leave/planning-view');
  }
}
