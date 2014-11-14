window.fbAsyncInit = function() {
  FB.init({
    appId      : '1457989084469519',
    cookie     : true,  // enable cookies to allow the server to access
                            // the session
    xfbml      : true,  // parse social plugins on this page
    version    : 'v2.0' // use version 2.0
  });
};

(function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s); js.id = id;
  js.src = "//connect.facebook.net/en_US/sdk.js";
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

function importFromFBDisp(){
  if(token == 'undefined')
    loginFB();
  else{
    loadFBAlbumOptions(function(){
      $('.ui.selection.fb.dropdown').dropdown();
      $('.importFB.modal')
        .modal('setting', 'transition', "horizontal flip")
        .modal('show')
      ;
    });
  }
}

function importFromFB(){
  var selected = $('.ui.selection.dropdown.fb').dropdown('get value');
  document.getElementById('fbloading').innerHTML = "<i class='big loading icon'></i>";
  $.get("/importAlbum",{album:selected,token:token},function(res){
    var success_flag = false;
    setTimeout(
      function(){
        if(!success_flag){
            document.getElementById("msg_header").innerHTML = "Import Album From Facebook :";
            document.getElementById("msg_content").innerHTML = "<div class='ui center aligned header'><i class='frown icon'></i>Sorry ... something went wrong</div>";

            $('.msg.modal')
              .modal('setting', 'transition', "horizontal flip")
              .modal('show')
              .modal('hide others')
            ;

            document.getElementById('fbloading').innerHTML = "";
        }
      }
      , 30000
    );
    if(res.error == null){
      //loadAlbumList();
      success_flag = true;
      document.getElementById("msg_header").innerHTML = "Import Album From Facebook :";
      document.getElementById("msg_content").innerHTML = "<div class='ui center aligned header'><i class='smile icon'></i>Succeeded !</div>";
      document.getElementById('fbloading').innerHTML = "";

      $('.msg.modal')
        .modal('setting', 'transition', "horizontal flip")
        .modal('show')
        .modal('hide others')
      ;

      loadAlbums();

    }
    else{
      success_flag = true;
      document.getElementById("msg_header").innerHTML = "Import Album From Facebook :";
      document.getElementById("msg_content").innerHTML = "<div class='ui center aligned header'><i class='frown icon'></i>"+res.error+"</div>";
      document.getElementById('fbloading').innerHTML = "";

      $('.msg.modal')
        .modal('setting', 'transition', "horizontal flip")
        .modal('show')
        .modal('hide others')
      ;
    }
  });
}

function loadAlbums(){
  $.get("/getAlbumList",{id:uid},function(res){
    var albumsHTML = "<div class='ui items'>";
    if(res.length>0){
      for(var k in res){
        albumsHTML = albumsHTML + "<div class='item' onclick='window.location = \"/album?id="+res[k].id+"\";'><div class='image'><img class='cover_photo' src='/image?id="+res[k].cover_photo+"'></div><div class='content'><div class='ui header'>"+res[k].name+"</div></div></div>";
        console.log(res[k].id);
      }
      albumsHTML+= "</div>";
      document.getElementById('main_disp').innerHTML = albumsHTML;
    }
    else
      document.getElementById('main_disp').innerHTML = '<div class="ui icon message"><i class="frown icon"></i><div class="content"><div class="header">You have no album yet ...</div><p>You can add some with sidebar!</p></div></div>';
  });
}

function loginFB(){
  FB.login(function(response) {
   if (response.authResponse) {
     console.log('Welcome!  Fetching your information.... ');
     FB.api('/me', function(response) {
       $.get("/register",response,function(res){
         document.cookie = "FBToken=" + FB.getAuthResponse()['accessToken'];
         document.cookie = "user=" + response.id;
         if(res.login){
           token = FB.getAuthResponse()['accessToken'];
           importFromFBDisp();
         }
       })
     });
   } else {
     console.log('User cancelled login or did not fully authorize.');
   }
 }, {scope: 'email,user_photos'});
}

function loadFBAlbumOptions(callback){
  FB.api('me', { fields: ['id','albums'], access_token: token }, function(response) {
    fb_albums = response.albums.data;
    for(var k in fb_albums){
      document.getElementById('fb_options').innerHTML += '<div class="item" data-value="'+fb_albums[k].id+'">'+fb_albums[k].name+'</div>';
    }
    callback();
  })
}
