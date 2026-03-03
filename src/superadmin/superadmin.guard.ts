import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from 'src/user/entities/user.entity';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (!request.session.user) {
      console.log('Not logged in');
      throw new NotFoundException();
    }

    const isSuperAdmin = request.session.user?.role === UserRole.SUPERADMIN;

    if (!isSuperAdmin) {
      console.log('Not super admin');
      throw new NotFoundException();
    }

    return true;
  }
}