import { SimbaRequest, SimbaResponse } from './types';
import { Middleware, NextFunction } from './middleware';
import * as crypto from 'crypto';

export interface AuthUser {
    id: string | number;
    username?: string;
    roles?: string[];
    [key: string]: any;
}

export interface AuthStrategy {
    authenticate(req: SimbaRequest): Promise<AuthUser | null>;
}

export class SessionAuthStrategy implements AuthStrategy {
    // В реальном фреймворке здесь был бы SessionStore
    async authenticate(req: SimbaRequest): Promise<AuthUser | null> {
        const cookieHeader = req.headers.cookie;
        if (!cookieHeader) return null;
        
        const cookies = Object.fromEntries(
            cookieHeader.split('; ').map(c => c.split('='))
        );
        
        if (cookies['session_id']) {
            // Заглушка для проверки сессии
            // В реальном фреймворке: await sessionStore.get(cookies['session_id'])
        }
        return null;
    }
}

export class JwtAuthStrategy implements AuthStrategy {
    constructor(private secret: string) {}

    async authenticate(req: SimbaRequest): Promise<AuthUser | null> {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.substring(7);
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            const header = parts[0];
            const payload = parts[1];
            const signature = parts[2];
            
            // Проверка подписи HMAC SHA256
            const hmac = crypto.createHmac('sha256', this.secret);
            hmac.update(`${header}.${payload}`);
            const expectedSignature = hmac.digest('base64url');
            
            if (signature !== expectedSignature) {
                return null; // Неверная подпись
            }
            
            const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
            
            // Проверка срока действия
            if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
                return null; // Токен истёк
            }
            
            return decodedPayload as AuthUser;
        } catch (err) {
            return null;
        }
    }
}

export class AuthService {
    private strategies: AuthStrategy[] = [];

    addStrategy(strategy: AuthStrategy) {
        this.strategies.push(strategy);
    }

    async authenticate(req: SimbaRequest): Promise<AuthUser | null> {
        for (const strategy of this.strategies) {
            const user = await strategy.authenticate(req);
            if (user) {
                return user;
            }
        }
        return null;
    }
}

// Глобальный экземпляр для управления аутентификацией
export const appAuthService = new AuthService();

/**
 * Middleware для аутентификации.
 * Пытается идентифицировать пользователя через зарегистрированные стратегии.
 * Если успешно — заполняет req.user.
 */
export function authMiddleware(): Middleware {
    return async (req: SimbaRequest, res: SimbaResponse, next: NextFunction) => {
        const user = await appAuthService.authenticate(req);
        if (user) {
            req.user = user;
        }
        await next();
    };
}

/**
 * Декоратор для защиты маршрутов.
 * Если req.user не определён, возвращает 401 Unauthorized.
 */
export function Authenticated() {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (req: SimbaRequest, res: SimbaResponse) {
            if (!req.user) {
                res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Unauthorized', message: 'Для доступа требуется авторизация' }));
                return;
            }
            return await originalMethod.apply(this, [req, res]);
        };

        return descriptor;
    };
}
