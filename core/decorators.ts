import 'reflect-metadata';
import { SimbaRequest, SimbaResponse, RouteMatch } from './types';

// Константа для ключа метаданных маршрутов
const ROUTE_METADATA_KEY = 'custom:routes';

interface RouteDefinition {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    handlerName: string | symbol;
}

/**
 * Описание динамического маршрута (с параметрами вида :id)
 */
interface DynamicRoute {
    pattern: string;
    regex: RegExp;
    paramNames: string[];
    handler: (req: SimbaRequest, res: SimbaResponse) => any;
}

/**
 * Изолированный реестр маршрутов (вместо глобального словаря).
 * Поддерживает статические и динамические маршруты с URL-параметрами.
 * 
 * Статические маршруты (например /about/) используют O(1) hash-таблицу.
 * Динамические маршруты (например /students/:id/) компилируются в RegExp
 * при регистрации и матчатся последовательно при запросе.
 */
export class RouterRegistry {
    private static instance: RouterRegistry;
    
    // Статические маршруты — точное совпадение (быстрый путь)
    private readonly staticRoutes: Record<string, Record<string, (req: SimbaRequest, res: SimbaResponse) => any>> = {
        'GET': {},
        'POST': {},
        'PUT': {},
        'DELETE': {}
    };

    // Динамические маршруты — маршруты с параметрами (:id, :slug, и т.д.)
    private readonly dynamicRoutes: Record<string, DynamicRoute[]> = {
        'GET': [],
        'POST': [],
        'PUT': [],
        'DELETE': []
    };

    private constructor() {}

    public static getInstance(): RouterRegistry {
        if (!RouterRegistry.instance) {
            RouterRegistry.instance = new RouterRegistry();
        }
        return RouterRegistry.instance;
    }

    /**
     * Компилирует шаблон маршрута с параметрами в RegExp.
     * Пример: '/students/:id/' → { regex: /^\/students\/([^/]+)\/$/, paramNames: ['id'] }
     */
    private compileRoute(pattern: string): { regex: RegExp; paramNames: string[] } {
        const paramNames: string[] = [];
        // Экранируем спецсимволы регулярных выражений, кроме :param
        const regexStr = pattern
            .replace(/([.+?^${}()|[\]\\])/g, '\\$1')
            .replace(/:(\w+)/g, (_, name) => {
                paramNames.push(name);
                return '([^/]+)';
            });
        return { regex: new RegExp(`^${regexStr}$`), paramNames };
    }

    /**
     * Регистрирует обработчик маршрута.
     * Автоматически определяет тип: статический (точное совпадение) или динамический (с :параметрами).
     */
    public register(method: string, path: string, handler: Function) {
        if (path.includes(':')) {
            // Динамический маршрут (содержит параметры)
            const { regex, paramNames } = this.compileRoute(path);
            if (!this.dynamicRoutes[method]) {
                this.dynamicRoutes[method] = [];
            }
            this.dynamicRoutes[method].push({
                pattern: path,
                regex,
                paramNames,
                handler: handler as any
            });
            console.log(`[Router] Динамический маршрут: ${method} ${path} → RegExp: ${regex}`);
        } else {
            // Статический маршрут (точное совпадение)
            if (!this.staticRoutes[method]) {
                this.staticRoutes[method] = {};
            }
            this.staticRoutes[method][path] = handler as any;
            console.log(`[Router] Статический маршрут: ${method} ${path}`);
        }
    }

    /**
     * Ищет обработчик для указанного HTTP-метода и пути.
     * 
     * Алгоритм:
     * 1. Сначала O(1) поиск в статических маршрутах (быстрый путь)
     * 2. Если не найден — последовательный поиск среди динамических маршрутов
     * 
     * @returns RouteMatch с обработчиком и извлечёнными параметрами, или null
     */
    public getHandler(method: string, path: string): RouteMatch | null {
        // 1. Быстрый путь: точное совпадение (O(1))
        const exactHandler = this.staticRoutes[method]?.[path];
        if (exactHandler) {
            return { handler: exactHandler, params: {} };
        }
        
        // 2. Динамические маршруты: поиск по RegExp
        const dynamicList = this.dynamicRoutes[method];
        if (dynamicList) {
            for (const route of dynamicList) {
                const match = path.match(route.regex);
                if (match) {
                    const params: Record<string, string> = {};
                    route.paramNames.forEach((name, i) => {
                        params[name] = decodeURIComponent(match[i + 1]);
                    });
                    return { handler: route.handler, params };
                }
            }
        }
        
        return null;
    }

    /**
     * Вспомогательный метод для отладки: выводит все зарегистрированные маршруты
     */
    public printRoutes(): void {
        console.log('\n[Router] === Зарегистрированные маршруты ===');
        for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
            const statics = Object.keys(this.staticRoutes[method] || {});
            const dynamics = (this.dynamicRoutes[method] || []).map(r => r.pattern);
            for (const p of [...statics, ...dynamics]) {
                console.log(`  ${method.padEnd(6)} ${p}`);
            }
        }
        console.log('[Router] =====================================\n');
    }
}

/**
 * Фабрика для создания декораторов методов (GetRoute, PostRoute и т.д.)
 */
function createMethodDecorator(method: 'GET' | 'POST' | 'PUT' | 'DELETE') {
    return function (path: string = ''): MethodDecorator {
        return function (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
            const targetConstructor = target.constructor;
            
            // Безопасное наследование метаданных (поддержка Class-Based Views)
            if (!Reflect.hasOwnMetadata(ROUTE_METADATA_KEY, targetConstructor)) {
                // Клонируем роуты из родительского класса (если есть), чтобы не мутировать предка
                const parentRoutes = Reflect.getMetadata(ROUTE_METADATA_KEY, targetConstructor) || [];
                Reflect.defineMetadata(ROUTE_METADATA_KEY, [...parentRoutes], targetConstructor);
            }
            
            const routes: RouteDefinition[] = Reflect.getOwnMetadata(ROUTE_METADATA_KEY, targetConstructor);
            
            routes.push({
                method,
                path,
                handlerName: propertyKey
            });
        };
    };
}

export const GetRoute = createMethodDecorator('GET');
export const PostRoute = createMethodDecorator('POST');
export const PutRoute = createMethodDecorator('PUT');
export const DeleteRoute = createMethodDecorator('DELETE');

/**
 * Утилита для склейки и нормализации пути
 */
function normalizePath(basePath: string, routePath: string): string {
    let fullPath = (basePath + '/' + routePath).replace(/\/+/g, '/');
    if (!fullPath.endsWith('/')) fullPath += '/';
    return fullPath;
}

/**
 * Декоратор класса Controller.
 * Регистрирует все методы класса, помеченные декораторами маршрутов.
 */
export function Controller(basePath: string = ''): ClassDecorator {
    return function (constructor: Function) {
        // Извлекаем роуты (будут найдены как собственные, так и унаследованные)
        const routes: RouteDefinition[] = Reflect.getMetadata(ROUTE_METADATA_KEY, constructor) || [];
        
        if (routes.length > 0) {
            // Создаем единственный экземпляр контроллера
            const instance = new (constructor as any)();
            const routerRegistry = RouterRegistry.getInstance();

            for (const route of routes) {
                const fullPath = normalizePath(basePath, route.path);
                const handler = instance[route.handlerName].bind(instance);
                routerRegistry.register(route.method, fullPath, handler);
            }
        }
    };
}
