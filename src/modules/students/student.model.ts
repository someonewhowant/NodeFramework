import { DomainObject } from '../../../core/unit_of_work';

export class User extends DomainObject {
    id?: number;
    constructor(public name: string) {
        super();
    }
}

export class Student extends User {}
export class Teacher extends User {}

export class UserFactory {
    static types: Record<string, new (name: string) => User> = {
        'student': Student,
        'teacher': Teacher
    };
    static create(type: string, name: string): User {
        return new this.types[type](name);
    }
}
