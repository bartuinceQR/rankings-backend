var express = require('express');
var db = require('./queries.js');
var router = express.Router();

/* GET users listing. */
router.get('/', db.getUsers);

router.post('/create', db.createUser)
router.get('/profile/:id', db.getUserByGuid);

module.exports = router;
