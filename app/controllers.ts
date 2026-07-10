import { AppRoute } from '../core/decorators';
import { render } from '../core/templator';
import { site } from './models';

@AppRoute('/', 'GET')
export class Index {
    async handle(req: any, res: any) {
        try {
            const html = await render('index.ejs', { 
                title: 'Обучение программированию',
                data: new Date().toLocaleDateString('ru-RU')
            });
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
        } catch (err) {
            res.writeHead(500); res.end('Template Error');
        }
    }
}

@AppRoute('/about/', 'GET')
export class About {
    async handle(req: any, res: any) {
        try {
            const html = await render('about.ejs', { title: 'О нас' });
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
        } catch (err) {
            res.writeHead(500); res.end('Template Error');
        }
    }
}

// Пример использования Движка и Моделей
@AppRoute('/category-list/', 'GET')
export class CategoryList {
    async handle(req: any, res: any) {
        // Мы используем categories из объекта site
        const html = await render('category_list.ejs', { 
            objects_list: site.categories,
            title: 'Список категорий'
        });
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
    }
}

@AppRoute('/create-category/', 'GET')
@AppRoute('/create-category/', 'POST')
export class CreateCategory {
    async handle(req: any, res: any) {
        if (req.method === 'POST') {
            const name = req.body.name;
            const categoryId = req.body.category_id;
            let parent = categoryId ? site.findCategoryById(Number(categoryId)) : undefined;
            const newCat = site.createCategory(name, parent);
            site.categories.push(newCat);
            
            res.writeHead(302, { 'Location': '/category-list/' });
            res.end();
        } else {
            const html = await render('create_category.ejs', { 
                categories: site.categories,
                title: 'Создать категорию'
            });
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
        }
    }
}
