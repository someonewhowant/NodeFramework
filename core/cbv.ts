import { SimbaRequest, SimbaResponse } from './types';
import { render } from './templator';
import { GetRoute, PostRoute } from './decorators';
import { Pagination } from './pagination';

/**
 * Базовый контроллер для простейшего рендеринга шаблонов
 */
export abstract class TemplateView {
    abstract templateName: string;

    async getContextData(req: SimbaRequest): Promise<Record<string, any>> {
        return {};
    }

    getTemplate(): string {
        return this.templateName;
    }

    async renderTemplateWithContext(req: SimbaRequest, res: SimbaResponse): Promise<void> {
        const templateName = this.getTemplate();
        const context = await this.getContextData(req);
        const html = await render(templateName, context);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
    }

    @GetRoute()
    async handleGet(req: SimbaRequest, res: SimbaResponse): Promise<void> {
        await this.renderTemplateWithContext(req, res);
    }
}

/**
 * Контроллер для отображения списков записей
 * @template T Тип элемента в списке
 */
export abstract class ListView<T = any> extends TemplateView {
    abstract queryset: T[];
    abstract contextObjectName: string;

    /**
     * Класс пагинации
     */
    paginationClass?: Pagination;

    async getQueryset(): Promise<T[]> {
        return this.queryset;
    }

    getContextObjectName(): string {
        return this.contextObjectName;
    }

    async getContextData(req: SimbaRequest): Promise<Record<string, any>> {
        const context = await super.getContextData(req);
        let items = await this.getQueryset();
        
        if (this.paginationClass) {
            const paginatedData = this.paginationClass.paginate(items, req);
            context[this.getContextObjectName()] = paginatedData.results;
            context['page_obj'] = paginatedData; // Передаём информацию о пагинации в шаблон
        } else {
            context[this.getContextObjectName()] = items;
        }
        
        return context;
    }
}

/**
 * Контроллер для создания записи
 * @template TPayload Тип DTO (данных из тела запроса)
 */
export abstract class CreateView<TPayload = any> extends TemplateView {

    getRequestData(req: SimbaRequest): TPayload {
        return req.body as TPayload;
    }

    abstract createObj(data: TPayload): Promise<void> | void;

    @PostRoute()
    async handlePost(req: SimbaRequest, res: SimbaResponse): Promise<void> {
        const data = this.getRequestData(req);
        // Критическое исправление: ожидаем завершения транзакции/асинхронного создания
        await this.createObj(data);
        await this.renderTemplateWithContext(req, res);
    }
}


export abstract class DetailView<T = any> extends TemplateView {
    abstract contextObjectName: string;

    /**
     * Имя URL-параметра, содержащего идентификатор записи.
     * По умолчанию 'id'. Переопределите для использования других ключей (например, 'slug').
     */
    pkUrlKwarg: string = 'id';

    /**
     * Загружает объект по идентификатору.
     * @param id Значение URL-параметра (всегда строка — приведение типа на стороне контроллера)
     */
    abstract getObject(id: string): Promise<T>;

    /**
     * Извлекает значение первичного ключа из URL-параметров запроса
     */
    protected getPk(req: SimbaRequest): string {
        const pk = req.params?.[this.pkUrlKwarg];
        if (pk === undefined || pk === '') {
            throw new Error(`400 Bad Request: Параметр '${this.pkUrlKwarg}' отсутствует в URL`);
        }
        return pk;
    }

    async getContextData(req: SimbaRequest): Promise<Record<string, any>> {
        const context = await super.getContextData(req);
        const pk = this.getPk(req);
        const obj = await this.getObject(pk);
        context[this.contextObjectName] = obj;
        return context;
    }
}

/**
 * Контроллер для обновления существующей записи.
 * 
 * - GET: отображает форму с текущими данными объекта (наследуется от DetailView)
 * - POST: обновляет объект и перерисовывает шаблон
 * 
 * Пример использования:
 * ```typescript
 * @Controller('/students/:id/edit')
 * export class StudentUpdate extends UpdateView<Student> {
 *     templateName = 'student_edit.ejs';
 *     contextObjectName = 'student';
 *     async getObject(id: string) { return mapper.findById(Number(id)); }
 *     async updateObject(student: Student, data: any) {
 *         student.name = data.name;
 *         student.markDirty();
 *         await UnitOfWork.getCurrent().commit();
 *     }
 * }
 * ```
 * 
 * @template T Тип доменного объекта
 * @template TPayload Тип данных из тела запроса (DTO)
 */
export abstract class UpdateView<T = any, TPayload = any> extends DetailView<T> {

    /**
     * URL для перенаправления после успешного обновления.
     * Если не задан — шаблон перерисовывается на месте.
     */
    successUrl?: string;

    getRequestData(req: SimbaRequest): TPayload {
        return req.body as TPayload;
    }

    /**
     * Обновляет объект данными из тела запроса.
     * @param obj Загруженный объект из getObject()
     * @param data Данные из тела запроса (DTO)
     */
    abstract updateObject(obj: T, data: TPayload): Promise<void> | void;

    /**
     * Вычисляет URL для перенаправления. Переопределите для динамических URL.
     */
    getSuccessUrl(): string | undefined {
        return this.successUrl;
    }

    @PostRoute()
    async handlePost(req: SimbaRequest, res: SimbaResponse): Promise<void> {
        const pk = this.getPk(req);
        const obj = await this.getObject(pk);
        const data = this.getRequestData(req);
        await this.updateObject(obj, data);

        const redirectUrl = this.getSuccessUrl();
        if (redirectUrl) {
            res.writeHead(302, { Location: redirectUrl });
            res.end();
        } else {
            // Перерисовываем шаблон с обновлёнными данными
            await this.renderTemplateWithContext(req, res);
        }
    }
}

/**
 * Контроллер для удаления записи с подтверждением.
 * 
 * - GET: отображает страницу подтверждения удаления (шаблон с данными объекта)
 * - POST: удаляет объект и перенаправляет на successUrl
 * 
 * Пример использования:
 * ```typescript
 * @Controller('/students/:id/delete')
 * export class StudentDelete extends DeleteView<Student> {
 *     templateName = 'student_confirm_delete.ejs';
 *     contextObjectName = 'student';
 *     successUrl = '/student-list/';
 *     async getObject(id: string) { return mapper.findById(Number(id)); }
 *     async deleteObject(student: Student) {
 *         student.markRemoved();
 *         await UnitOfWork.getCurrent().commit();
 *     }
 * }
 * ```
 * 
 * @template T Тип доменного объекта
 */
export abstract class DeleteView<T = any> extends DetailView<T> {
    /**
     * URL для перенаправления после успешного удаления (обязателен)
     */
    abstract successUrl: string;

    /**
     * Удаляет объект. Вызывается при POST-запросе.
     */
    abstract deleteObject(obj: T): Promise<void> | void;

    /**
     * Вычисляет URL для перенаправления. Переопределите для динамических URL.
     */
    getSuccessUrl(): string {
        return this.successUrl;
    }

    @PostRoute()
    async handlePost(req: SimbaRequest, res: SimbaResponse): Promise<void> {
        const pk = this.getPk(req);
        const obj = await this.getObject(pk);
        await this.deleteObject(obj);

        res.writeHead(302, { Location: this.getSuccessUrl() });
        res.end();
    }
}

/**
 * Контроллер для обработки произвольных форм с валидацией.
 * 
 * Реализует паттерн Post-Redirect-Get (PRG):
 * - GET: отображает пустую форму
 * - POST: валидирует данные → при ошибке перерисовывает форму с ошибками,
 *   при успехе вызывает formValid() и перенаправляет на successUrl
 * 
 * Пример использования:
 * ```typescript
 * @Controller('/contact')
 * export class ContactForm extends FormView<{ email: string; message: string }> {
 *     templateName = 'contact.ejs';
 *     successUrl = '/contact/success/';
 *     
 *     async validateForm(data) {
 *         if (!data.email) return { email: 'Обязательное поле' };
 *         return null;
 *     }
 *     
 *     async formValid(data) {
 *         await sendEmail(data.email, data.message);
 *     }
 * }
 * ```
 * 
 * @template TPayload Тип данных формы (DTO)
 */
export abstract class FormView<TPayload = any> extends TemplateView {
    /**
     * URL для перенаправления после успешной обработки формы
     */
    abstract successUrl: string;

    getRequestData(req: SimbaRequest): TPayload {
        return req.body as TPayload;
    }

    /**
     * Валидация данных формы.
     * @returns null если данные валидны, или объект ошибок { fieldName: 'сообщение' }
     */
    async validateForm(data: TPayload): Promise<Record<string, string> | null> {
        return null; // По умолчанию валидация отключена
    }

    /**
     * Вызывается когда данные формы прошли валидацию.
     * Здесь размещается бизнес-логика (сохранение, отправка и т.д.)
     */
    abstract formValid(data: TPayload): Promise<void> | void;

    /**
     * Вычисляет URL для перенаправления. Переопределите для динамических URL.
     */
    getSuccessUrl(): string {
        return this.successUrl;
    }

    @PostRoute()
    async handlePost(req: SimbaRequest, res: SimbaResponse): Promise<void> {
        const data = this.getRequestData(req);
        const errors = await this.validateForm(data);

        if (errors) {
            // Перерисовываем форму с ошибками и введёнными данными (422 Unprocessable Entity)
            const context = await this.getContextData(req);
            context['errors'] = errors;
            context['form_data'] = data;
            const html = await render(this.getTemplate(), context);
            res.writeHead(422, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
        }

        await this.formValid(data);
        res.writeHead(302, { Location: this.getSuccessUrl() });
        res.end();
    }
}
