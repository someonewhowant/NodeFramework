const controllers = require('./controllers');

// Словарь маршрутов (пути обязательно с закрывающим слешем, как было решено в ядре)
const routes = {
    '/': controllers.index,
    '/index/': controllers.index,
    '/about/': controllers.about
};

module.exports = routes;
