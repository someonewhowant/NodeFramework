import { SimbaRequest, SimbaResponse } from './types';
import { render } from './templator';
import { GetRoute, PostRoute } from './decorators';

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

    async getQueryset(): Promise<T[]> {
        return this.queryset;
    }

    getContextObjectName(): string {
        return this.contextObjectName;
    }

    async getContextData(req: SimbaRequest): Promise<Record<string, any>> {
        const context = await super.getContextData(req);
        context[this.getContextObjectName()] = await this.getQueryset();
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
