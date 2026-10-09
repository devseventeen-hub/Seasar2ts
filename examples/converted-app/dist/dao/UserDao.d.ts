import { Database } from "@seasar2ts/core";
import { User } from "../entity/User";
export declare class UserDao {
    private db;
    constructor(db: Database);
    find(id: number): Promise<User>;
    findAll(): Promise<User[]>;
    update(user: User): Promise<number>;
}
//# sourceMappingURL=UserDao.d.ts.map