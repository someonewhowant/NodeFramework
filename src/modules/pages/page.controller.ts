import { Controller, GetRoute } from '../../../core/decorators';
import { render } from '../../../core/templator';
import { SimbaRequest, SimbaResponse } from '../../../core/types';

@Controller()
export class PagesController {
    @GetRoute('/')
    async index(req: SimbaRequest, res: SimbaResponse) {
        const html = await render('index.ejs', { 
            title: 'Обучение программированию',
            data: new Date().toLocaleDateString('ru-RU')
        });
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
    }

    @GetRoute('/about/')
    async about(req: SimbaRequest, res: SimbaResponse) {
        const html = await render('about.ejs', { title: 'О нас' });
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
    }
}
