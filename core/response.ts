import { SimbaResponse } from './types';

/**
 * Утилита для отправки JSON-ответов.
 * 
 * Избавляет контроллеры от ручного вызова writeHead/end и сериализации.
 * Автоматически устанавливает Content-Type и Content-Length.
 * 
 * @example
 * ```typescript
 * JsonResponse.send(res, { name: 'John' });           // 200
 * JsonResponse.created(res, { id: 1, name: 'John' }); // 201
 * JsonResponse.noContent(res);                         // 204
 * JsonResponse.error(res, 'Not found', 404);           // 404
 * ```
 */
export class JsonResponse {

    /**
     * Отправляет JSON-ответ с указанным статус-кодом
     */
    static send(res: SimbaResponse, data: any, statusCode: number = 200): void {
        const json = JSON.stringify(data);
        res.writeHead(statusCode, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(json)
        });
        res.end(json);
    }

    /**
     * 201 Created — для успешного создания ресурса
     */
    static created(res: SimbaResponse, data: any): void {
        this.send(res, data, 201);
    }

    /**
     * 204 No Content — для успешных операций без тела ответа (DELETE, PUT)
     */
    static noContent(res: SimbaResponse): void {
        res.writeHead(204);
        res.end();
    }

    /**
     * Отправляет JSON-ошибку с указанным статус-кодом
     */
    static error(res: SimbaResponse, message: string, statusCode: number = 400): void {
        this.send(res, { error: message }, statusCode);
    }

    /**
     * 404 Not Found
     */
    static notFound(res: SimbaResponse, message: string = 'Ресурс не найден'): void {
        this.error(res, message, 404);
    }

    /**
     * 422 Unprocessable Entity — ошибки валидации
     */
    static validationError(res: SimbaResponse, errors: Record<string, string>): void {
        this.send(res, { errors }, 422);
    }
}
