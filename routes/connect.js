const sqlite3 = require('sqlite3')
const path = require('path');

const dbpath = path.join(__dirname, '../db/GameStats.db');

let db = new sqlite3.Database(dbpath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the GameStats database.');
});

module.exports = {
	db
}