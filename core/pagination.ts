import { SimbaRequest } from './types';

export interface PaginatedResult<T> {
    count: number;
    next?: string | null;
    previous?: string | null;
    results: T[];
}

export abstract class Pagination {
    /**
     * Выполняет пагинацию набора данных.
     * В будущем, когда будет реализован QueryBuilder (B3), queryset может стать объектом запроса.
     * Пока что он принимает массив данных.
     */
    abstract paginate<T>(queryset: T[], req: SimbaRequest): PaginatedResult<T>;
}

/**
 * Пагинация по номерам страниц (page=1&page_size=20)
 */
export class PageNumberPagination extends Pagination {
    constructor(
        public defaultPageSize: number = 20,
        public pageQueryParam: string = 'page',
        public pageSizeQueryParam: string = 'page_size'
    ) {
        super();
    }

    paginate<T>(queryset: T[], req: SimbaRequest): PaginatedResult<T> {
        let page = 1;
        if (req.query && req.query[this.pageQueryParam]) {
            page = parseInt(req.query[this.pageQueryParam], 10) || 1;
        }

        let pageSize = this.defaultPageSize;
        if (req.query && req.query[this.pageSizeQueryParam]) {
            pageSize = parseInt(req.query[this.pageSizeQueryParam], 10) || this.defaultPageSize;
        }

        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 1;

        const count = queryset.length;
        const offset = (page - 1) * pageSize;
        const results = queryset.slice(offset, offset + pageSize);

        let next = null;
        let previous = null;

        if (offset + pageSize < count) {
            next = `?${this.pageQueryParam}=${page + 1}&${this.pageSizeQueryParam}=${pageSize}`;
        }
        if (page > 1) {
            previous = `?${this.pageQueryParam}=${page - 1}&${this.pageSizeQueryParam}=${pageSize}`;
        }

        return {
            count,
            next,
            previous,
            results
        };
    }
}

/**
 * Курсорная пагинация для бесконечного скролла
 * Использует base64-закодированный payload для хранения позиции
 */
export class CursorPagination extends Pagination {
    constructor(
        public defaultPageSize: number = 20,
        public cursorQueryParam: string = 'cursor'
    ) {
        super();
    }

    paginate<T>(queryset: T[], req: SimbaRequest): PaginatedResult<T> {
        let offset = 0;
        const cursor = req.query?.[this.cursorQueryParam];

        if (cursor) {
            try {
                const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
                const parsed = JSON.parse(decoded);
                if (parsed && typeof parsed.offset === 'number') {
                    offset = parsed.offset;
                }
            } catch (e) {
                // Игнорируем некорректный курсор, начинаем с нуля
            }
        }

        const pageSize = this.defaultPageSize;
        const count = queryset.length;
        const results = queryset.slice(offset, offset + pageSize);

        let nextCursor = null;
        if (offset + pageSize < count) {
            const nextPayload = JSON.stringify({ offset: offset + pageSize });
            nextCursor = `?${this.cursorQueryParam}=${Buffer.from(nextPayload).toString('base64url')}`;
        }

        return {
            count,
            next: nextCursor,
            previous: null, // Курсорная пагинация обычно движется только вперёд
            results
        };
    }
}
