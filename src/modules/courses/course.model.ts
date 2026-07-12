export class Category {
    static auto_id = 0;
    id: number;
    name: string;
    parentCategory?: Category;
    courses: Course[];

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
    static types: Record<string, new (name: string, category: Category) => Course> = {
        'interactive': InteractiveCourse,
        'record': RecordCourse
    };
    static create(type: string, name: string, category: Category): Course {
        return new this.types[type](name, category);
    }
}
