const http = require('http');
const Framework = require('./core/framework');
const routes = require('./app/routes');

// Инициализация фреймворка с нашими маршрутами
const app = new Framework(routes);

// Создание HTTP сервера. 
// Метод handleRequest нужно привязать к контексту app с помощью bind,
// чтобы внутри него this указывал на экземпляр Framework
const server = http.createServer(app.handleRequest.bind(app));

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Проверьте http://localhost:${PORT}/ или http://localhost:${PORT}/about/`);
});
