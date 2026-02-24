import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { Leave } from 'src/leave/entities/leave.entity';
import { LeaveService } from "src/leave/leave.service";

@Module({
  imports: [TypeOrmModule.forFeature([Leave, Employee])],
  controllers: [EmployeeController],
  providers: [EmployeeService, LeaveService],
})
export class EmployeeModule { }
