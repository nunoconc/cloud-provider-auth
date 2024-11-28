var express = require('express');
var router = express.Router();
var { JSONFilePreset } = require('lowdb/node');
var { findUser } = require('../helpers/auth');

router.get('/login', function (req, res) {
  res.render('login', { title: 'Login Page' });
})

router.get('/register', function (req, res) {
  res.render('register', { title: 'Register Page' });
})


router.post('/register', async function (req, res) {
  //Todo - validate user data

  // get user data from request
  const user = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password
  }

  const userFound = findUser(user.email);

  if(userFound) {
    // user already exists
    res.send({ ok: false, message: "User already exists" });
  } else {
    // update database with new user
    const db = await JSONFilePreset('db.json', { users: []});
    db.data.users.push(user);
    await db.write();
    res.send({ ok: true, message: "User created" });
  }
})

module.exports = router;
