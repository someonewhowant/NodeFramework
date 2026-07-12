import * as path from 'path';

// Настройки по умолчанию
export const FrameworkSettings = {
    STATIC_URL: '/static/',
    STATIC_FILES_DIR: path.join(process.cwd(), 'staticfiles'),
    VIEWS_DIR: path.join(process.cwd(), 'src', 'views'),
};

// Функция для переопределения настроек при старте сервера
export const configureSettings = (config: Partial<typeof FrameworkSettings>) => {
    // Удаляем undefined значения, чтобы не перезаписать дефолтные настройки
    for (const key of Object.keys(config) as (keyof typeof FrameworkSettings)[]) {
        if (config[key] !== undefined) {
            FrameworkSettings[key] = config[key]!;
        }
    }
};
