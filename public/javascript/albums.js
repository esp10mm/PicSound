function importFromFBDisp(){
  $('.importFB.modal')
    .modal('setting', 'transition', "horizontal flip")
    .modal('show')
  ;
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
