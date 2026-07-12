import 'reflect-metadata';
import './src/modules/pages/page.controller';
import './src/modules/courses/course.controller';
import './src/modules/students/student.controller';
import { RouterRegistry } from './core/decorators';
import { MiddlewarePipeline, loggingMiddleware, errorHandlerMiddleware } from './core/middleware';
import { Framework } from './core/framework';
import * as path from 'path';

// 1. Проверяем регистрацию маршрутов
RouterRegistry.getInstance().printRoutes();

// 2. Проверяем MiddlewarePipeline
const pipeline = new MiddlewarePipeline();
pipeline.use(loggingMiddleware());
pipeline.use(errorHandlerMiddleware());
console.log(`✅ MiddlewarePipeline создан, middleware count: ${pipeline.length}`);

// 3. Проверяем создание Framework с use()
const app = new Framework({
    staticUrl: '/static/',
    staticDir: path.join(__dirname, 'staticfiles'),
    viewsDir: path.join(__dirname, 'src', 'views')
});

app.use(async (req, res, next) => {
    console.log('Custom middleware called!');
    await next();
});

console.log('✅ Framework создан с пользовательским middleware');
console.log('\n✅✅✅ Все тесты пройдены!');

process.exit(0);
