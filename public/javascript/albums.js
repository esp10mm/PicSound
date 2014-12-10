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

function init(){
  loadAlbums();

  document.getElementById("file").onchange = function() {
    var f = document.getElementById("file");
    document.getElementById("selected_file_text").innerHTML = f.files.length + ' file selected '
  };

  $('.inactive').hide();

  $( "#uploadSubmit" ).click(function(){
    if($("#uploadTitle").val().length == 0)
      $(".uploadTitle.input").addClass("error");
    else{
      var formData = new FormData($("#uploadForm")[0]);
      $('.loading.upload').show();
      $.ajax( {
        url: '/albumUpload',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(res){
          var success_flag;
          if(res.error == null){
            success_flag = true;
            document.getElementById("msg_header").innerHTML = "Import Album From Facebook :";
            document.getElementById("msg_content").innerHTML = "<div class='ui center aligned header'><i class='smile icon'></i>Succeeded !</div>";
            $('.loading.upload').hide();
            $('.msg.modal')
              .modal('hide others')
              .modal('setting', 'transition', "horizontal flip")
              .modal('show')
            ;

            loadAlbums();

          }
          else{
            success_flag = true;
            document.getElementById("msg_header").innerHTML = "Import Album From Facebook :";
            document.getElementById("msg_content").innerHTML = "<div class='ui center aligned header'><i class='frown icon'></i>"+res.error+"</div>";
            $('.loading.upload').hide();
            $('.msg.modal')
              .modal('hide others')
              .modal('setting', 'transition', "horizontal flip")
              .modal('show')
            ;

          }
        }
      });

    }
  });

  $('#delItem').on('click',delMode);

  $('.ui.modal').modal();
}

function delMode(){

  var delHtml = '<i class="red remove icon" id="delNo"/><i class="green checkmark icon" id="delYes"/>Confirm';
  $('#delItem')
    .html(delHtml)
    .off('click',delMode);

  $('.album.card').each(function(){
    var albumHtml = $(this).html() +
      '<a class="ui corner label">' +
      '<i class="remove icon"></i></a>';
    $(this).html(albumHtml);
    $(this).unbind('click');
  })

  $('.corner.label').on('click',function(){
    if($(this).hasClass('red'))
      $(this).removeClass('red');
    else
      $(this).addClass('red');
  })

  $('#delYes').on('click',function(){
    var aids = [];
    $('.red.corner.label').each(function(){
      var aid = $(this).parent().attr('aid');
      aids.push(aid);
    })

    var data = {};
    $.ajax({
      'type':'POST',
      'url':'/deleteAlbum',
      'data':JSON.stringify({"aids":aids}),
      'contentType': "application/json",
      'success': delModeOff
    })

  });

  $('#delNo').on('click',delModeOff);

}

function delModeOff(){
  setTimeout(function(){
    $('#delItem').on('click',delMode);
  },100)

  var delHtml = '<i class="trash icon"/>Delete';
  $('#delItem').html(delHtml);
  $('.corner.label').remove();

  loadAlbums();
}

function importFromFBDisp(){
  if(token == 'undefined')
    loginFB();
  else{
    loadFBAlbumOptions(function(){
      $('.ui.selection.fb.dropdown').dropdown();
      $('.importFB.modal')
        .modal('hide others')
        .modal('setting', 'transition', "horizontal flip")
        .modal('show')
      ;
    });
  }
}

function uploadDisp(){
  $('.upload.modal')
    .modal('hide others')
    .modal('setting', 'transition', "horizontal flip")
    .modal('show')
  ;
}

function importFromFB(){
  var selected = $('.ui.selection.dropdown.fb').dropdown('get value');
  $('.loading.importFB').show();
  $.get("/importAlbum",{album:selected,token:token},function(res){
    var success_flag = false;
    setTimeout(
      function(){
        if(!success_flag){
            document.getElementById("msg_header").innerHTML = "Import Album From Facebook :";
            document.getElementById("msg_content").innerHTML = "<div class='ui center aligned header'><i class='frown icon'></i>Sorry ... something went wrong</div>";

            $('.msg.modal')
              .modal('hide others')
              .modal('setting', 'transition', "horizontal flip")
              .modal('show')
            ;

            $('.loading.importFB').hide();
        }
      }
      , 30000
    );
    if(res.error == null){
      //loadAlbumList();
      success_flag = true;
      document.getElementById("msg_header").innerHTML = "Import Album From Facebook :";
      document.getElementById("msg_content").innerHTML = "<div class='ui center aligned header'><i class='smile icon'></i>Succeeded !</div>";
      $('.loading.importFB').hide();

      $('.msg.modal')
        .modal('hide others')
        .modal('setting', 'transition', "horizontal flip")
        .modal('show')
      ;

      loadAlbums();

    }
    else{
      success_flag = true;
      document.getElementById("msg_header").innerHTML = "Import Album From Facebook :";
      document.getElementById("msg_content").innerHTML = "<div class='ui center aligned header'><i class='frown icon'></i>"+res.error+"</div>";
      $('.loading.importFB').hide();

      $('.msg.modal')
        .modal('hide others')
        .modal('setting', 'transition', "horizontal flip")
        .modal('show')
      ;
    }
  });
}

function loadAlbums(){
  $.get("/getAlbumList",{id:uid},function(res){
    var albumsHTML = "<div class='ui cards'>";
    if(res.length>0){
      for(var k in res){
        albumsHTML = albumsHTML +
          "<div class='album card' aid='" + res[k].id + "'>" +
          "<a class='image' href='/album?id="+ res[k].id +"'><img class='cover_photo' src='/image?id=" + res[k].cover_photo + "'></a>" +
          "<div class='content'><a class='ui header' href='/album?id="+ res[k].id +"'>" + res[k].name + "</a></div></div>";
      }
      albumsHTML+= "</div>";
      document.getElementById('main_disp').innerHTML = albumsHTML;
      $('.album.item').click(function(){
        window.location = $(this).attr('url');
      })
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
    if(response.albums === undefined){
      loginFB();
    }
    else{
      fb_albums = response.albums.data;
      optionsHTML = '';
      for(var k in fb_albums)
        optionsHTML += '<div class="item" data-value="'+fb_albums[k].id+'">'+fb_albums[k].name+'</div>';
      document.getElementById('fb_options').innerHTML = optionsHTML;
        callback();
    }
  })
}
