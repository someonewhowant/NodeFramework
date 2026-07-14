import { IncomingMessage, ServerResponse } from 'http';

export interface SimbaRequest extends IncomingMessage {
    query?: Record<string, string>;
    body?: any;
    params?: Record<string, string>;
    path?: string;
    user?: any;
}

export interface SimbaResponse extends ServerResponse {}

/**
 * Результат поиска маршрута в RouterRegistry
 */
export interface RouteMatch {
    handler: (req: SimbaRequest, res: SimbaResponse) => any;
    params: Record<string, string>;
}

export interface FrameworkConfig {
    port?: number;
    staticUrl?: string;
    staticDir?: string;
    viewsDir?: string;
}

export interface IMapper<T = any> {
    insert(obj: T): Promise<void>;
    update(obj: T): Promise<void>;
    delete(obj: T): Promise<void>;
    all?(): Promise<T[]>;
    findById?(id: number): Promise<T>;
}

export interface IMapperRegistry {
    getMapper(obj: any): IMapper;
    getCurrentMapper?(name: string): IMapper;
}

export interface ITransactionManager {
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
