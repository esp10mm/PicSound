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


var dbpath = "mongodb://114.32.80.151/PicSound";
var engine = "http://114.32.80.151:8088/recommend";

app.use(express.static(__dirname+"/public"));
var echonest_key = 'GESA37AURYYE1CO55';

app.listen(process.env.PORT || 80);

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
	//var doc = fs.readFileSync( './public/views/albums.jade','utf-8' );
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
					var html = jade.renderFile('./public/jade/albums.jade', options);
					res.send(html);
			})
		});
	});
})

app.get('/importAlbum',function(req,res){
	var fb_token = req.query.token;
	FB.api(req.query.album,{fields:["id","name","cover_photo","from","photos"],access_token: fb_token},function(response){
		//console.log(response);
		MongoClient.connect(dbpath, function(err, db) {

			//register album data & save photos to gridfs
			var albums = db.collection('albums');
			albums.findOne({id:response.id},function(err,doc){
				if(doc==null){
					//register album data to user
					var users = db.collection('users');
					users.findOne({id:response.from.id},function(err,doc){
						users.findAndModify(
							{id:response.from.id},
							[['id',1]],
							{$push:{albums:{id:response.id,name:response.name,cover_photo:response.cover_photo}}},
							function(){}
						);
					})
					//register album data
					albums.insert(
						{
							id:response.id,
							name:response.name,
							photos:[],
							user:response.from.id,
							cover_photo:response.cover_photo
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
							});//save photos to gridfs
						}
					);
				}
				else{
					res.send({error:"This album already exists !"});
					console.log("Album already exists : " + response.id);
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
			var html = jade.renderFile('./public/jade/album.jade', options);
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

			var options = {
  			uri: engine,
  			body: {tags:tags},
  			json: true
			};

			request.post(options,function(e,r,body){
				var results = [];
				for(var k in body){
					//var spotify_id = body[k].spotify.substring(14,body[k].spotify.length);
					var result = {
						name: body[k].name,
						artist: body[k].artist,
						spotify: body[k].spotify.substring(14,body[k].spotify.length),
						preview: body[k].preview,
						image: body[k].image
					}
					results.push(result);
				}
				res.send(results);
			});

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
