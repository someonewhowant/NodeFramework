import 'reflect-metadata';
import { SimbaRequest, SimbaResponse } from './types';

// Константа для ключа метаданных маршрутов
const ROUTE_METADATA_KEY = 'custom:routes';

interface RouteDefinition {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    handlerName: string | symbol;
}

/**
 * Изолированный реестр маршрутов (вместо глобального словаря)
 */
export class RouterRegistry {
    private static instance: RouterRegistry;
    
    private readonly routes: Record<string, Record<string, (req: SimbaRequest, res: SimbaResponse) => any>> = {
        'GET': {},
        'POST': {},
        'PUT': {},
        'DELETE': {}
    };

    private constructor() {}

    public static getInstance(): RouterRegistry {
        if (!RouterRegistry.instance) {
            RouterRegistry.instance = new RouterRegistry();
        }
        return RouterRegistry.instance;
    }

    public register(method: string, path: string, handler: Function) {
        if (!this.routes[method]) {
            this.routes[method] = {};
        }
        this.routes[method][path] = handler as any;
    }

    public getHandler(method: string, path: string) {
        return this.routes[method]?.[path];
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
