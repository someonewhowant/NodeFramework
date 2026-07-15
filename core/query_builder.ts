export interface IQueryRunner {
    all(sql: string, params: any[]): Promise<any[]>;
}

export class QueryBuilder<T> {
    private _tableName: string;
    private _whereConditions: { field: string, operator: string, value: any }[] = [];
    private _orderBy: { field: string, direction: 'ASC' | 'DESC' }[] = [];
    private _limit?: number;
    private _offset?: number;
    private _queryRunner: IQueryRunner;
    private _mapper: (row: any) => T;

    constructor(tableName: string, queryRunner: IQueryRunner, mapper: (row: any) => T) {
        this._tableName = tableName;
        this._queryRunner = queryRunner;
        this._mapper = mapper;
    }

    where(field: string, operator: string, value: any): this {
        this._whereConditions.push({ field, operator, value });
        return this;
    }

    orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
        this._orderBy.push({ field, direction });
        return this;
    }

    limit(limit: number): this {
        this._limit = limit;
        return this;
    }

    offset(offset: number): this {
        this._offset = offset;
        return this;
    }

    build(): { sql: string, params: any[] } {
        let sql = `SELECT * FROM ${this._tableName}`;
        const params: any[] = [];

        if (this._whereConditions.length > 0) {
            const conditions = this._whereConditions.map((cond) => {
                params.push(cond.value);
                return `${cond.field} ${cond.operator} ?`;
            });
            sql += ` WHERE ` + conditions.join(' AND ');
        }

        if (this._orderBy.length > 0) {
            const orders = this._orderBy.map(order => `${order.field} ${order.direction}`);
            sql += ` ORDER BY ` + orders.join(', ');
        }

        if (this._limit !== undefined) {
            sql += ` LIMIT ?`;
            params.push(this._limit);
        }

        if (this._offset !== undefined) {
            sql += ` OFFSET ?`;
            params.push(this._offset);
        }

        return { sql, params };
    }

    async execute(): Promise<T[]> {
        const { sql, params } = this.build();
        const rows = await this._queryRunner.all(sql, params);
        return rows.map(this._mapper);
    }
}

/**
 * Глобальный реестр для связи моделей с их QueryBuilder
 */
type ModelClass<T> = new (...args: any[]) => T;

export class QueryRegistry {
    private static _registry = new Map<ModelClass<any>, () => QueryBuilder<any>>();

    static register<T>(model: ModelClass<T>, factory: () => QueryBuilder<T>) {
        this._registry.set(model, factory);
    }

    static query<T>(model: ModelClass<T>): QueryBuilder<T> {
        const factory = this._registry.get(model);
        if (!factory) {
            throw new Error(`Модель ${model.name} не зарегистрирована в QueryRegistry`);
        }
        return factory();
    }
}

/**
 * Хелпер для удобного вызова
 */
export function query<T>(model: ModelClass<T>): QueryBuilder<T> {
    return QueryRegistry.query(model);
}
