import { Student } from '../modules/students/student.model';
import { StudentMapper } from '../modules/students/student.mapper';
import { IMapperRegistry, IMapper } from '../../core/types';

const mappers: Record<string, IMapper> = {
    'student': new StudentMapper()
};

// Экспортируем объект, строго реализующий контракт интерфейса
export const MapperRegistry: IMapperRegistry = {
    getMapper(obj: any): IMapper {
        if (obj instanceof Student) {
            return mappers['student'];
        }
        throw new Error('Mapper not found for object');
    },
    
    getCurrentMapper(name: string): IMapper {
        return mappers[name];
    }
};
