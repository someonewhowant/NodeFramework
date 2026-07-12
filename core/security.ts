import { Middleware } from './middleware';

export interface CorsOptions {
    origin?: string;
    methods?: string;
    headers?: string;
    credentials?: boolean;
}

/**
 * Middleware для поддержки Cross-Origin Resource Sharing (CORS).
 * 
 * @example
 * ```typescript
 * app.use(corsMiddleware({ origin: 'https://myfrontend.com' }));
 * ```
 */
export function corsMiddleware(options: CorsOptions = {}): Middleware {
    return async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', options.origin || '*');
        res.setHeader('Access-Control-Allow-Methods', options.methods || 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', options.headers || 'Content-Type, Authorization');
        
        if (options.credentials) {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }

        // Быстрый ответ на preflight-запросы
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        await next();
    };
}

/**
 * Экранирует HTML-спецсимволы для защиты от XSS атак.
 * Полезно при выводе пользовательского ввода в HTML (когда шаблонизатор не делает этого автоматически).
 */
export function escapeHtml(str: string): string {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Санитизация объекта — рекурсивно экранирует все строковые поля.
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            result[key] = escapeHtml(value);
        } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = sanitizeObject(value);
        } else {
            result[key] = value;
        }
    }
    return result as T;
}
