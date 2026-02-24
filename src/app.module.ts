import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeModule } from './employee/employee.module';
import { LeaveModule } from './leave/leave.module';
import { ConfigModule } from '@nestjs/config';
import { Leave } from './leave/entities/leave.entity';
import { Employee } from './employee/entities/employee.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // ← rend les variables accessibles partout
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',      // Ton utilisateur MySQL
      password: '',  // Ton mot de passe
      database: 'leave_planner',   // Le nom de ta base de données
      entities: [
        Leave,
        Employee
      ],
      synchronize: true,
    }),
    EmployeeModule,
    LeaveModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
