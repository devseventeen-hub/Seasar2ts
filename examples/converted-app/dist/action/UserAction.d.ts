import { UserService } from "../logic/UserService";
import { User } from "../entity/User";
export declare class UserAction {
    private userService;
    constructor(userService: UserService);
    index(): string;
    show(id: number): User;
}
//# sourceMappingURL=UserAction.d.ts.map