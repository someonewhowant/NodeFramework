import { Student } from './student.model';
import { db, run, all, get } from '../../database/connection';
import { QueryBuilder, QueryRegistry } from '../../../core/query_builder';

// Регистрация фабрики QueryBuilder для модели Student
QueryRegistry.register(Student, () => {
    return new QueryBuilder<Student>('student', { all }, (row: any) => {
        const student = new Student(row.name);
        student.id = row.id;
        return student;
    });
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS student (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, 
        name VARCHAR(32)
    )`);
});

export class StudentMapper {
    tablename = 'student';

    query(): QueryBuilder<Student> {
        return QueryRegistry.query(Student);
    }

    async all(): Promise<Student[]> {
        return this.query().execute();
    }

    async findById(id: number): Promise<Student> {
        const row = await get(`SELECT id, name FROM ${this.tablename} WHERE id=?`, [id]);
        if (row) {
            const student = new Student(row.name);
            student.id = row.id;
            return student;
        } else {
            throw new Error(`Record with id=${id} not found`);
        }
    }

    async insert(obj: Student): Promise<void> {
        const result = await run(`INSERT INTO ${this.tablename} (name) VALUES (?)`, [obj.name]);
        obj.id = result.lastID;
    }

    async update(obj: Student): Promise<void> {
        await run(`UPDATE ${this.tablename} SET name=? WHERE id=?`, [obj.name, obj.id]);
    }

    async delete(obj: Student): Promise<void> {
        await run(`DELETE FROM ${this.tablename} WHERE id=?`, [obj.id]);
    }
}
