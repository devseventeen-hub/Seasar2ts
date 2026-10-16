import { Database } from "@seasar2ts/core";
import { User } from "../entity/User";
export declare class UserDao {
    private db;
    constructor(db: Database);
    find(id: number): Promise<User>;
    findAll(): Promise<User[]>;
    update(user: User): Promise<number>;
    selectById(id: number): Promise<User>;
    selectByExample(condition: User): Promise<User[]>;
}
//# sourceMappingURL=UserDao.d.ts.map