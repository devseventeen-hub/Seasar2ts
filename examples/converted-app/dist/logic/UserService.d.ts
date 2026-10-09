import { UserDao } from "../dao/UserDao";
import { User } from "../entity/User";
export declare class UserService {
    private userDao;
    constructor(userDao: UserDao);
    getUser(id: number): Promise<User>;
}
//# sourceMappingURL=UserService.d.ts.map