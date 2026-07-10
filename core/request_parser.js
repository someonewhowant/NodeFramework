const url = require('url');
const querystring = require('querystring');

/**
 * Парсинг GET параметров из URL
 * @param {Object} req - Объект входящего запроса
 * @returns {Object} Словарь параметров GET
 */
const parseGetRequest = (req) => {
    const parsedUrl = url.parse(req.url, true);
    return parsedUrl.query;
};

/**
 * Асинхронное чтение и парсинг тела запроса (POST, PUT, PATCH)
 * @param {Object} req - Объект входящего запроса
 * @returns {Promise<Object>} Промис, разрешающийся словарем параметров
 */
const parseBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';

        // Собираем куски данных по мере их поступления
        req.on('data', chunk => {
            body += chunk.toString();
        });

        // Когда данные полностью прочитаны
        req.on('end', () => {
            if (body) {
                // querystring.parse автоматически декодирует URL-encoded символы
                const postData = querystring.parse(body);
                resolve(postData);
            } else {
                resolve({});
            }
        });

        req.on('error', (err) => {
            reject(err);
        });
    });
};

module.exports = {
    parseGetRequest,
    parseBody
};
