const controllers = require('./controllers');

// Словарь маршрутов разделен по HTTP-методам
const routes = {
    'GET': {
        '/': controllers.index,
        '/index/': controllers.index,
        '/about/': controllers.about
    },
    'POST': {
        // Заглушка, чтобы показать работу POST
        '/about/': controllers.about 
    },
    'PUT': {},
    'DELETE': {}
};

module.exports = routes;
