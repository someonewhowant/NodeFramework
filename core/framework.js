const url = require('url');
const requestParser = require('./request_parser');

// Контроллер для обработки 404 ошибки (PageNotFound)
const pageNotFound404 = (req, res) => {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 WHAT</h1><p>404 PAGE Not Found</p>');
};

class Framework {
    /**
     * Класс Framework - основа нашего веб-фреймворка
     * @param {Object} routesObj - Объект с маршрутами приложения
     */
    constructor(routesObj) {
        this.routes = routesObj;
    }

    /**
     * Основной обработчик входящих запросов (аналог __call__ в WSGI)
     * @param {Object} req - Объект HTTP запроса (http.IncomingMessage)
     * @param {Object} res - Объект HTTP ответа (http.ServerResponse)
     */
    async handleRequest(req, res) {
        // Получаем адрес, по которому пользователь выполнил переход (PATH_INFO)
        const parsedUrl = url.parse(req.url, true);
        let path = parsedUrl.pathname;

        // Добавляем закрывающий слеш для единообразия
        if (!path.endsWith('/')) {
            path += '/';
        }

        console.log(`[Framework] Получен ${req.method}-запрос по адресу: ${path}`);

        // Сбор параметров в единый объект request (аналог обогащения из Урока 2)
        req.query = requestParser.parseGetRequest(req);
        if (Object.keys(req.query).length > 0) {
            console.log(`Нам пришли GET-параметры:`, req.query);
        }

        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            try {
                req.body = await requestParser.parseBody(req);
                console.log(`Нам пришёл ${req.method}-запрос с телом:`, req.body);
            } catch (err) {
                console.error(`Ошибка при чтении тела ${req.method}-запроса:`, err);
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                return res.end('500 Internal Server Error');
            }
        } else {
            req.body = {};
        }

        // Находим нужный контроллер (view) с учетом метода
        let methodRoutes = this.routes[req.method] || {};
        let view = methodRoutes[path];

        if (!view) {
            view = pageNotFound404;
        }

        // Запускаем контроллер, передавая обогащенный req и res
        view(req, res);
    }
}

module.exports = Framework;
