import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeModule } from './employee/employee.module';
import { LeaveModule } from './leave/leave.module';
import { ConfigModule } from '@nestjs/config';
import { Leave } from './leave/entities/leave.entity';
import { Employee } from './employee/entities/employee.entity';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { MailService } from './mail/mail.service';
import { AuthService } from './auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { User } from './user/entities/user.entity';
import { EmployeeService } from './employee/employee.service';
import { SessionLocalsMiddleware } from './session-locals/session-locals.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      // database: 'leave_planner_test',
      database: 'leave_planner',
      entities: [
        Leave,
        Employee,
        User
      ],
      synchronize: true,
    }),
    // TypeOrmModule.forRoot({
    //   type: 'sqlite',
    //   database: 'database.sqlite',
    //   entities: [__dirname + '/**/*.entity{.ts,.js}'],
    //   synchronize: true,
    // }),
    EmployeeModule,
    LeaveModule,
    UserModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, MailService, AuthService, JwtService, EmployeeService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SessionLocalsMiddleware)
      .forRoutes('*');
  }
}
