import { parseGetRequest, parseBody } from './request_parser';
import { routes } from './decorators';

const pageNotFound404 = (req: any, res: any) => {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 WHAT</h1><p>404 PAGE Not Found</p>');
};

export class Framework {
    async handleRequest(req: any, res: any) {
        const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        let path = parsedUrl.pathname;

        if (!path.endsWith('/')) {
            path += '/';
        }

        console.log(`[Framework] Получен ${req.method}-запрос по адресу: ${path}`);
        req.query = parseGetRequest(req);
        
        if (['POST', 'PUT', 'PATCH'].includes(req.method || 'GET')) {
            req.body = await parseBody(req);
        } else {
            req.body = {};
        }

        // Мы получаем готовый словарь из декораторов
        let methodRoutes = routes[req.method || 'GET'] || {};
        let view = methodRoutes[path];

        if (!view) {
            view = pageNotFound404;
        }
        
        view(req, res);
    }
}
