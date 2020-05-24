const sqlite = require('./connect.js')

function generateUUID() { // Public Domain/MIT
	var d = new Date().getTime();//Timestamp
	var d2 = (performance && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16;//random number between 0 and 16
		if(d > 0){//Use timestamp until depleted
			r = (d + r)%16 | 0;
			d = Math.floor(d/16);
		} else {//Use microseconds since page-load if supported
			r = (d2 + r)%16 | 0;
			d2 = Math.floor(d2/16);
		}
		return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
}

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
			console.log(row.display_name);
			rettext += JSON.stringify(row);
		});
		res.status(200).send(rettext);
	});
  });
  
}

function createUser(req, res) {
  const {name, country} = req.body
  const id = generateUUID();
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
						//try not to have TOO large of a skill increase, you'll lag the servers!
						query = 'SELECT * FROM users WHERE points BETWEEN ? AND ?'
						sqlite.db.serialize(function () {
							sqlite.db.each(query, [oldpoints, newpoints], (err,row) => {
								if (err) { throw err;}
								if (row.rank < rank && row.user_id != user_id) { // possibly avoids a problem with initial rankings
									console.log(row.rank + " " + row.user_id);
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
									res.status(200).send("done");
									stmt.finalize();
								});
							});
						});
					}); 
				});
			}
		});
   });
}

module.exports = {
	getUsers,
	createUser,
	getUserByGuid,
	scoreSubmit
}