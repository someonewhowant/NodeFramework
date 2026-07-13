import { Category, Course, CourseFactory } from './course.model';
import { Student, Teacher, UserFactory } from '../students/student.model';
import { DIContainer } from '../../../core/container';

export class CourseService {
    teachers: Teacher[] = [];
    students: Student[] = [];
    courses: Course[] = [];
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

    createUser(type: string, name: string) {
        return UserFactory.create(type, name);
    }
}

// Регистрируем синглтон в DI контейнере
DIContainer.getInstance().register('CourseService', new CourseService());
