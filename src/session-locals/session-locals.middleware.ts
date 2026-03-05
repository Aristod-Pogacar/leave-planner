import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class SessionLocalsMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    res.locals.user = req.session.user;
    next();
  }
}
