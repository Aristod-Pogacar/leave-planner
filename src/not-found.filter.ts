import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    NotFoundException,
} from '@nestjs/common';

@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {
    catch(exception: NotFoundException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();

        response.status(404).render('404');
    }
}