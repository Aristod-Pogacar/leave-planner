import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const user = request.session?.user;

    if (!user) {
      return response.redirect('/login');
    }

    return true;
  }
}