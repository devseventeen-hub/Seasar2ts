package com.example.dao;

import com.example.entity.User;
import java.util.List;

public interface UserDao {
    @Sql("user/find.sql")
    User find(int id);

    @Sql("user/findAll.sql")
    List<User> findAll();

    @Sql("user/update.sql")
    int update(User user);
}
