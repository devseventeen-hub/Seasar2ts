package com.example.action;

import com.example.logic.UserService;
import com.example.entity.User;

public class UserAction {
    @Binding
    private UserService userService;

    public String index() {
        return "index.jsp";
    }

    public User show(int id) {
        return userService.getUser(id);
    }
}
