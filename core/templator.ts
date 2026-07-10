import * as ejs from 'ejs';
import * as path from 'path';

export const render = (templateName: string, context: any = {}): Promise<string> => {
    const templatePath = path.join(__dirname, '../app/templates', templateName);
    
    return new Promise((resolve, reject) => {
        ejs.renderFile(templatePath, context, (err, str) => {
            if (err) {
                return reject(err);
            }
            resolve(str);
        });
    });
};
