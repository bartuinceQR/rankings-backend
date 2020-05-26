const sqlite = require('./connect.js')
const { v4: uuidv4 } = require('uuid');

//completely arbitrary point function
function scoreToPoint(sc_w){
	return sc_w * 10;
}

function getUsers(req, res) {
  var query = 'SELECT * FROM USERS ORDER BY generated_id ASC';
  var rettext = "hi,";
  sqlite.db.serialize(() => {
	sqlite.db.all(query, [], (err, rows) => {
		if (err) { throw err; }
		rows.forEach((row) => {
			rettext += JSON.stringify(row.display_name);
		});
		res.status(200).send(rettext);
	});
  });
  
}

function createUser(req, res) {
  const {name, country} = req.body
  const id = uuidv4();
  var pts = 0
  var rank = -1
  var query = 'SELECT COUNT(*) FROM users'

  sqlite.db.serialize(function() {
	sqlite.db.each(query, [], (err, row) => {
		if (err) { throw err; }
		rank = row['COUNT(*)'] + 1;

		var stmt = sqlite.db.prepare('INSERT INTO users (user_id, display_name, country, points, rank) VALUES (?,?,?,?,?)');
		stmt.run(id,name,country,pts,rank);
		stmt.finalize();
		res.status(200).send("done");
	});
   });
}

function getUserByGuid(req, res) {
	const id = req.params.id;
	var query = 'SELECT user_id, display_name, points, rank FROM users WHERE user_id = ?';
	sqlite.db.serialize(() => {
	sqlite.db.get(query, [id], (err,row) => {
		if (err) { throw err; }   
		if (!row) {res.status(400).send("No such user.")} 
		res.status(200).json(row);
	});
  });
}


function scoreSubmit(req,res) {
	const {user_id, score_worth} = req.body;
	var d = new Date();
	var tstamp = d.getTime();

	var oldpoints = -1;
	var newpoints = -1;
	var ppl = 0;
	var rank = -1;

	// sometimes need to use ?, sometimes need to directly add it to the query. I suppose it's related to serialization.
	var query = 'SELECT * FROM users WHERE user_id = ?';
	sqlite.db.serialize(function() {
		//using "get" is a preferable alternative to using COUNT, have you lost your MIND
		sqlite.db.get(query, [user_id], (err, row) => {
			if (err) { throw err; }
			if (!row){
				res.status(400).send("No such user.");
				return;
			}else{
				oldpoints = row.points;
				rank = row.rank;

				query = 'SELECT * FROM scores WHERE user_id = ?';
				sqlite.db.serialize(function() {
					//first, actually insert the new score
					sqlite.db.get(query, [user_id], (err, row) => {
						if (err) { throw err; }
						//first submission?
						if (!row){
							query = 'INSERT INTO scores (user_id, score_worth, timestamp) VALUES (?,?,?)'
							var stmt = sqlite.db.prepare(query);
							stmt.run(user_id,score_worth,tstamp);
							stmt.finalize();
						}else{
							if (row.score_worth < score_worth){
								query = 'UPDATE scores SET user_id = ?, score_worth = ?, timestamp = ? WHERE user_id = ?'; 
								var stmt = sqlite.db.prepare(query);
								stmt.run(user_id,score_worth,tstamp, user_id);
								stmt.finalize();
							}else{
								//sending 200 because it's not really a BAD request, just an overambitious one
								res.status(200).send("score is equal or higher");
								return;
							}
						}

						newpoints = scoreToPoint(score_worth); 

						//update player points according to the score achieved
						query = 'UPDATE users SET points = ? WHERE user_id = ?'
						stmt = sqlite.db.prepare(query);
						stmt.run(newpoints,user_id);
						stmt.finalize();

						//now update rank for every other player we passed
						//runs completely independently from the response, because it doesn't use anything outside the database
						//if it fails to run then there's an issue with the database anyway
						query = 'SELECT * FROM users WHERE points BETWEEN ? AND ?'
						sqlite.db.serialize(function () {
							sqlite.db.each(query, [oldpoints, newpoints], (err,row) => {
								if (err) { throw err;}
								if (row.rank < rank && row.user_id != user_id) { // possibly avoids a problem with initial rankings
									//console.log(row.rank + " " + row.user_id);
									ppl += 1;
									var query2 = 'UPDATE users SET rank = ? WHERE user_id = ?';
									sqlite.db.serialize(function() {
										stmt = sqlite.db.prepare(query2);
										stmt.run([row.rank+1,row.user_id]);
										stmt.finalize();
									});
								}
							}, (err,row) => {
								//update player points according to the score achieved
								query = 'UPDATE users SET rank = ? WHERE user_id = ?'
								stmt = sqlite.db.prepare(query);
								stmt.run([rank-ppl,user_id], function(err, row) {
									stmt.finalize();
								});
							});
						});

						res.status(200).send("done");
					}); 
				});
			}
		});
   });
}


function fetchLeaderboard(req, res){
	//adding user_id here, since it's the only way to actually submit scores
	var query = 'SELECT user_id, rank, points, display_name, country FROM users ORDER BY rank ASC LIMIT 100';
	sqlite.db.serialize(function() {
		sqlite.db.all(query, [], (err,rows) => {
			if (err) { throw err; }
			res.status(200).send(rows);
		});

	});
}


function fetchLeaderboardByCountry(req, res){
	const country = req.params.country;
	var query = 'SELECT rank, points, display_name, country FROM users WHERE country = ? ORDER BY rank ASC LIMIT 100';
	sqlite.db.serialize(function() {
		sqlite.db.all(query, [country], (err,rows) => {
			if (err) { throw err; }
			res.status(200).send(rows);
		});
	});
}

module.exports = {
	getUsers,
	createUser,
	getUserByGuid,
	scoreSubmit,
	fetchLeaderboard,
	fetchLeaderboardByCountry
}