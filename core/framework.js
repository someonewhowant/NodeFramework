const url = require('url');

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
    handleRequest(req, res) {
        // Получаем адрес, по которому пользователь выполнил переход (PATH_INFO)
        const parsedUrl = url.parse(req.url, true);
        let path = parsedUrl.pathname;

        // Добавляем закрывающий слеш для единообразия, как в Python-версии
        if (!path.endsWith('/')) {
            path += '/';
        }

        console.log(`[Framework] Получен запрос по адресу: ${path}`);

        // Находим нужный контроллер (view)
        let view = this.routes[path];

        if (!view) {
            view = pageNotFound404;
        }

        // Запускаем контроллер. В Node.js мы передаем req и res напрямую в контроллер,
        // чтобы он сам мог отправить ответ. 
        // (В будущих уроках мы добавим сюда формирование объекта request)
        view(req, res);
    }
}

module.exports = Framework;
