var slide_cur = 0;
var slide_len ;
var play_flag = false;
var timer;
var songs = [];
var nowPlaying = null;
var songNowPage = 1;

function init(){
  console.log("init");
  loadPhotos();
  loadTags();

  var loadCount = 0;
  $('.image').on('load',function(){
    var w = $(this).width();
    var h = $(this).height();
    if(!$(this).hasClass('slide0'))
      $(this).hide();
    $(this).attr('ow',w);
    $(this).attr('oh',h);
    var sw = $('.slide.disp').width();
    var sh = $('.slide.disp').height();

    if(w > sw){
      $(this).width(sw);
    }
    if(h > sh){
      $(this).height(sh);
    }
    var top = (sh - $(this).height())/2;
    $(this).css('top',top+'px');
    loadCount += 1;
    if(loadCount == slide_len)
      $('.play.control').click();
  });

  $( '.inactive' ).hide();

  $('.manage .tag_song .item').on('click', function() {
    $('.manage .tag_song .item').removeClass('active');
    $(this).addClass('active');
  });

  $('.manage .tag .button').popup({
    on: 'click',
  });

  $(window).resize(function() {
    resetImgSize();
  });

  $('.forward.control').on('click',function(){
    var sel,sel2;
    if(slide_cur < (slide_len-1)){
      sel = ".slide" + slide_cur;
      sel2 = ".slide" + (slide_cur+1);
    }
    else{
      sel = ".slide" + (slide_len-1);
      sel2 = ".slide0";
      slide_cur = -1;
    }
    $(sel).hide();
    $(sel2).show();
    slide_cur += 1;
  })

  $('.backward.control').on('click',function(){
    var sel,sel2;
    if(slide_cur == 0){
      sel2 = ".slide0";
      sel = ".slide" + (slide_len-1);
      slide_cur = slide_len;
    }
    else{
      sel = ".slide" + (slide_cur-1);
      sel2 = ".slide" + slide_cur;
    }

    $(sel2).hide();
    $(sel).show();
    slide_cur -= 1;
  })

  $('.play.control').on('click',function(){
      if(!play_flag){
        $(this).removeClass('play');
        $(this).addClass('pause');
        play_flag = true;
        playSlide();
      }
      else{
        clearTimeout(timer);
        $(this).removeClass('pause');
        $(this).addClass('play');
        play_flag = false;
      }
  })

}

function resetImgSize(){
  console.log('resize');
  $('.image').each(function(){
      var w = $(this).attr('ow');
      var h = $(this).attr('oh');
      $(this).width(w);
      $(this).height(h);
      var sw = $('.slide.disp').width();
      var sh = $('.slide.disp').height();

      var ratio = w/h;

      if(w > sw){
        $(this).width(sw*0.9);
      }
      if(h > sh){

        $(this).height(sh*0.9);
      }

    });
}

function loadPhotos(){
  slide_len = photos.length;
  var slideHTML = ""
  for(var k in photos){
    slideHTML = slideHTML + '<img class="ui image slide'+k+'" src="/image?id=' + photos[k] + '">'
  }
  document.getElementById('slide').innerHTML = slideHTML;
}

function loadTags(){
  $.get("/getTags",{id:albumID},function(res){
      if(res.length == 0){
        document.getElementById('tags').innerHTML = "<div class='ui icon message'> <i class='frown icon'></i> <div class='content'> <div class='header'> This album has no tag yet ... </div> <p>Add some with the add button below !</p> </div> </div>";
        document.getElementById('songs').innerHTML = "<div class='ui icon message'> <i class='frown icon'></i> <div class='content'> <div class='header'> We need some tag to recommend ... </div> <p>Add some in left tag page !</p> </div> </div>";
        document.getElementById('song_page').innerHTML = "";
      }
      else{
        var tagsHTML="";
        for(var k in res){
          tagsHTML = tagsHTML + "<div class='ui label tag"+k+"'>"+res[k]+"<i class='delete icon' onclick='deleteTag("+k+")'></i></div>";
        }
        document.getElementById('tags').innerHTML = tagsHTML;
        loadSong();
      }
  })
}

function songDisp(){
  $( '.ui .segment .tag' )
    .hide()
    .end()
    .find('.ui.segment.song')
    .slideDown();
}

function tagDisp(){
  $( '.ui.segment.song' )
    .hide()
    .end()
    .find('.ui.segment.tag')
    .slideDown();
}

function deleteTag(k){
  $.get("/delTag",{id:albumID,tag:$('.tag'+k).text()},function(res){
    if(res.success)
      loadTags();
  });
}

function loadSong(tags){
  $.get("/getRecSong",{id:albumID},function(res){
      //console.log(res);
      var songsMaxHeight = $('.stacked.slide.segment').height()-$('.tabular.menu').height();
      var page = 1;

      if(res.length > 0){
        var songHTML = "<div class='ui basic segment song_disp page1'>";
        for(var k in res){
          console.log(songsMaxHeight);
          songsMaxHeight -= 110;
          songHTML = songHTML + "<div class='ui song message'><img class='ui song image' src='"+res[k].image+"'><div class='song content'><div class='header'>"+res[k].name+"</div><p>"+res[k].artist+"</p></div><div class='song control'><i class='song play icon' song="+k+"></i></div></div>";
          var audioElement = document.createElement('audio');
          audioElement.setAttribute('src',res[k].preview);
          songs.push(audioElement);
          if(songsMaxHeight <= 330 && k<res.length-1){
            page += 1;
            songsMaxHeight = $('.stacked.slide.segment').height()-$('.tabular.menu').height();
            songHTML += "</div><div class='ui inactive basic segment song_disp page"+page+"'>";
          }
        }
        songHTML += "</div>"
        document.getElementById('songs').innerHTML = songHTML;
        $('.inactive').hide();

        var pageHTML = "<a class='icon item' dir='-1'><i class='left arrow icon'></i></a><a class='active pnum item page1'>1</a>";
        for(var k = 2;k <= page;k++){
          pageHTML = pageHTML + "<a class='pnum item page"+k+"'>"+k+"</a>";
        }
        pageHTML += "<a class='icon item' dir='1'><i class='right arrow icon'></i>";
        document.getElementById('song_page').innerHTML = pageHTML;

        $('.page .pnum.item').click(function(){
          if(songNowPage != $(this).text()){
            $('.page .pnum.item').removeClass('active');
            $(this).addClass('active');
            $('.segment.page'+songNowPage).hide();
            $('.segment.page'+$(this).text()).slideDown();
            songNowPage = $(this).text();
          }
        })

        $('.page .icon.item').click(function(){
          console.log(page);
          var nextPage = parseInt(songNowPage) + parseInt($(this).attr('dir'));
          if(!(nextPage>page || nextPage<1)){
            $('.page .pnum.item').removeClass('active');
            $('.page .pnum.item.page'+nextPage).addClass('active');
            $('.segment.page'+songNowPage).hide();
            $('.segment.page'+nextPage).slideDown();
            songNowPage = nextPage;
          }
        })

        $('.song.play').click(function() {
          if(nowPlaying != null){
            var t = $('.song.pause').attr('song');
            songs[t].pause();
            $('.song.pause').removeClass('pause').addClass('play');
            if(t == $(this).attr('song')){
              nowPlaying = null;
              return;
            }
          }
          var song = songs[$(this).attr('song')];
          nowPlaying = $(this);
          song.play();
          $(this).removeClass('play');
          $(this).addClass('pause');
        })

        $.each(songs,function(){
          $(this).on('ended',function(){
            $('.song.pause').removeClass('pause').addClass('play');
            nowPlaying = null;
          })
        })
      }
      else{
        document.getElementById('songs').innerHTML = "<div class='ui icon message'> <i class='frown icon'></i> <div class='content'> <div class='header'> Sorry, no song for these tags yet ... </div> <p>Try to add other tag in left tag page !</p> </div> </div>";
        document.getElementById('song_page').innerHTML = "";
      }
  })
}

function newTag(){
  var tag = $('#newTag').val();
  if(tag != null){
    $.get("/addTag",{id:albumID,tag:tag},function(res){
      if(res.success)
        loadTags();
    });
  }
  $('.manage .tag .button').popup('hide');
}

function playSlide(){
  if(!play_flag)
    return;
  timer = setTimeout(function(){
    var sel,sel2;
    if(slide_cur < (slide_len-1)){
      sel = ".slide" + slide_cur;
      sel2 = ".slide" + (slide_cur+1);
    }
    else{
      sel = ".slide" + (slide_len-1);
      sel2 = ".slide0";
      slide_cur = -1;
    }
    $(sel).hide();
    $(sel2).show();
    slide_cur += 1;

    playSlide();
  },2000)
}
