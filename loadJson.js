var mongodb = require("mongodb");
var db;
mongodb.MongoClient.connect("mongodb://heroku_15m39cv3:pu10kina4hh0pg2paqqf32u0th@ds139954.mlab.com:39954/heroku_15m39cv3", function (err, database) {
	if (err) {
		console.log(err);
		process.exit(1);
	}
	db = database;
	console.log("Database connection ready");
	var fs = require('fs');
var obj = JSON.parse(fs.readFileSync('categories.json', 'utf8'));
console.log(obj.length);
var YELP_COLLECTION = "yelp_mapping"
for(i=0;i<obj.length;i++){
var doc = {title : obj[i].title.toLowerCase(), alias : obj[i].alias};
console.log(i);
db.collection(YELP_COLLECTION).insertOne(doc, function(err, doc) {
										if (err) {
											handleError(res, err.message, "Failed to update group doc");
										} 
									});
}
});

