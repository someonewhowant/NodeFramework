import { IncomingMessage } from 'http';

// Максимальный размер тела запроса: 1 MB (защита от OOM)
const MAX_BODY_SIZE = 1 * 1024 * 1024;

/**
 * Парсит GET-параметры (Query String) в виде объекта
 */
export const parseGetRequest = (req: IncomingMessage): Record<string, string> => {
    const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    return Object.fromEntries(parsedUrl.searchParams.entries());
};

/**
 * Парсит тело POST/PUT запроса (JSON или URL-Encoded)
 */
export const parseBody = async (req: IncomingMessage): Promise<Record<string, any>> => {
    let body = '';
    let size = 0;

    // Используем современные асинхронные итераторы для чтения потока
    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY_SIZE) {
            // Защита от OOM (Out of Memory): обрываем загрузку слишком больших файлов
            throw new Error('413 Payload Too Large: Превышен лимит размера запроса');
        }
        body += chunk.toString();
    }

    if (!body) {
        return {};
    }

    const contentType = req.headers['content-type'] || '';

    // Поддержка современных REST API (JSON)
    if (contentType.includes('application/json')) {
        try {
            return JSON.parse(body);
        } catch (e) {
            throw new Error('400 Bad Request: Неверный формат JSON');
        }
    }

    // Поддержка классических HTML-форм
    if (contentType.includes('application/x-www-form-urlencoded')) {
        // Используем современный URLSearchParams вместо устаревшего querystring
        const searchParams = new URLSearchParams(body);
        return Object.fromEntries(searchParams.entries());
    }

    // Если тип не поддерживается (например text/plain), можно вернуть пустой объект или сырую строку
    // В рамках нашего фреймворка вернем пустой объект
    return {};
};
