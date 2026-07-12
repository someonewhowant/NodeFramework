import { parseGetRequest, parseBody } from './request_parser';
import { RouterRegistry } from './decorators';
import { IncomingMessage, ServerResponse } from 'http';
import { SimbaRequest, SimbaResponse, FrameworkConfig } from './types';
import { UnitOfWork } from './unit_of_work';
import { FrameworkSettings, configureSettings } from './settings';
import { CONTENT_TYPES_MAP } from './content_types';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

const pageNotFound404 = (req: SimbaRequest, res: SimbaResponse) => {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 WHAT</h1><p>404 PAGE Not Found</p>');
};

export class Framework {
    
    constructor(config?: FrameworkConfig) {
        if (config) {
            configureSettings({
                STATIC_URL: config.staticUrl,
                STATIC_FILES_DIR: config.staticDir,
                VIEWS_DIR: config.viewsDir
            });
        }
    }

    getContentType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        return CONTENT_TYPES_MAP[ext] || 'text/html';
    }

    async getStatic(staticDir: string, filePath: string): Promise<Buffer> {
        const pathToFile = path.join(staticDir, filePath);
        return await fs.promises.readFile(pathToFile);
    }

    async handleRequest(rawReq: IncomingMessage, res: ServerResponse) {
        const req = rawReq as SimbaRequest;
        const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        let pathName = parsedUrl.pathname;

        if (!pathName.endsWith('/')) {
            pathName += '/';
        }

        if (pathName.startsWith(FrameworkSettings.STATIC_URL)) {
            const filePath = pathName.substring(FrameworkSettings.STATIC_URL.length, pathName.length - 1);
            const contentType = this.getContentType(filePath);
            
            try {
                const body = await this.getStatic(FrameworkSettings.STATIC_FILES_DIR, filePath);
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(body);
            } catch (err) {
                pageNotFound404(req, res);
            }
            return;
        }

        console.log(`[Framework] Получен ${req.method}-запрос по адресу: ${pathName}`);
        req.query = parseGetRequest(req);
        
        let view = RouterRegistry.getInstance().getHandler(req.method || 'GET', pathName);

        if (!view) {
            view = pageNotFound404;
        }
        
        try {
            if (['POST', 'PUT', 'PATCH'].includes(req.method || 'GET')) {
                req.body = await parseBody(req);
            } else {
                req.body = {};
            }

            const uow = new UnitOfWork();
            await UnitOfWork.asyncLocalStorage.run(uow, async () => {
                await view(req, res);
            });
        } catch (err: any) {
            console.error('[Framework] Обработанная ошибка:', err.message || err);
            
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
