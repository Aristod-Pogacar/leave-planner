import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { Leave } from './entities/leave.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import { EmployeeService } from 'src/employee/employee.service';

@Module({
  imports: [TypeOrmModule.forFeature([Leave, Employee])],
  controllers: [LeaveController],
  providers: [LeaveService, EmployeeService],
})
export class LeaveModule { }
