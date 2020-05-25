var express = require('express');
var db = require('./queries.js');
var router = express.Router();

/* GET home page. */
router.get('/', db.fetchLeaderboard);
router.get('/:country', db.fetchLeaderboardByCountry);

module.exports = router;