import { AsyncLocalStorage } from 'async_hooks';
import { IMapperRegistry } from './types';

export class UnitOfWork {
    static asyncLocalStorage = new AsyncLocalStorage<UnitOfWork>();

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
        await this.insertNew();
        await this.updateDirty();
        await this.deleteRemoved();
        
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
