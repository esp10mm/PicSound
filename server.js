var express = require('express');
var app = express();
var http = require('http');
var https = require('https');
var async = require('async');
var fs = require('fs');
var FB = require('fb');
var request = require('request');
var jade = require('jade');
var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var Grid = require('gridfs-stream');


var dbpath = "mongodb://114.32.80.151:27017/PicSound";

app.use(express.static(__dirname));
var echonest_key = 'GESA37AURYYE1CO55';

app.listen(process.env.PORT || 80);

app.get('/songSearch',function(req,response){
	console.log(req.query);
	http.get("http://ws.spotify.com/search/1/track.json?q="+req.query.artistName,function(res){
		var data = '';
		res.on('data',function(chunck){
			data += chunck;
		})
		res.on('end',function(){
			var obj = JSON.parse(data);
			var trackList = obj.tracks[0].href.substr(14,34);
			for(var k=1;obj.tracks.length;k++){
				//console.log(obj.tracks[k].name);
				if(k>9)	break;
				else
					trackList = trackList+","+obj.tracks[k].href.substr(14,34);
			}
			console.log(trackList);
			response.send(trackList);
		})
	})
})

app.get('/flickrAlbum',function(req,response){
	console.log(req.query);
	var apiKey = "0305a00c59888f7343a594c3120362a3";
	var apiURL = "https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&format=json&nojsoncallback=1";

	https.get(apiURL+"&api_key="+apiKey+"&photoset_id="+req.query.albumId,function(res){
		var data = '';
		res.on('data',function(chunck){
			data += chunck;
		})
		res.on('end',function(){
			var obj = JSON.parse(data);
			var sourceURLs = "";
			var tags = [];

			async.each(obj.photoset.photo,
				function(photo,callback){
					var id = photo.id;
					var apiURL = "https://api.flickr.com/services/rest/?method=flickr.photos.getSizes&format=json&nojsoncallback=1";
					https.get(apiURL+"&api_key="+apiKey+"&photo_id="+id,function(res){
						var data = '';
						res.on('data',function(chunck){
							data += chunck;
						})
						res.on('end',function(){
							var obj = JSON.parse(data);
							for(var k in obj.sizes.size){
								if(obj.sizes.size[k].label == "Original")
									sourceURLs += "<div style=\"background-image: url("+obj.sizes.size[k].source+")\"></div>\n";
							}
							apiURL = "https://api.flickr.com/services/rest/?method=flickr.photos.getInfo&format=json&nojsoncallback=1";

							https.get(apiURL+"&api_key="+apiKey+"&photo_id="+id,function(res){
								var data = '';
								res.on('data',function(chunck){
									data += chunck;
								})
								res.on('end',function(){
									var obj = JSON.parse(data);

  								for(var k in obj.photo.tags.tag){
     								if(tags.indexOf(obj.photo.tags.tag[k].raw) == -1)
											tags.push(obj.photo.tags.tag[k].raw);
    				      }
									callback();
								})
							})//get photo tag

						})
					})
				},
				function(err){
					var data = {urls:sourceURLs};
					for(var k in tags){
						console.log(tags[k]);
					}
					response.send(data);
					//console.log(data);
					console.log("OK");
				}
			);

		})
	})
})

app.get('/loadFAlbum',function(req,response){
	//console.log(req);
	MongoClient.connect(dbpath, function(err, db) {
		if(!err) {
			console.log("We are connected");
		}
		var gfs = Grid(db, mongo);

		async.each(req.query.photos.data,
			function(image,callback){
				var save_to_mongo = request(image.source).pipe(gfs.createWriteStream({
					filename: image.id + ".jpg",
					metadata:{
						id:image.id,
						user:req.query.from.id,
						album:req.query.id
					}
				}));
				save_to_mongo.on('close', function(){
					console.log(image.id + "is saved !")
					callback();
				});
			},
			function(err){
				response.send("response");
				console.log("DONE!");
			}
		)
	})
})

app.get('/image',function(req,response){
	MongoClient.connect(dbpath, function(err, db) {
		var gfs = Grid(db, mongo);
		var readstream = gfs.createReadStream({
			filename: req.query.id + '.jpg'
		});
		readstream.pipe(response);
	})
})

app.get('/albums',function(req,res){
	//var doc = fs.readFileSync( './views/albums.jade','utf-8' );
	var fb_token = req.query.token;
	FB.api('me', { fields: ['id','albums'], access_token: fb_token }, function(response) {
		MongoClient.connect(dbpath, function(err, db) {
			var users = db.collection('users');
			users.findOne({id:response.id},function(err,doc){
					var albums = [];
					if(doc.albums != null)
						albums = doc.albums;
					var options = {
						data:{
							user:{
								id:req.query.user
							},
							albums:albums,
							albums_option:response.albums.data,
							token:fb_token
						}
					};
					var html = jade.renderFile('./views/albums.jade', options);
					res.send(html);
			})
		});
	});
})

app.get('/importAlbum',function(req,res){
	var fb_token = req.query.token;
	FB.api(req.query.album,{fields:["id","name","from","photos"],access_token: fb_token},function(response){
		//console.log(response);
		MongoClient.connect(dbpath, function(err, db) {

			//register album data to user
			var users = db.collection('users');
			users.findOne({id:response.from.id},function(err,doc){
				var import_or_not = true;
				if(!(doc.albums===undefined)){
					if(doc.albums.indexOf(response.id)!=(-1))
						import_or_not = false;
				}
				if(import_or_not){
					users.findAndModify(
						{id:response.from.id},
						[['id',1]],
						{$push:{albums:{id:response.id,name:response.name}}},
						function(){}
					);
				}
			})

			//register album data & save photos to gridfs
			var albums = db.collection('albums');
			albums.findOne({id:response.id},function(err,doc){
				if(doc==null){
					albums.insert(
						{
							id:response.id,
							name:response.name,
							photos:[],
							user:response.from.id
						}
						,
						function(err,result){
							var photos = response.photos.data
							for(var k in photos){
								albums.findAndModify(
									{id:response.id},
									[['id',1]],
									{$push:{photos:photos[k].id}},
									function(){}
								);
							}
							console.log("album is registered : " + response.id);
						}
					);

					//save photos to gridfs
					var gfs = Grid(db, mongo);
					albums.findOne({id:response.id},function(err,doc){
						if(!(doc==null)){
								async.each(response.photos.data,
									function(image,callback){
										var save_to_mongo = request(image.source).pipe(gfs.createWriteStream({
											filename: image.id + ".jpg",
											metadata:{
												id:image.id,
												user:response.from.id,
												album:response.id
											}
										}));
										save_to_mongo.on('close', function(){
											console.log(image.id + "is saved !")
											callback();
										});
										console.log(image.id);
									},
									function(err){
										res.send({id:response.id,name:response.name});
										console.log("DONE!");
									}
								);
						}
					});
				}
			});

		})//mongo_callback
	})//FB_callback


})

app.get('/album',function(req,res){
	MongoClient.connect(dbpath, function(err, db) {
		var albums = db.collection('albums');
		albums.findOne({id:req.query.id},function(err,doc){
			var options = {};
			if(doc != null){
				options = {
					id:doc.id,
					photos:doc.photos
				}
			}
			var html = jade.renderFile('./views/album.jade', options);
			res.send(html);
		})
	})

})

app.get('/addTag',function(req,res){
	//console.log(req.query);
	MongoClient.connect(dbpath, function(err, db) {
		var albums = db.collection('albums');
		albums.findOne({id:req.query.id},function(err,doc){
			var add_or_not = true;
			if(!(doc.tags===undefined)){
				if(doc.tags.indexOf(req.query.tag)!=(-1))
					add_or_not = false;
			}
			if(add_or_not){
				albums.findAndModify(
					{id:req.query.id},
					[['id',1]],
					{$push:{tags:req.query.tag}},
					function(){
						res.send({success:true});
					}
				);

				var tags = db.collection('tags');
				tags.findOne({tag:req.query.tag},function(err,doc){
					if(doc==null){
						tags.insert(
							{
								tag:req.query.tag,
								albums:[req.query.id]
							}
							,
							function(err,result){
								console.log("tag is registered : " + req.query.tag);
							}
						);
					}
					else {
						tags.findAndModify(
							{tag:req.query.tag},
							[['tag',1]],
							{$push:{albums:req.query.id}},
							function(){
								console.log("tag is updated : " + req.query.tag);
							}
						);
					}
				})
			}
		})
	})
})

app.get('/getTags',function(req,res){
	MongoClient.connect(dbpath, function(err, db) {
		var albums = db.collection('albums');
		albums.findOne({id:req.query.id},function(err,doc){
			var tags = [];
			if(!(doc.tags===undefined)){
				tags = doc.tags;
			}
			res.send(tags);
		})
	})
})

app.get('/echonest',function(req,res){
	var url = 'http://developer.echonest.com/api/v4/song/search?format=json&api_key='+echonest_key
	var query = '&bucket=id:spotify&bucket=tracks&style=rap&description=taiwanese&description=jazz';
	http.get(url+query,function(response){
		var data = '';
		response.on('data',function(chunck){
			data += chunck;
		})
		response.on('end',function(){
			console.log(data);
			res.send(data);
		})

	})

})

app.get('/getRecSong',function(req,res){
	MongoClient.connect(dbpath, function(err, db) {
		var albums = db.collection('albums');
		albums.findOne({id:req.query.id},function(err,doc){
			var tags = [];
			if(!(doc.tags===undefined)){
				tags = doc.tags;
			}

			var songList = [];
			async.each(tags,
				function(tag,callback){
					var url = 'http://developer.echonest.com/api/v4/song/search?format=json&api_key='+echonest_key
					var query = '&bucket=id:spotify&bucket=tracks&description=' + tag;
					http.get(url+query,function(response){
						var data = '';
						response.on('data',function(chunck){
							data += chunck;
						})
						response.on('end',function(){
							data = JSON.parse(data)
							for(var j in data.response.songs){
								songList.push(data.response.songs[j]);
							}
							callback();
							//res.send();
						})
					})
				},
				function(err){
					var spotify_ids = [];
					for(var k in songList){
						if(songList[k].tracks.length>0){
							var foreign_id = songList[k].tracks[0].foreign_id.split(":");
							spotify_ids.push(foreign_id[2]);
						}
					}
					res.send(spotify_ids);
				}
			);

		})
	})
})

app.get('/getAlbumList',function(req,res){
	MongoClient.connect(dbpath, function(err, db) {
		var users = db.collection('users');
		users.findOne({id:req.query.id},function(err,doc){
			var albums = [];
			if(!(doc.albums===undefined)){
				albums = doc.albums;
			}
			res.send(albums);
		})
	})
})

app.get('/register',function(req,response){
	MongoClient.connect(dbpath, function(err, db) {
		var collection = db.collection('users');
		/*collection.insert(req.query,function(err,result){
			console.log("insert done");
		});*/
		collection.count({"id": req.query.id},function(err,count){
			if(count == 0){
				collection.insert(req.query,function(err,result){
					console.log("user is registered" + req.query.id);
				});
			}
			else
				console.log("user login: "+req.query.id);
			response.send({login:true});
		})

	})
})

app.get('/slides',function(req,response){
	var s = '<html><head><link href=\"jquery.skippr.css\" rel=\"stylesheet\"></head><body><div id=\"slides\"><div style=\"background-image: url(img1.jpg)\"></div></div><script type=\"text/javascript\" src=\"jquery-2.1.1.min.js\"></script><script type=\"text/javascript\" src=\"jquery.skippr.js\"></script><script type=\"text/javascript\">$(document).ready(function(){$(\"#slides\").skippr();})</script></body></html>';
	response.send(s);
})
