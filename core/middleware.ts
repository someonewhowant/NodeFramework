import { SimbaRequest, SimbaResponse } from './types';
import { parseGetRequest, parseBody } from './request_parser';
import { RouterRegistry } from './decorators';
import { UnitOfWork } from './unit_of_work';
import { FrameworkSettings } from './settings';
import { CONTENT_TYPES_MAP } from './content_types';
import * as path from 'path';
import * as fs from 'fs';
import { appLogger } from './logger';

/**
 * Функция передачи управления следующему middleware в конвейере
 */
export type NextFunction = () => Promise<void>;

/**
 * Middleware — промежуточный обработчик запроса.
 * Принимает запрос, ответ и функцию next() для передачи управления.
 * Может прервать цепочку, не вызвав next() (например, для статических файлов или ошибок).
 */
export type Middleware = (
    req: SimbaRequest,
    res: SimbaResponse,
    next: NextFunction
) => Promise<void>;

/**
 * Конвейер промежуточных обработчиков (Middleware Pipeline).
 * 
 * Каждый middleware вызывается последовательно. Если middleware вызывает next(),
 * управление передаётся следующему. Если не вызывает — цепочка прерывается.
 * 
 * Паттерн «Chain of Responsibility» (GoF).
 */
export class MiddlewarePipeline {
    private readonly stack: Middleware[] = [];

    /**
     * Добавляет middleware в конец конвейера
     */
    use(middleware: Middleware): this {
        this.stack.push(middleware);
        return this;
    }

    /**
     * Добавляет массив middleware в конец конвейера
     */
    useAll(middlewares: Middleware[]): this {
        this.stack.push(...middlewares);
        return this;
    }

    /**
     * Количество middleware в конвейере
     */
    get length(): number {
        return this.stack.length;
    }

    /**
     * Выполняет конвейер для данного запроса и ответа.
     * Каждый middleware получает замыкание next(), которое запускает следующий middleware.
     */
    async execute(req: SimbaRequest, res: SimbaResponse): Promise<void> {
        let index = 0;

        const next = async (): Promise<void> => {
            if (index < this.stack.length) {
                const mw = this.stack[index++];
                await mw(req, res, next);
            }
        };

        await next();
    }
}

/**
 * Глобальная обработка ошибок.
 * 
 * ДОЛЖЕН быть ПЕРВЫМ в конвейере — оборачивает всю цепочку в try/catch.
 * Перехватывает ошибки парсинга (400), превышения лимита (413) и прочие (500).
 */
export function errorHandlerMiddleware(): Middleware {
    return async (req, res, next) => {
        try {
            await next();
        } catch (err: any) {
            appLogger.error('[Middleware:Error] Обработанная ошибка:', err.message || err);

            // Если заголовки уже отправлены, мы не можем писать статус-код
            if (res.headersSent) return;

            if (err.message && err.message.startsWith('413')) {
                res.writeHead(413, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(err.message);
                return;
            }
            if (err.message && err.message.startsWith('400')) {
                res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(err.message);
                return;
            }

            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('500 Internal Server Error');
        }
    };
}

/**
 * Раздача статических файлов.
 * 
 * Если путь начинается с STATIC_URL — отдаёт файл и НЕ вызывает next().
 * Иначе — передаёт управление дальше по конвейеру.
 */
export function staticFilesMiddleware(): Middleware {
    return async (req, res, next) => {
        const reqPath = req.path || '/';

        if (!reqPath.startsWith(FrameworkSettings.STATIC_URL)) {
            return next();
        }

        // Извлекаем относительный путь к файлу из URL
        const filePath = reqPath.substring(
            FrameworkSettings.STATIC_URL.length,
            reqPath.endsWith('/') ? reqPath.length - 1 : reqPath.length
        );

        const ext = path.extname(filePath).toLowerCase();
        const contentType = CONTENT_TYPES_MAP[ext] || 'application/octet-stream';

        try {
            const fullPath = path.join(FrameworkSettings.STATIC_FILES_DIR, filePath);
            const body = await fs.promises.readFile(fullPath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(body);
            // НЕ вызываем next() — цепочка прерывается, статика отдана
        } catch (err) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404</h1><p>Статический файл не найден</p>');
        }
    };
}

/**
 * Логирование входящих запросов.
 * 
 * Логирует метод и путь при входе, а также статус-код и время ответа при выходе.
 */
export function loggingMiddleware(): Middleware {
    return async (req, res, next) => {
        const start = Date.now();
        appLogger.info(`[Middleware:Log] → ${req.method} ${req.path}`);

        await next();

        const duration = Date.now() - start;
        appLogger.info(`[Middleware:Log] ← ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    };
}

/**
 * Парсинг тела запроса (POST/PUT/PATCH).
 * 
 * Для GET/DELETE/HEAD устанавливает req.body = {}.
 * Для остальных методов — парсит тело (JSON или URL-Encoded).
 */
export function bodyParserMiddleware(): Middleware {
    return async (req, res, next) => {
        if (['POST', 'PUT', 'PATCH'].includes(req.method || 'GET')) {
            req.body = await parseBody(req);
        } else {
            req.body = {};
        }

        await next();
    };
}

/**
 * Транзакционная изоляция через Unit of Work.
 * 
 * Оборачивает оставшуюся часть конвейера (включая роутер) в контекст
 * AsyncLocalStorage, гарантируя что каждый HTTP-запрос получает
 * собственный экземпляр UnitOfWork.
 */
export function unitOfWorkMiddleware(): Middleware {
    return async (req, res, next) => {
        const uow = new UnitOfWork();
        await UnitOfWork.asyncLocalStorage.run(uow, async () => {
            try {
                await next();
            } catch (err) {
                await uow.rollback();
                throw err;
            }
        });
    };
}

/**
 * Маршрутизация — финальный middleware в конвейере.
 * 
 * Ищет обработчик маршрута в RouterRegistry, извлекает URL-параметры
 * и вызывает контроллер. Если маршрут не найден — отдаёт 404.
 */
export function routerMiddleware(): Middleware {
    return async (req, res, _next) => {
        const routeMatch = RouterRegistry.getInstance().getHandler(
            req.method || 'GET',
            req.path || '/'
        );

        if (routeMatch) {
            req.params = routeMatch.params;
            await routeMatch.handler(req, res);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 WHAT</h1><p>404 PAGE Not Found</p>');
        }
    };
}
