import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import { NotFoundFilter } from './not-found.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('ejs');
  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.use(
    session({
      secret: 'ajdgreyfgcgajycbjeugyfghktehnfugbqkclqhfgyekfsfvbqjbxkqgefrkbgk',
      resave: false,
      saveUninitialized: false,
    }),
  );

  // app.use((req, res, next) => {
  //   res.status(404).render('404');
  //   next();
  // });
  app.useGlobalFilters(new NotFoundFilter());

  app.use((req: any, res: any, next: any) => {
    if (res.locals.user) {
      res.locals.user = req.session.user;
    }
    next();
  });


  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
