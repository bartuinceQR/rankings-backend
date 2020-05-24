var express = require('express');
var db = require('./queries.js');
var router = express.Router();

/* GET home page. */
router.post('/submit', db.scoreSubmit);

module.exports = router;