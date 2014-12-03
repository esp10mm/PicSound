var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
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
var formidable = require('formidable');
var util = require('util');


var dbpath = "mongodb://127.0.0.1/PicSound";
var engine = "http://127.0.0.1:8088/";

app.use(express.static(__dirname+"/public"));
app.use(cookieParser());
app.use(bodyParser.json());

app.listen(process.env.PORT || 80);

app.get('/image',function(req,response){
	MongoClient.connect(dbpath, function(err, db) {
		var gfs = Grid(db, mongo);
		gfs.files.find({'metadata.id': req.query.id}).toArray(function (err, files) {
			var readstream = gfs.createReadStream({_id:files[0]._id});
			readstream.pipe(response);
  	})
	})
})

app.get('/albums',function(req,res){
	//var doc = fs.readFileSync( './public/views/albums.jade','utf-8' );
	var fb_token = req.cookies.FBToken;
	var uid = req.cookies.user;
	MongoClient.connect(dbpath, function(err, db) {
		var users = db.collection('users');
		users.findOne({id:uid},function(err,doc){
				var albums = [];
				if(doc.albums != null)
					albums = doc.albums;
				var options = {
					data:{
						user:{
							id:uid
						},
						albums:albums,
						token:"undefined"
					}
				};
				if(fb_token !== undefined)
					options.data.token = fb_token;
				var html = jade.renderFile('./public/jade/albums.jade', options);
				res.send(html);
		})
	});
})

app.get('/importAlbum',function(req,res){
	var fb_token = req.query.token;
	FB.api(req.query.album,{fields:["id","name","cover_photo","from","photos"],access_token: fb_token},function(response){
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
							cover_photo:response.cover_photo,
							vote:{}
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

app.get('/delTag',function(req,res){
	MongoClient.connect(dbpath, function(err, db) {
		var albums = db.collection('albums');
		albums.findOne({id:req.query.id},function(err,doc){
			var tags = [];
			if(!(doc.tags===undefined)){
				tags = doc.tags;
				tags.splice(tags.indexOf(req.query.tag),1);
			}
			albums.findAndModify(
				{id:req.query.id},
				[['id',1]],
				{$set:{tags:tags}},
				function(){
					console.log("tag:"+req.query.tag+" had been removed from album:"+req.query.id);
					res.send({success:true});
				}
			);
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
  			uri: engine + "recommend",
  			body: {tags:tags},
  			json: true
			};

			request.post(options,function(e,r,body){
				var results = [];
				for(var k in body){
					//var spotify_id = body[k].spotify.substring(14,body[k].spotify.length);
					var result = {
						id: body[k].id,
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

app.get('/addRecSong',function(req,res){
	MongoClient.connect(dbpath, function(err, db){
		var albums = db.collection('albums');
		albums.findOne({id:req.query.aid},function(err,doc){
			var tags = [];
			if(!(doc.tags===undefined)){
				tags = doc.tags;
			}

			var options = {
				uri: engine + "addSong",
				body: {tags:tags,sid:req.query.sid},
				json: true
			};

			request.post(options,function(e,r,body){

			});
		})
	})
	// console.log(req.query.sid);
	res.send({success:true});
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

app.get('/vote',function(req,res){
	console.log(req.cookies.user);
	console.log(req.query);

	MongoClient.connect(dbpath, function(err, db) {
		db.collection('albums').findOne({id:req.query.album},function(err,doc){
			var options = {
				uri: engine + "weight",
				body: {song:req.query.song,tags:doc.tags,vote:req.query.vote},
				json: true
			};

			if(doc.vote[req.query.song] === undefined){
				var songvote = doc.vote;
				songvote[req.query.song] = parseInt(req.query.vote);
				db.collection('albums').findAndModify({id:req.query.album},[['id',1]],{$set:{vote:songvote}},function(){
					request.post(options,function(e,r,body){
						res.send({success:true});
					})
				});
			}
			else{
				var songvote = doc.vote;
				songvote[req.query.song] = songvote[req.query.song] + parseInt(req.query.vote);
				db.collection('albums').findAndModify({id:req.query.album},[['id',1]],{$set:{vote:songvote}},function(){
					request.post(options,function(e,r,body){
						res.send({success:true});
					})
				});
			}
		})
	})
})

app.post('/albumUpload', function(req, res){
	var imageExtenstion = ['.jpg','.png','.gif'];
  var form = new formidable.IncomingForm();
	var albumID = "" + idGen();
	var albumTitle = "";
	var coverPhoto = "";

  form.parse(req, function(err, fields, files) {
		albumTitle = fields.title;
  });

  form.on('end', function(fields, files) {
		var images = this.openedFiles;
		var imageIDs = [];
		async.each(images,
			function(image,callback){
				var extension = image.name.slice(image.name.indexOf('.'));
				var fileID = "" + idGen();
				var fileName = fileID + extension;
				if(imageExtenstion.indexOf(extension) != -1){
						MongoClient.connect(dbpath, function(err, db) {
							var gfs = Grid(db, mongo);
							var save_to_mongo = fs.createReadStream(image.path).pipe(gfs.createWriteStream({
								filename: fileName,
								metadata:{
									id:fileID,
									user:req.cookies.user,
									album:albumID
								}
							}));
							save_to_mongo.on('close', function(){
								console.log(fileName + " is saved !")
								if(images.indexOf(image) == 0)
									coverPhoto = fileID;
								imageIDs.push(fileID);
								callback();
							});
						})
				}
				else
					callback();
			},
			function(err){
				MongoClient.connect(dbpath, function(err, db) {
					var users = db.collection('users');
					users.findOne({id:req.cookies.user},function(err,doc){
						users.findAndModify(
							{id:req.cookies.user},
							[['id',1]],
							{$push:{albums:{id:albumID,name:albumTitle,cover_photo:coverPhoto}}},
							function(){
								var albums = db.collection('albums');
								albums.insert(
									{
										id:albumID,
										name:albumTitle,
										photos:imageIDs,
										user:req.cookies.user,
										cover_photo:coverPhoto,
										vote:{}
									},
									function(){
										console.log('album: ' + albumID +" is created !;")
										res.send({success:true});
									}
								);
							}
						);
					})
				})
			}
		)
  });
});

app.post('/deleteAlbum',function(req,res){
	var aids = req.body.aids;
	MongoClient.connect(dbpath, function(err, db) {
		var users = db.collection('users');
		var albums = db.collection('albums');
		users.findOne({id:req.cookies.user},function(err,doc){
			async.each(aids,
				function(aid,callback){
					doc = removeUserAlbum(aid,doc);
					users.update({id:req.cookies.user},{$set:doc},function(err,result){
						albums.findOne({"id":aid},function(err,doc){
							var gfs = Grid(db, mongo);
							for(var k in doc.photos){
								gfs.files.remove({'metadata.id': doc.photos[k]},function(){});
							}
							albums.remove({"id":aid},function(){
								callback();
							})
						})
					})
				},
				function(err){
					res.send({'success':true});
				}
			);
		});
	})

})

function idGen(){
	var id = "";
	for(i=0;i<15;i++){
		id = Math.floor((Math.random() * 1000000000000000));
	}
	return id;
}

function removeUserAlbum(aid,doc){
	for(var k in doc.albums){
		if(doc.albums[k].id == aid){
			doc.albums.splice(k,1);
			return doc;
		}
	}
	return doc;
}
