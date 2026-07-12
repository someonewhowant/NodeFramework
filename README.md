# SimbaFramework 🦁

**SimbaFramework** — это легковесный, модульный и современный веб-фреймворк на Node.js и TypeScript, построенный с использованием паттернов проектирования Enterprise-уровня. 

Фреймворк был создан в рамках глубокого рефакторинга учебного проекта (перенос с Python/WSGI) и теперь реализует архитектурные стандарты, аналогичные **NestJS** и **Django**.

## 🚀 Особенности

- **Декораторы и Метаданные (`reflect-metadata`)**: Роутинг через `@Controller()`, `@GetRoute()` и `@PostRoute()`.
- **Domain-Driven Design (DDD)**: Строгое разделение бизнес-логики на независимые модули (`src/modules/*`).
- **Class-Based Views (CBV)**: Готовые абстрактные классы `ListView` и `CreateView` для минимизации дублирования кода.
- **Unit Of Work & Data Mapper**: Транзакционная изоляция запросов с использованием `AsyncLocalStorage` и СУБД SQLite.
- **Встроенная статика и шаблонизатор**: Интеграция с `EJS` и раздача статических файлов (`.css`, `.js`, `.png`) напрямую из ядра.
- **Защита от переполнения (OOM)**: Асинхронный парсер запросов с лимитом размера тела (Payload Size Limit) и интеллектуальной поддержкой `application/json` и `application/x-www-form-urlencoded`.

## 📁 Структура проекта

Проект логически разделен на две основные части: **Ядро (Framework)** и **Бизнес-логика (App)**.

```text
simbaframework/
├── core/                     # Ядро фреймворка (полностью абстрагировано)
│   ├── cbv.ts                # Class-Based Views (TemplateView, ListView, CreateView)
│   ├── decorators.ts         # Механизм маршрутизации и RouterRegistry
│   ├── framework.ts          # Главный класс приложения и обработка HTTP-запросов
│   ├── request_parser.ts     # Безопасный парсинг параметров запроса
│   ├── settings.ts           # Управление конфигурацией фреймворка по умолчанию
│   ├── templator.ts          # Обертка над шаблонизатором EJS
│   ├── types.ts              # Строгие TypeScript-интерфейсы
│   └── unit_of_work.ts       # Паттерн транзакций с использованием AsyncLocalStorage
│
├── src/                      # Бизнес-логика приложения (Написана в стиле DDD)
│   ├── database/             # Настройки подключения к SQLite и реестр мапперов
│   ├── modules/              # Предметные области (модули)
│   │   ├── courses/          # Контроллеры, модели и сервисы курсов
│   │   ├── pages/            # Статические страницы
│   │   └── students/         # Студенты (включает Data Mapper к БД)
│   └── views/                # HTML шаблоны EJS
│
├── staticfiles/              # Общедоступные статические ассеты (CSS)
├── server.ts                 # Точка входа в приложение (Bootstrap конфигурация)
└── package.json
```

## 🛠 Установка и запуск

1. Установите зависимости (включая SQLite и `reflect-metadata`):
   ```bash
   npm install
   ```

2. Запустите сервер для разработки (используется `ts-node`):
   ```bash
   npm start
   ```

3. Откройте браузер по адресу: [http://localhost:8080/](http://localhost:8080/)

## 📖 Документация (Примеры использования)

### 1. Создание Контроллеров (Роутинг)
Используйте декораторы для автоматической регистрации маршрутов в глобальном реестре (RouterRegistry).

```typescript
import { Controller, GetRoute } from '../../core/decorators';
import { SimbaRequest, SimbaResponse } from '../../core/types';

@Controller('/pages')
export class PagesController {
    
    @GetRoute('/about/')
    async about(req: SimbaRequest, res: SimbaResponse) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('О нашей платформе');
    }
}
```

### 2. Class-Based Views (CBV)
Вместо написания рутинного кода для вывода списков или создания сущностей, наследуйтесь от абстрактных классов `ListView` или `CreateView`:

```typescript
import { Controller } from '../../core/decorators';
import { ListView } from '../../core/cbv';
import { MapperRegistry } from '../../database/mapper_registry';

@Controller('/student-list')
export class StudentListController extends ListView {
    templateName = 'student_list.ejs';
    contextObjectName = 'objects_list';

    // Этот метод будет вызван автоматически перед рендерингом шаблона
    async getQueryset() {
        const mapper = MapperRegistry.getCurrentMapper('student');
        return await mapper.all();
    }
}
```

### 3. Работа с Базой Данных (Unit of Work)
Паттерн **UnitOfWork** оборачивает каждый HTTP-запрос в независимую "транзакцию" с использованием `AsyncLocalStorage`, гарантируя потокобезопасность в асинхронной среде Node.js (аналог `threading.local()` в Python).

Сущности должны наследоваться от `DomainObject`, чтобы уметь помечать себя как "новые" или "измененные".

```typescript
import { UnitOfWork } from '../../core/unit_of_work';

// 1. Создаем бизнес-объект и помечаем его как новый
const student = new Student('John Doe');
student.markNew(); 

// 2. Получаем текущую транзакцию для HTTP-запроса
const uow = UnitOfWork.getCurrent();

// 3. Выполняем коммит (сохранение в БД)
uow.setMapperRegistry(MapperRegistry);
await uow.commit(); 
```

## 📜 Лицензия
Проект имеет образовательный характер. MIT License.
