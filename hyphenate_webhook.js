//-------- Server Setup ----------
var http = require("http");
var express = require('express'),
app = express(),
port = process.env.PORT || 8000;
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies

//------ Mongo DB setup--------
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;
var USER_COLLECTION = "users";
var GROUP_COLLECTION = "groups"
var YELP_COLLECTION = "yelp_mapping"
var db;
// mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, database) {
// 	if (err) {
// 		console.log(err);
// 		process.exit(1);
// 	}
// 	db = database;
// 	console.log("Database connection ready");
// });
mongodb.MongoClient.connect("mongodb://heroku_15m39cv3:pu10kina4hh0pg2paqqf32u0th@ds139954.mlab.com:39954/heroku_15m39cv3", function (err, database) {
	if (err) {
		console.log(err);
		process.exit(1);
	}
	db = database;
	console.log("Database connection ready");
});
//-------- Yelp --------
var Yelp = require('yelp');
var yelp = new Yelp({
	consumer_key: 'T5GuFNpdY-aKJfb9x022vQ',
	consumer_secret: 'Ro4S-4wLkDXA0G0ac60ukEH2G-I',
	token: 'y8spDFmYV30pAs3yVlDDX-VD6eZTerTN',
	token_secret: 'A9hxZKsvW7LDpZ0buVw9MndFTs4',
});


//-------- Hyphenate API --------
var request = require("request");

var hyphenate_options = { method: 'POST',
url: 'https://api.hyphenate.io/1506170916011784/groupplan/messages',
headers: 
{ 'postman-token': 'a29559a7-402c-886f-c36c-f8460f9ea1c7',
'cache-control': 'no-cache',
'content-type': 'application/json',
authorization: 'Bearer YWMt26jM2psiEeew3-cdstkBogAAAV_BgNffv8WG7DFLuCsdqE4K_2wey3-UriM' },
json: true };

//--------- NLP modules ---------
var sentiment = require('sentiment');
var WordPOS = require('wordpos'),
wordpos = new WordPOS();
var cusines= ["indian", "pizza", "burgers", "italian", "mexican","beer","cocktails", "wings", "chinese", "vietnamese",
"korean", "peruvian"];
var cusineMapping = {"indian":"indpak", }
//-------- Endpoints ------- 
app.get('/*',function(req,res,next){
	res.header('Access-Control-Allow-Origin' , 0 );
    next(); // http://expressjs.com/guide.html#passing-route control
});

app.get('/', function(req,res) {
	res.send('KetchUp API Version 1');
});

//Endpoint for logging/signing up 
app.post('/register', function(req,res){

});


app.post('/webhook', function(req, res){
	var group_id = req.body.group_id;
	var from = req.body.from;
	console.log('\n\n\nGroupId '+group_id+' From: '+req.body.from);
	for(var i=0; i<req.body.payload.bodies.length;i++){
		var msg = req.body.payload.bodies[i].msg
		wordpos.getNouns(msg, function(words){
			for(var i=0;i<words.length;i++){
				if(isCusine(words[i])){
					var keyWord = words[i].toLowerCase();
					db.collection(GROUP_COLLECTION).findOne({group_id: group_id}, function(err, doc) {
						if (err) {
							handleError(res, err.message, "Failed to get group doc");
							res.send("Group does not exist")
						} else {
							if(sentiment(msg).score>=0){
								if(doc != null){
									doc['search'][keyWord] = doc['search'][keyWord]==null?[]:doc['search'][keyWord];
									
									if(!isInArray(doc['search'][keyWord], from)){
										doc['search'][keyWord].push(from);
										db.collection(GROUP_COLLECTION).updateOne({group_id: group_id}, doc, function(err, doc) {
											if (err) {
												handleError(res, err.message, "Failed to update group doc");
											} 
										});
									}
								}else{
									var obj = {};
									obj[keyWord] =  [from]
									var doc = {group_id: group_id, search: obj, places:{}};
									db.collection(GROUP_COLLECTION).insertOne(doc, function(err, doc) {
										if (err) {
											handleError(res, err.message, "Failed to update group doc");
										} 
									});
								}
							}
						}
					});
				}
			}
		});
	}
	res.status(200).send();
});


app.post('/vote', function(req, res){
	var group_id = req.body.group_id;
	var user_id = req.body.user_id;
	var place_id = req.body.place_id;
	console.log("logg"+group_id+user_id+place_id);
	db.collection(GROUP_COLLECTION).findOne({group_id: group_id}, function(err, doc) {
		if(doc!=null){
			
				doc['places'][place_id]['votes'].push("Mike");
				doc['places'][place_id]['votes'].push("Joe");
				doc['places'][place_id]['votes'].push("Kim");
				db.collection(GROUP_COLLECTION).updateOne({group_id: group_id}, doc, function(err, doc) {
					if (err) {
						handleError(res, err.message, "Failed to update group doc");
					} else{
						//res.send("Ok");
					}
				});
			
		}
	});
	res.send("Ok");
});


app.get('/suggestions/:id', function(req, res){
	console.log(req.params.id);
	getSuggestionsForGroup(req.params.id, res);

});



app.post('/test1', function(req, res){
	var groupID = '27519764987905';

	var myBody = { target_type: 'chatgroups',
	target: [ groupID ],
	msg: { type: 'txt', msg: "Joe and I are planning a team dinner tomorrow at 7pm" },
	from: "Mike" };
	hyphenate_options['body'] = myBody
	request(hyphenate_options, function (error, response, body) {
		if (error) throw new Error(error);
		console.log(body);
		var myBody = { target_type: 'chatgroups',
		target: [ groupID ],
		msg: { type: 'txt', msg: "Awesome! Lets try Italian?"},
		from: "Terry" };
		hyphenate_options['body'] = myBody
		request(hyphenate_options, function (error, response, body) {
			if (error) throw new Error(error);
			console.log(body);

		});

		res.send("Done");
	});
})


app.post('/test2',function(req,res){
	var groupID = '27519764987905';
	var myBody = { target_type: 'chatgroups',
	target: [ groupID ],
	msg: { type: 'txt', msg: "Mexican is good"},
	from: "satya" };
	hyphenate_options['body'] = myBody
	request(hyphenate_options, function (error, response, body) {
		if (error) throw new Error(error);
		console.log(body);
		var groupID = '27519764987905';
		var myBody = { target_type: 'chatgroups',
		target: [ groupID ],
		msg: { type: 'txt', msg: "I am fine with Mexican as long as the place serves good beer"},
		from: "Joe" };
		hyphenate_options['body'] = myBody
		request(hyphenate_options, function (error, response, body) {
			if (error) throw new Error(error);
			console.log(body);
			res.send('done');
		});
	})
});

app.post('/test3', function(req, res){
	var groupID = '27519764987905';
	var request = require("request");

			var options = { method: 'POST',
			url: 'http://localhost:8000/vote',
			headers: 
			{ 'postman-token': '24f4168c-aac9-6dcb-d3de-917c4614c7d6',
			'cache-control': 'no-cache',
			'content-type': 'application/json' },
			body: 
			{ group_id: '27519764987905',
			user_id: 'Joe',
			place_id: 'garaje-san-francisco' },
			json: true };

			request(options, function (error, response, body) {
				if (error) throw new Error(error);

				console.log(body);
				var options = { method: 'POST',
				url: 'http://localhost:8000/vote',
				headers: 
				{ 'postman-token': '24f4168c-aac9-6dcb-d3de-917c4614c7d6',
				'cache-control': 'no-cache',
				'content-type': 'application/json' },
				body: 
				{ group_id: '27519764987905',
				user_id: 'Mike',
				place_id: 'garaje-san-francisco' },
				json: true };

				request(options, function (error, response, body) {
					if (error) throw new Error(error);

					console.log(body);
					var myBody = { target_type: 'chatgroups',
					target: [ groupID ],
					msg: { type: 'txt', msg: "Sounds good"},
					from: "Satya" };
					hyphenate_options['body'] = myBody
					// request(hyphenate_options, function (error, response, body) {
					// 	if (error) throw new Error(error);
					// 	console.log(body);
					// 	res.send("done");
					// });
					res.send("done");
				});
			});
})



//----- Create the server ----- 
app.listen(port, function() {
	console.log("KIetchUp API is running on port " + port);
});




//---------- HELPER FUNCTIONS ---------

function getSuggestionsForGroup(group_id, res){
	var promises = [];
	db.collection(GROUP_COLLECTION).findOne({group_id: group_id}, function(err, doc) {
		if (err || doc == null) {
			//handleError(res, err.message, "Failed to get group doc");
		} else {
			searchTerms = doc['search'];
			searchString = "";
			for(var searchTerm in searchTerms){
				var search = searchTerm.toLowerCase();
				promises.push(new Promise(function(resolve, reject) {
					var query = search.toLowerCase();
					db.collection(YELP_COLLECTION).findOne({title: query}, function(err, doc){
						if(doc != null){
							//console.log(query+doc.alias);
							resolve(doc.alias);
						}else{
							query = ".*"+query+".*";
							db.collection(YELP_COLLECTION).findOne({title: {$regex : query}}, function(err, doc){
								if(doc!=null){
								//	console.log(query+doc.alias);
								resolve(doc.alias);
							}else{
								resolve("");
							}
						});
						}
					});
				}));
			}
			
			Promise.all(promises).then(function(results){
				var searchTermPromises = [];
				for(i=0;i<results.length;i++){
					if(results[i].length>1)
					{	
						
						searchTermPromises.push(new Promise(function(resolve, reject){
							yelp.search({ term: 'restaurant', location: 'San Francisco', category_filter: results[i], sort:2})
							.then(function (data) {
								var names = "";
								var places = {}
								console.log();
								for(var i=0;i<data.businesses.length;i++){
									var restaurant = {};
									restaurant['name'] =  data.businesses[i].name;
									restaurant['mobile_url'] = data.businesses[i].mobile_url;
									restaurant['rating'] = data.businesses[i].rating;
									restaurant['review_count'] = data.businesses[i].review_count;
									restaurant['image_url'] = data.businesses[i].image_url;
									restaurant['category'] = data.businesses[i].categories;
									restaurant['rating_img_url'] = data.businesses[i].rating_img_url;
									places[data.businesses[i].id] = restaurant;
									
								}
								resolve(places);
							})
							.catch(function (err) {
								console.error(err);
								res.send('Unable to process request');
							});
						}));
					}
				}
				Promise.all(searchTermPromises).then(function(results){
					var ids = [];
					places = {}
					count = {};
					totalCount = 0;
					
					for(var searchTerm in searchTerms){
						count[searchTerm] = doc['search'][searchTerm].length;
						totalCount += doc['search'][searchTerm].length;
						
					}
					console.log(count)

					for(i=0;i<results.length;i++){
						j=0;
						
						for(var id in results[i]){
							searchTerm = results[i][id]['category'][0][0].toLowerCase();
							if(j > (15*count[searchTerm]/totalCount))
								break;
							j++;
							console.log(searchTerm+j);
							ids.push(id);
							places[id] = results[i][id];
							
						}
					}
					
					db.collection(GROUP_COLLECTION).findOne({group_id: group_id}, function(err, doc){
						if(!err && doc!=null){
							total = 0;
							for(i=0;i<ids.length;i++){
								if(doc['places'][ids[i]] != null){
									places[ids[i]]['votes'] = doc['places'][ids[i]]['votes']==null?[]:doc['places'][ids[i]]['votes'];
								}else{
									places[ids[i]]['votes'] = []
								}
								total++;
							}
							places = sortOnVotes(places);
							doc['places'] = places;
							doc['total'] = total;
							db.collection(GROUP_COLLECTION).updateOne({group_id: group_id}, doc, function(err, mydoc) {
								if (err) {
									handleError(res, err.message, "Failed to update group doc");
								} else{
									res.send(doc);
								}
							});
						}
					});


					
				});
			});


		}
	});
}



function insertGroupDoc(group_id){
	var doc = {group_id: group_id};
	db.collection(GROUP_COLLECTION).insertOne(doc, function(err, doc) {
		if (err) {
			handleError(res, err.message, "Failed to create new contact.");
		} 
	});

}


function isInArray(arr, word){
	return arr.indexOf(word) > -1;
}

function isCusine(word) {
	return cusines.indexOf(word.toLowerCase()) > -1;
}

function sortOnVotes(dict) {

	var sorted = [];
	for(var key in dict) {
		sorted[sorted.length] = [key, dict[key]['votes']!=null?dict[key]['votes'].length:0];
	}
	sorted.sort(function(a,b){
		console.log(a);
		return b[1]-a[1];
	});

	var tempDict = {};
	for(var i = 0; i < sorted.length; i++) {
		tempDict[sorted[i][0]] = dict[sorted[i][0]];
	}

	return tempDict;
}

