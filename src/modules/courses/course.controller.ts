import { Controller, Inject } from '../../../core/decorators';
import { ListView, CreateView } from '../../../core/cbv';
import { SimbaRequest } from '../../../core/types';
import { CourseService } from './course.service';

@Controller('/category-list')
export class CategoryListController extends ListView {
    templateName = 'category_list.ejs';
    contextObjectName = 'objects_list';
    
    // Внедрение зависимости через конструктор (DI)
    constructor(@Inject('CourseService') private courseService: CourseService) {
        super();
    }

    get queryset() {
        return this.courseService.categories;
    }

    async getQueryset() {
        return this.courseService.categories;
    }

    async getContextData(req: SimbaRequest) {
        const ctx = await super.getContextData(req);
        ctx['title'] = 'Список категорий';
        return ctx;
    }
}

@Controller('/create-category')
export class CreateCategoryController extends CreateView {
    templateName = 'create_category.ejs';

    constructor(@Inject('CourseService') private courseService: CourseService) {
        super();
    }

    createObj(data: any) {
        const name = data.name;
        const categoryId = data.category_id;
        let parent = categoryId ? this.courseService.findCategoryById(Number(categoryId)) : undefined;
        
        const newCat = this.courseService.createCategory(name, parent);
        this.courseService.categories.push(newCat);
    }

    async getContextData(req: SimbaRequest) {
        const ctx = await super.getContextData(req);
        ctx['categories'] = this.courseService.categories;
        ctx['title'] = 'Создать категорию';
        return ctx;
    }
}
