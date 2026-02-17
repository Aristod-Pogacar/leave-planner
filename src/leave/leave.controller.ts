import { Controller, Get, Post, Body, Patch, Param, Delete, Render, Res, Query } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import * as express from 'express';

@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) { }

  @Get('new-leave')
  @Render('new-leave')
  async newLeave(@Query() query: any) {
    return { pageTitle: "New Leave", error: query.error };
  }

  @Post('new-leave')
  async createNewLeave(@Body() createLeaveDto: CreateLeaveDto, @Res() res: express.Response) {
    if (createLeaveDto.start_date > createLeaveDto.end_date) {
      res.redirect('/leave/new-leave?error=startDateAfterEndDate');
    }
    const leave = await this.leaveService.create(createLeaveDto);
    res.redirect('/leave/new-leave');
  }

  @Post()
  create(@Body() createLeaveDto: CreateLeaveDto) {
    return this.leaveService.create(createLeaveDto);
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
