import { parseGetRequest } from './request_parser';
import { IncomingMessage, ServerResponse } from 'http';
import { SimbaRequest, SimbaResponse, FrameworkConfig } from './types';
import { FrameworkSettings, configureSettings } from './settings';
import {
    Middleware,
    MiddlewarePipeline,
    errorHandlerMiddleware,
    staticFilesMiddleware,
    loggingMiddleware,
    bodyParserMiddleware,
    unitOfWorkMiddleware,
    routerMiddleware
} from './middleware';
import * as http from 'http';

export class Framework {
    /**
     * Пользовательские middleware, добавленные через use().
     * Вставляются в конвейер между bodyParser и unitOfWork.
     */
    private readonly userMiddlewares: Middleware[] = [];

    /**
     * Кэшированный конвейер (строится лениво при первом запросе)
     */
    private _pipeline?: MiddlewarePipeline;
    
    constructor(config?: FrameworkConfig) {
        if (config) {
            configureSettings({
                STATIC_URL: config.staticUrl,
                STATIC_FILES_DIR: config.staticDir,
                VIEWS_DIR: config.viewsDir
            });
        }
    }

    /**
     * Добавляет пользовательский middleware в конвейер.
     * 
     * Middleware вызываются в порядке добавления и размещаются
     * между bodyParser и unitOfWork в общем конвейере.
     * 
     * ВАЖНО: вызывайте use() ДО listen(), иначе middleware не попадёт в конвейер.
     * 
     * @example
     * ```typescript
     * app.use(async (req, res, next) => {
     *     res.setHeader('X-Powered-By', 'SimbaFramework');
     *     await next();
     * });
     * ```
     */
    use(middleware: Middleware): this {
        this.userMiddlewares.push(middleware);
        return this;
    }

    /**
     * Собирает полный конвейер middleware.
     * 
     * Порядок выполнения:
     * ┌─────────────────────────────────────────────────┐
     * │ 1. ErrorHandler   — глобальный try/catch        │
     * │ 2. StaticFiles    — раздача статики              │
     * │ 3. Logging        — логирование + замер времени  │
     * │ 4. BodyParser     — парсинг тела запроса         │
     * │ 5. [User MW...]   — CORS, Auth, Rate Limit...    │
     * │ 6. UnitOfWork     — транзакционная изоляция      │
     * │ 7. Router         — маршрутизация и вызов view   │
     * └─────────────────────────────────────────────────┘
     */
    private buildPipeline(): MiddlewarePipeline {
        const pipeline = new MiddlewarePipeline();

        // Системные middleware (порядок критичен!)
        pipeline.use(errorHandlerMiddleware());     // 1. Обработка ошибок — обёртка вокруг всего
        pipeline.use(staticFilesMiddleware());       // 2. Статика — short-circuit, не вызывает next()
        pipeline.use(loggingMiddleware());           // 3. Логирование — замер времени
        pipeline.use(bodyParserMiddleware());        // 4. Парсинг тела — JSON / URL-Encoded

        // Пользовательские middleware (CORS, авторизация, rate-limit и т.д.)
        pipeline.useAll(this.userMiddlewares);

        // Финальные системные middleware
        pipeline.use(unitOfWorkMiddleware());        // 5. UoW — транзакционный контекст
        pipeline.use(routerMiddleware());            // 6. Роутер — финальный вызов контроллера

        return pipeline;
    }

    /**
     * Получает или создаёт конвейер (ленивая инициализация).
     * Конвейер строится один раз и переиспользуется для всех запросов.
     */
    private getPipeline(): MiddlewarePipeline {
        if (!this._pipeline) {
            this._pipeline = this.buildPipeline();
            console.log(`[Framework] Конвейер собран: ${this._pipeline.length} middleware`);
        }
        return this._pipeline;
    }

    /**
     * Точка входа для обработки HTTP-запроса.
     * 
     * Выполняет минимальную подготовку (нормализация пути, парсинг query string)
     * и делегирует обработку конвейеру middleware.
     */
    async handleRequest(rawReq: IncomingMessage, res: ServerResponse) {
        const req = rawReq as SimbaRequest;
        const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        let pathName = parsedUrl.pathname;

        if (!pathName.endsWith('/')) {
            pathName += '/';
        }

        // Инициализация расширенных свойств SimbaRequest
        req.path = pathName;
        req.query = parseGetRequest(req);
        req.params = {};

        // Делегация в конвейер middleware
        await this.getPipeline().execute(req, res);
    }

    /**
     * Запуск встроенного сервера
     */
    listen(port: number, callback?: () => void) {
        const server = http.createServer((req, res) => this.handleRequest(req, res));
        server.listen(port, callback);
        return server;
    }
}
