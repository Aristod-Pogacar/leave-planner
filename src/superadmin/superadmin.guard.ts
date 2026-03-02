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

    const isSuperAdmin = request.session.user?.role === UserRole.SUPERADMIN;

    if (!isSuperAdmin) {
      throw new NotFoundException();
    }

    return true;
  }
}