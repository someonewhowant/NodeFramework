import { Controller, Inject } from '../../../core/decorators';
import { ListView, CreateView } from '../../../core/cbv';
import { SimbaRequest } from '../../../core/types';
import { MapperRegistry } from '../../database/mapper_registry';
import { UnitOfWork } from '../../../core/unit_of_work';
import { Student } from './student.model';
import { CourseService } from '../courses/course.service';

@Controller('/student-list')
export class StudentListController extends ListView {
    templateName = 'student_list.ejs';
    contextObjectName = 'objects_list';
    queryset = [];

    async getQueryset() {
        const mapper = MapperRegistry.getCurrentMapper('student');
        return await mapper.all();
    }

    async getContextData(req: SimbaRequest) {
        const ctx = await super.getContextData(req);
        ctx['title'] = 'Список студентов';
        return ctx;
    }
}

@Controller('/create-student')
export class CreateStudentController extends CreateView {
    templateName = 'create_student.ejs';

    constructor(@Inject('CourseService') private courseService: CourseService) {
        super();
    }

    async createObj(data: any) {
        const name = data.name;
        const newObj = this.courseService.createUser('student', name) as Student;
        
        newObj.markNew();
        
        const uow = UnitOfWork.getCurrent();
        uow.setMapperRegistry(MapperRegistry); // В будущем это тоже должно внедряться через DI
        await uow.commit();
    }

    async getContextData(req: SimbaRequest) {
        const ctx = await super.getContextData(req);
        ctx['title'] = 'Создать студента';
        return ctx;
    }
}
