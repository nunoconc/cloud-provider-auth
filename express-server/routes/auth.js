var express = require('express');
var router = express.Router();

router.get('/login', function (req, res) {
  res.render('login', { title: 'Login Page' });
})

router.get('/register', function (req, res) {
  res.render('register', { title: 'Register Page' });
})

module.exports = router;
