export class User {}
export class Teacher extends User {}
export class Student extends User {}

export class UserFactory {
    static types: Record<string, any> = {
        'student': Student,
        'teacher': Teacher
    };
    static create(type: string) {
        return new this.types[type]();
    }
}

export class Category {
    static auto_id = 0;
    id: number;
    name: string;
    parentCategory?: Category;
    courses: any[];

    constructor(name: string, parentCategory?: Category) {
        this.id = Category.auto_id++;
        this.name = name;
        this.parentCategory = parentCategory;
        this.courses = [];
    }

    courseCount(): number {
        let result = this.courses.length;
        if (this.parentCategory) {
            result += this.parentCategory.courseCount();
        }
        return result;
    }
}

export class Course {
    constructor(public name: string, public category: Category) {}
}
export class InteractiveCourse extends Course {}
export class RecordCourse extends Course {}

export class CourseFactory {
    static types: Record<string, any> = {
        'interactive': InteractiveCourse,
        'record': RecordCourse
    };
    static create(type: string, name: string, category: Category) {
        return new this.types[type](name, category);
    }
}

// Класс-Движок для управления состоянием в памяти
export class Engine {
    teachers: any[] = [];
    students: any[] = [];
    courses: any[] = [];
    categories: Category[] = [];

    createCategory(name: string, category?: Category) {
        return new Category(name, category);
    }

    findCategoryById(id: number) {
        const item = this.categories.find(c => c.id === id);
        if (!item) throw new Error(`Нет категории с id = ${id}`);
        return item;
    }

    createCourse(type: string, name: string, category: Category) {
        return CourseFactory.create(type, name, category);
    }
}

// Экспортируем единственный экземпляр Движка (Singleton)
export const site = new Engine();
