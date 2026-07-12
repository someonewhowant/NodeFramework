/**
 * Инверсия управления (IoC) — DI-контейнер.
 * Управляет созданием экземпляров сервисов и контроллеров.
 */
export class DIContainer {
    private static instance: DIContainer;
    
    // Хранилище синглтонов
    private services = new Map<string | symbol, any>();
    // Хранилище фабрик (для создания новых инстансов при каждом запросе)
    private factories = new Map<string | symbol, () => any>();
    
    private constructor() {}

    static getInstance(): DIContainer {
        if (!DIContainer.instance) {
            DIContainer.instance = new DIContainer();
        }
        return DIContainer.instance;
    }
    
    /**
     * Регистрация singleton-сервиса (один инстанс на всё приложение)
     */
    register<T>(token: string | symbol, instance: T): void {
        this.services.set(token, instance);
    }
    
    /**
     * Регистрация transient-сервиса (новая копия через фабрику)
     */
    registerFactory<T>(token: string | symbol, factory: () => T): void {
        this.factories.set(token, factory);
    }
    
    /**
     * Получение зависимости по токену
     */
    resolve<T>(token: string | symbol): T {
        if (this.services.has(token)) {
            return this.services.get(token);
        }
        if (this.factories.has(token)) {
            return this.factories.get(token)!();
        }
        throw new Error(`[DIContainer] Сервис '${String(token)}' не зарегистрирован`);
    }
}
