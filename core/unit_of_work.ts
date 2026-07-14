import { AsyncLocalStorage } from 'async_hooks';
import { IMapperRegistry, ITransactionManager } from './types';

export class UnitOfWork {
    static asyncLocalStorage = new AsyncLocalStorage<UnitOfWork>();
    static transactionManager?: ITransactionManager;

    newObjects: any[] = [];
    dirtyObjects: any[] = [];
    removedObjects: any[] = [];
    
    // Теперь это строго типизированный реестр!
    mapperRegistry?: IMapperRegistry;

    setMapperRegistry(registry: IMapperRegistry) {
        this.mapperRegistry = registry;
    }

    registerNew(obj: any) {
        this.newObjects.push(obj);
    }

    registerDirty(obj: any) {
        this.dirtyObjects.push(obj);
    }

    registerRemoved(obj: any) {
        this.removedObjects.push(obj);
    }

    async commit() {
        if (!this.mapperRegistry) {
            throw new Error('MapperRegistry not set for UnitOfWork');
        }
        
        try {
            if (UnitOfWork.transactionManager) {
                await UnitOfWork.transactionManager.begin();
            }

            await this.insertNew();
            await this.updateDirty();
            await this.deleteRemoved();
            
            if (UnitOfWork.transactionManager) {
                await UnitOfWork.transactionManager.commit();
            }

            this.clear();
        } catch (err) {
            if (UnitOfWork.transactionManager) {
                try {
                    await UnitOfWork.transactionManager.rollback();
                } catch (rollbackErr) {
                    // Игнорируем ошибку отката (например, если транзакция не была начата)
                }
            }
            this.clear();
            throw err;
        }
    }

    async rollback() {
        if (UnitOfWork.transactionManager) {
            try {
                await UnitOfWork.transactionManager.rollback();
            } catch (e) {
                // Игнорируем ошибку отката
            }
        }
        this.clear();
    }

    private clear() {
        this.newObjects = [];
        this.dirtyObjects = [];
        this.removedObjects = [];
    }

    async insertNew() {
        for (const obj of this.newObjects) {
            await this.mapperRegistry!.getMapper(obj).insert(obj);
        }
    }

    async updateDirty() {
        for (const obj of this.dirtyObjects) {
            await this.mapperRegistry!.getMapper(obj).update(obj);
        }
    }

    async deleteRemoved() {
        for (const obj of this.removedObjects) {
            await this.mapperRegistry!.getMapper(obj).delete(obj);
        }
    }

    static getCurrent(): UnitOfWork {
        const uow = this.asyncLocalStorage.getStore();
        if (!uow) {
            throw new Error('UnitOfWork is not defined in the current async context. Did you wrap your handler in asyncLocalStorage.run?');
        }
        return uow;
    }
}

export class DomainObject {
    markNew() {
        UnitOfWork.getCurrent().registerNew(this);
    }

    markDirty() {
        UnitOfWork.getCurrent().registerDirty(this);
    }

    markRemoved() {
        UnitOfWork.getCurrent().registerRemoved(this);
    }
}
