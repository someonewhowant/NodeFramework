/**
 * Модуль, содержащий контроллеры веб-приложения (Views)
 */

const index = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Главная страница</h1><p>Добро пожаловать в Node.js версию фреймворка!</p>');
};

const about = (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>О нас</h1><p>Это страница о нашей компании.</p>');
};

module.exports = {
    index,
    about
};
