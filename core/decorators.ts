/**
 * Глобальный словарь маршрутов
 */
export const routes: Record<string, Record<string, any>> = {
    'GET': {},
    'POST': {},
    'PUT': {},
    'DELETE': {}
};

/**
 * Декоратор для привязки контроллера к маршруту (Аналог AppRoute из Урока 5)
 * @param url Путь, например '/about/'
 * @param method HTTP Метод
 */
export function AppRoute(url: string, method: string = 'GET') {
    return function (constructor: Function) {
        if (!routes[method]) {
            routes[method] = {};
        }
        
        // Создаем экземпляр класса-контроллера
        const instance = new (constructor as any)();
        
        // Регистрируем его метод handle в словаре маршрутов
        routes[method][url] = instance.handle.bind(instance);
    };
}
