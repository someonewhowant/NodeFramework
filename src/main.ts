import 'reflect-metadata';
import * as path from 'path';
import * as fs from 'fs';
import { Framework } from '../core/framework';
import { appLogger } from '../core/logger';
import { config } from './config';

/**
 * Функция для автоматического сканирования и регистрации модулей
 * Ищет файлы, заканчивающиеся на .controller.ts и .service.ts во всех подпапках
 */
function bootstrapModules(modulesDir: string) {
    if (!fs.existsSync(modulesDir)) return;
    
    const items = fs.readdirSync(modulesDir, { withFileTypes: true });
    
    for (const item of items) {
        const fullPath = path.join(modulesDir, item.name);
        if (item.isDirectory()) {
            bootstrapModules(fullPath); // Рекурсивный обход
        } else if (item.name.endsWith('.controller.ts') || item.name.endsWith('.service.ts')) {
            // Динамический импорт файлов
            require(fullPath);
            appLogger.info(`[Bootstrap] Загружен модуль: ${item.name}`);
        }
    }
}

// 1. Сканируем все модули приложения автоматически
const modulesPath = path.join(__dirname, 'modules');
bootstrapModules(modulesPath);

// 2. Инициализация фреймворка
const app = new Framework({
    staticUrl: '/static/',
    staticDir: path.join(__dirname, '..', 'staticfiles'),
    viewsDir: path.join(__dirname, 'views')
});

// 3. Запуск сервера
app.listen(config.PORT, () => {
    appLogger.info(`[Server] Окружение: ${config.NODE_ENV}`);
    appLogger.info(`[Server] Запуск сервера на порту ${config.PORT}...`);
    appLogger.info(`[Server] http://localhost:${config.PORT}/`);
});
