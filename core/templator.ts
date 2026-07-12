import * as ejs from 'ejs';
import * as path from 'path';
import { FrameworkSettings } from './settings';

export const render = (templateName: string, context: Record<string, any> = {}): Promise<string> => {
    const templatePath = path.join(FrameworkSettings.VIEWS_DIR, templateName);
    
    // Подмешиваем переменную static во все шаблоны глобально (читая из настроек)
    const finalContext = { ...context, static: FrameworkSettings.STATIC_URL };
    
    return new Promise((resolve, reject) => {
        ejs.renderFile(templatePath, finalContext, (err, str) => {
            if (err) {
                return reject(err);
            }
            resolve(str);
        });
    });
};
