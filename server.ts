import * as http from 'http';
import { Framework } from './core/framework';

// Важно: Импортируем controllers.ts, чтобы отработали декораторы!
import './app/controllers';

const app = new Framework();
const server = http.createServer(app.handleRequest.bind(app));

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Сервер (TS) запущен на порту ${PORT}`);
});
