import { Student } from './student.model';
import { db, run, all, get } from '../../database/connection';

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS student (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, 
        name VARCHAR(32)
    )`);
});

export class StudentMapper {
    tablename = 'student';

    async all(): Promise<Student[]> {
        const rows = await all(`SELECT * FROM ${this.tablename}`);
        return rows.map((row: any) => {
            const student = new Student(row.name);
            student.id = row.id;
            return student;
        });
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
