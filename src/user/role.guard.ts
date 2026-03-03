import {
    Injectable,
    CanActivate,
    ExecutionContext,
    NotFoundException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from './entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<string[]>(
            'roles',
            context.getHandler(),
        );

        if (!requiredRoles) return true;

        const request = context.switchToHttp().getRequest();
        const user = request.session?.user;

        if (!user) {
            throw new NotFoundException();
        }

        if (user.role === UserRole.SUPERADMIN) return true;

        if (!requiredRoles.includes(user.role)) {
            throw new NotFoundException();
        }

        return true;
    }
}