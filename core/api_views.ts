import { SimbaRequest, SimbaResponse } from './types';
import { GetRoute, PostRoute, PutRoute, DeleteRoute } from './decorators';
import { JsonResponse } from './response';

/**
 * Базовый класс для API-контроллеров (без шаблонов).
 * 
 * В отличие от TemplateView, не рендерит HTML — все ответы в формате JSON.
 * Предоставляет общие утилиты для API-контроллеров.
 */
export abstract class APIView {

    /**
     * Имя URL-параметра с идентификатором записи.
     * По умолчанию 'id'.
     */
    pkUrlKwarg: string = 'id';

    /**
     * Извлекает значение первичного ключа из URL-параметров
     */
    protected getPk(req: SimbaRequest): string {
        const pk = req.params?.[this.pkUrlKwarg];
        if (pk === undefined || pk === '') {
            throw new Error(`400 Bad Request: Параметр '${this.pkUrlKwarg}' отсутствует в URL`);
        }
        return pk;
    }
}

/**
 * API-контроллер для получения списка записей.
 * 
 * GET → возвращает JSON-массив объектов.
 * 
 * @example
 * ```typescript
 * @Controller('/api/students')
 * export class StudentAPI extends APIListView<Student> {
 *     async getQueryset() {
 *         return await mapper.all();
 *     }
 *     serialize(items: Student[]) {
 *         return items.map(s => ({ id: s.id, name: s.name }));
 *     }
 * }
 * ```
 * 
 * @template T Тип доменного объекта
 */
export abstract class APIListView<T = any> extends APIView {

    /**
     * Загружает список объектов из источника данных
     */
    abstract getQueryset(): Promise<T[]>;

    /**
     * Сериализует массив объектов в формат, пригодный для JSON.
     * Переопределите для контроля структуры ответа (выбор полей, вложенные связи).
     * По умолчанию возвращает объекты как есть.
     */
    serialize(items: T[]): any[] {
        return items as any[];
    }

    @GetRoute()
    async handleGet(req: SimbaRequest, res: SimbaResponse): Promise<void> {
        const items = await this.getQueryset();
        JsonResponse.send(res, this.serialize(items));
    }
}

/**
 * API-контроллер для создания записи.
 * 
 * POST → создаёт объект и возвращает 201 Created с данными.
 * 
 * @example
 * ```typescript
 * @Controller('/api/students')
 * export class StudentCreateAPI extends APICreateView<{ name: string }> {
 *     async createObject(data) {
 *         const student = new Student(data.name);
 *         student.markNew();
 *         const uow = UnitOfWork.getCurrent();
 *         uow.setMapperRegistry(MapperRegistry);
 *         await uow.commit();
 *         return { id: student.id, name: student.name };
 *     }
 * }
 * ```
 * 
 * @template TPayload Тип входных данных (DTO)
 */
export abstract class APICreateView<TPayload = any> extends APIView {

    /**
     * Валидация входных данных.
     * @returns null если данные валидны, или объект ошибок
     */
    async validate(data: TPayload): Promise<Record<string, string> | null> {
        return null;
    }

    /**
     * Создаёт объект и возвращает его представление для ответа.
     * @returns Объект, который будет сериализован в JSON и отправлен с кодом 201
     */
    abstract createObject(data: TPayload): Promise<any>;

    @PostRoute()
    async handlePost(req: SimbaRequest, res: SimbaResponse): Promise<void> {
        const data = req.body as TPayload;

        const errors = await this.validate(data);
        if (errors) {
            JsonResponse.validationError(res, errors);
            return;
        }

        const created = await this.createObject(data);
        JsonResponse.created(res, created);
    }
}

/**
 * API-контроллер для получения одной записи по ID.
 * 
 * GET /:id/ → возвращает JSON-объект.
 * 
 * @example
 * ```typescript
 * @Controller('/api/students/:id')
 * export class StudentDetailAPI extends APIDetailView<Student> {
 *     async getObject(id: string) {
 *         return await mapper.findById(Number(id));
 *     }
 *     serialize(student: Student) {
 *         return { id: student.id, name: student.name };
 *     }
 * }
 * ```
 * 
 * @template T Тип доменного объекта
 */
export abstract class APIDetailView<T = any> extends APIView {

    /**
     * Загружает объект по идентификатору
     */
    abstract getObject(id: string): Promise<T>;

    /**
     * Сериализует объект в формат для JSON-ответа.
     * По умолчанию возвращает объект как есть.
     */
    serialize(obj: T): any {
        return obj;
    }

    @GetRoute()
    async handleGet(req: SimbaRequest, res: SimbaResponse): Promise<void> {
        const pk = this.getPk(req);

        try {
            const obj = await this.getObject(pk);
            JsonResponse.send(res, this.serialize(obj));
        } catch (err: any) {
            JsonResponse.notFound(res, err.message || 'Запись не найдена');
        }
    }
}

/**
 * API-контроллер для обновления записи.
 * 
 * POST /:id/ → обновляет объект и возвращает обновлённые данные (или 204).
 * 
 * @example
 * ```typescript
 * @Controller('/api/students/:id/update')
 * export class StudentUpdateAPI extends APIUpdateView<Student> {
 *     async getObject(id: string) { return await mapper.findById(Number(id)); }
 *     async updateObject(student: Student, data: any) {
 *         student.name = data.name;
 *         student.markDirty();
 *         await UnitOfWork.getCurrent().commit();
 *     }
 *     serialize(student: Student) { return { id: student.id, name: student.name }; }
 * }
 * ```
 * 
 * @template T Тип доменного объекта
 * @template TPayload Тип входных данных (DTO)
 */
export abstract class APIUpdateView<T = any, TPayload = any> extends APIView {

    /**
     * Загружает объект по идентификатору
     */
    abstract getObject(id: string): Promise<T>;

    /**
     * Валидация входных данных обновления
     */
    async validate(data: TPayload): Promise<Record<string, string> | null> {
        return null;
    }

    /**
     * Обновляет объект данными из тела запроса
     */
    abstract updateObject(obj: T, data: TPayload): Promise<void> | void;

    /**
     * Сериализует обновлённый объект для ответа.
     * Если возвращает null — отправляется 204 No Content.
     */
    serialize(obj: T): any | null {
        return obj;
    }

    @PostRoute()
    async handlePost(req: SimbaRequest, res: SimbaResponse): Promise<void> {
        const pk = this.getPk(req);
        const data = req.body as TPayload;

        const errors = await this.validate(data);
        if (errors) {
            JsonResponse.validationError(res, errors);
            return;
        }

        try {
            const obj = await this.getObject(pk);
            await this.updateObject(obj, data);

            const serialized = this.serialize(obj);
            if (serialized === null) {
                JsonResponse.noContent(res);
            } else {
                JsonResponse.send(res, serialized);
            }
        } catch (err: any) {
            JsonResponse.notFound(res, err.message || 'Запись не найдена');
        }
    }
}

/**
 * API-контроллер для удаления записи.
 * 
 * POST /:id/ → удаляет объект и возвращает 204 No Content.
 * 
 * @example
 * ```typescript
 * @Controller('/api/students/:id/delete')
 * export class StudentDeleteAPI extends APIDeleteView<Student> {
 *     async getObject(id: string) { return await mapper.findById(Number(id)); }
 *     async deleteObject(student: Student) {
 *         student.markRemoved();
 *         await UnitOfWork.getCurrent().commit();
 *     }
 * }
 * ```
 * 
 * @template T Тип доменного объекта
 */
export abstract class APIDeleteView<T = any> extends APIView {

    /**
     * Загружает объект по идентификатору
     */
    abstract getObject(id: string): Promise<T>;

    /**
     * Удаляет объект
     */
    abstract deleteObject(obj: T): Promise<void> | void;

    @PostRoute()
    async handlePost(req: SimbaRequest, res: SimbaResponse): Promise<void> {
        const pk = this.getPk(req);

        try {
            const obj = await this.getObject(pk);
            await this.deleteObject(obj);
            JsonResponse.noContent(res);
        } catch (err: any) {
            JsonResponse.notFound(res, err.message || 'Запись не найдена');
        }
    }
}
