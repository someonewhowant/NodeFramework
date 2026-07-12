import 'reflect-metadata';
import * as path from 'path';
import { Framework } from './core/framework';

// Регистрация контроллеров
import './src/modules/pages/page.controller';
import './src/modules/courses/course.controller';
import './src/modules/students/student.controller';

const PORT = 8080;

// Инициализация фреймворка с настройкой (Bootstrap Configuration)
const app = new Framework({
    staticUrl: '/static/',
    staticDir: path.join(__dirname, 'staticfiles'),
    viewsDir: path.join(__dirname, 'src', 'views')
});

app.listen(PORT, () => {
    console.log(`[Server] Запуск сервера на порту ${PORT}...`);
    console.log(`[Server] http://localhost:${PORT}/`);
});
