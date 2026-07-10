import * as querystring from 'querystring';

export const parseGetRequest = (req: any) => {
    const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    return Object.fromEntries(parsedUrl.searchParams.entries());
};

export const parseBody = (req: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            if (body) {
                const postData = querystring.parse(body);
                resolve(postData);
            } else {
                resolve({});
            }
        });
        req.on('error', (err: Error) => {
            reject(err);
        });
    });
};
