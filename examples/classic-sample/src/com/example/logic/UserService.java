package com.example.logic;

import com.example.dao.UserDao;
import com.example.entity.User;

public class UserService {
    @Binding
    private UserDao userDao;

    @Transactional
    public User getUser(int id) {
        return userDao.find(id);
    }
}
