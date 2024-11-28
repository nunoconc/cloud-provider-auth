import express from 'express';
const router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('user', { title: 'User Page' });
});

export default router;
