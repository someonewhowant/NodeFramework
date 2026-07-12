import { Controller } from '../../../core/decorators';
import { ListView, CreateView } from '../../../core/cbv';
import { SimbaRequest } from '../../../core/types';
import { site } from './course.service';

@Controller('/category-list')
export class CategoryListController extends ListView {
    templateName = 'category_list.ejs';
    contextObjectName = 'objects_list';
    queryset = site.categories;

    async getQueryset() {
        return site.categories;
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

    createObj(data: any) {
        const name = data.name;
        const categoryId = data.category_id;
        let parent = categoryId ? site.findCategoryById(Number(categoryId)) : undefined;
        
        const newCat = site.createCategory(name, parent);
        site.categories.push(newCat);
    }

    async getContextData(req: SimbaRequest) {
        const ctx = await super.getContextData(req);
        ctx['categories'] = site.categories;
        ctx['title'] = 'Создать категорию';
        return ctx;
    }
}
