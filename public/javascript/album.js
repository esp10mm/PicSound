//menu control var
var curTab = '0';

//album control var
var picLoadCount = 0;
var cards = [];

//slide control var
var slideCur = 0;
var slideLen;
var slidePlay = false;
var timer;

//song play control var
var songs = [];
var nowPlaying = null;
var songNowPage = 1;

//recommending song var
var rsongs = [];
var rsongPlaying = null;

function init(){

  //load album
  $('.stacked.album.segment').height($('.main.segment').height()-55);
  $('.disp.album.segment').height($('.stacked.album.segment').height()-90);
  loadAlbum();

  //load tags (song will be loaded after loadTags())
  loadTags();

  //tab bar init
  $('.tabular .item').on('click',function(){
    curTab = $(this).attr('tab');
    $('.tab0, .tab1, .tab2')
      .hide()
      .end()
      .find('.tab'+curTab)
      .slideDown();
  })

  $('.manage .tag_song .item').on('click', function() {
    $('.manage .tag_song .item').removeClass('active');
    $(this).addClass('active');
  });

  $('.manage .tag .button').popup({
    on: 'click',
  });

  $('.button.songRefresh').click(function(){
    loadSong();
  })

  //recommending song init
  $('#recInput').on('change',function(){

    $('#songSearchLoading').show();

    if(rsongPlaying != null){
      rsongs[rsongPlaying.attr('rsong')].pause();
      rsongs = [];
      rsongPlaying = null;
    }
    var keyword = $('#recInput').val();
    $.get('/spotifySearch?keyword='+keyword,function(res){
      var resultHTML = '';
      console.log(res);
      for(var k in res.tracks.items){
        if(k > 3)
          break;
        var track = res.tracks.items[k];
        // console.log(track.name);
        resultHTML +=
          "<div class='ui song message'><img class='ui song image' src='" + track.album.images[1].url +
          "'><div class='song content'><div class='header'>" + track.name +
          "</div><p>" + track.artists[0].name+"</p></div><div class='song control'>"+
          "<i class='rsong plus icon rsong"+k+"' onclick='addSong(\""+track.id+"\","+k+")'></i>" +
          "<i class='rsong play icon rsong"+k+"' onclick='recommendSongPlay("+k+")' rsong="+k+"></i></div></div>";

        var audioElement = document.createElement('audio');
        audioElement.setAttribute('src',track.preview_url);
        rsongs[k] = audioElement;
      }

      $.each(rsongs,function(){
        $(this).on('ended',function(){
          rsongPlaying.removeClass('pause').addClass('play');
          rsongPlaying = null;
        })
      })

      // resultHTML = "<div class='ui song message'></div>";
      $('#recResult').html(resultHTML);
      $('#songSearchLoading').hide();
    })
  })

  //hide inactive elements
  $('.inactive').hide();

  //else task
  $(window).resize(function() {
    resetImgSize();
  });
  // initSlide();
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

// function loadPhotos(){
//   slideLen = photos.length;
//   var slideHTML = ""
//   for(var k in photos){
//     slideHTML = slideHTML + '<img class="ui image slide'+k+'" src="/image?id=' + photos[k] + '" style="display:none">'
//   }
//   document.getElementById('slide').innerHTML = slideHTML;
//
//   //resize images after they loaded
//   $('.image').on('load',function(){
//     var w = $(this).width()
//     var h = $(this).height()
//     $(this).attr('ow',w)
//     $(this).attr('oh',h)
//     var sw = $('.slide.disp').width()
//     var sh = $('.slide.disp').height()
//     var ratio = w/h
//     if(w > sw){
//       $(this).width(sw)
//       $(this).height(sw/ratio)
//       h = $(this).height()
//     }
//     if(h > sh){
//       $(this).height(sh)
//       $(this).width(sh*ratio)
//     }
//     var top = (sh - $(this).height())/2
//     $(this).css('top',top+'px')
//     if($(this).hasClass('slide0'))
//       $(this).show()
//     loadCount += 1
//     if(loadCount == slideLen)
//       $('.play.control').click()
//   });
// }

function loadAlbum(){
  var photosHTML = '<div class="ui cards">';
  for(var k in photos){
    photosHTML = photosHTML + '<div class="inactive card"><div class="image"><img src="/image?id=' + photos[k] +'"></div></div>';
  }
  photosHTML += '</div>'
  $('.album.disp').html(photosHTML)
  $('img').on('load',function(){
    picLoadCount += 1;
    if(picLoadCount == photos.length)
      rerangeCards();
  })
}

function smallCard(){
  var small;
  $('.inactive.card').each(function(){
    if(small === undefined){
      small = $(this);
    }
    else{
      var dim = small.width()*small.height();
      if($(this).height()*$(this).width() < dim)
        small = $(this)
    }
  })
  small.removeClass('inactive');
  return small
}

function rerangeCards(){
  var newCards = "";
  var k=0;
  $('.inactive.card').each(function(){
    small = smallCard()
    newCards += '<div class="card" cid='+k+'>' + small.html() + '</div>';
    k += 1;
  })

  $('.cards').html(newCards);

  $('.card').each(function(){
    cards.push($(this));
    $(this).click(function(){
      clickPic($(this).attr('cid'))
    })
  })

  initSlide();

}

function clickPic(k){
  if(k==slideLen)
    k=0;
  else if(k<0)
    k=slideLen-1;
  slideCur = k;
  $('.slide.modal').modal('show');
  $('.slide.image').hide();
  $('.slide.image.p'+k).show();
  $('.slide.image.p'+k).css('max-height',$('.slide.pic.disp').height());
  var imgtop = 0.5*($('.slide.pic.disp').height()-$('.slide.image.p'+k).height());
  $('.slide.image.p'+k).css('top',imgtop);
}

function initSlide(){

  slideLen = cards.length;

  var picHTML = "<div class='slide pic disp'>";
  for(var k in cards){
    picHTML += "<img class='ui centered slide image p"+k+"' src='"+cards[k].find('img').attr('src')+"' style='display:none;'>"
  }
  var controlHTML = '<div class="ui center aligned slide control basic segment"><div class="ui buttons"><div class="ui left labeled icon slide control button"><i class="left chevron icon"></i>Back</div><div class="ui slideplay control button"><i class="play icon"></i>Play</div><div class="ui button slide control exit"><i class="remove icon"></i>Exit</div><div class="ui right labeled icon slide control button"><i class="right chevron icon"></i>Forward</div></div></div>'
  picHTML += "</div>";
  $('.fullscreen.slide.modal').html(picHTML+controlHTML);
  $('.slide.pic.disp').height($('.main.segment').height()*0.8);

  $('.slide.control.exit').click(function(){
    if(slidePlay){
      clearTimeout(timer);
      $('.slideplay.control').find('i').removeClass('stop').addClass('play');
      slidePlay = false;
    }
    $('.slide.modal').modal('hide');
  })

  $('.left.slide.control').click(function(){
    clickPic(parseInt(slideCur)-1);
  })

  $('.right.slide.control').click(function(){
    clickPic(parseInt(slideCur)+1);
  })

  $('.slideplay.control').click(function(){
    var icon = $(this).find('i');
    if(slidePlay){
      icon.removeClass('stop').addClass('play');
      slidePlay = false;
    }
    else{
      icon.removeClass('play').addClass('stop');
      slidePlay = true;
      playSlide();
    }
  })

  $('.album.button').click(function(){
    clickPic(slideCur);
    $('.slideplay.control').click();
  })
}

function playSlide(){
  if(slidePlay){
    timer = setTimeout(function(){
      clickPic(parseInt(slideCur)+1)
      playSlide();
    },2000)
  }
  else
    return;
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

function deleteTag(k){
  $.get("/delTag",{id:albumID,tag:$('.tag'+k).text()},function(res){
    if(res.success)
      loadTags();
  });
}

function loadSong(tags){
  var loadingHTML = "<i class='big spinner loading icon'></i>";
  document.getElementById('songs').innerHTML = loadingHTML;
  if(nowPlaying != null){
    songs[nowPlaying.attr('song')].pause();
    nowPlaying = null;
  }
  $.get("/getRecSong",{id:albumID},function(res){
      songs = [];
      songNowPage = 1;
      var songsMaxHeight = $('.stacked.album.segment').height()-$('.tabular.menu').height();
      var page = 1;

      if(res.length > 0){
        var songHTML = "<div class='ui basic segment song_disp page1'>";
        for(var k in res){
          //console.log(songsMaxHeight);
          songsMaxHeight -= 110;
          songHTML = songHTML +
            "<div class='ui song message'><img class='ui song image' src='" +res[k].image +
            "'><div class='song content'><div class='header'>" + res[k].name +
            "</div><p>" + res[k].artist+"</p></div><div class='song control'>"+
            "<i class='song thumbs down outline icon' song='" + res[k].id +
            "'></i><i class='song thumbs up outline icon' song='" + res[k].id + "'></i><i class='song play icon' song="+k+"></i></div></div>";
          // console.log(res[k]);
          var audioElement = document.createElement('audio');
          audioElement.setAttribute('src',res[k].preview);
          songs.push(audioElement);
          if(songsMaxHeight <= 330 && k<res.length-1){
            page += 1;
            songsMaxHeight = $('.stacked.album.segment').height()-$('.tabular.menu').height();
            songHTML += "</div><div class='ui inactive basic segment song_disp page"+page+"'>";
          }

        }
        songHTML += "</div>"
        // document.getElementById('songs').innerHTML = songHTML;
        $('#songs').html(songHTML);
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

        $('.song.thumbs.up').click(function(){
          $(this).removeClass('outline');
          var req = {
            vote: 1,
            album: albumID,
            song: $(this).attr('song')
          }
          $.get('/vote',req,function(res){
            console.log(res);
          })
        })

        $('.song.thumbs.down').click(function(){
          $(this).removeClass('outline');
          var req = {
            vote: -1,
            album: albumID,
            song: $(this).attr('song')
          }
          $.get('/vote',req,function(res){
            console.log(res);
          })
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
          if(rsongPlaying != null){
            rsongs[rsongPlaying.attr('rsong')].pause();
            rsongPlaying
              .removeClass('pause')
              .addClass('play');
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

      if(curTab == '1'){
        $('.tab1').slideDown();
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

function recommendSongPlay(index){
  if(nowPlaying != null){
    songs[nowPlaying.attr('song')].pause();
    nowPlaying
      .removeClass('pause')
      .addClass('play');
    nowPlaying = null;
  }

  if(rsongPlaying != null){
    rsongs[rsongPlaying.attr('rsong')].pause();
    rsongPlaying
      .removeClass('pause')
      .addClass('play');
    if(rsongPlaying.attr('rsong') == index){
      rsongPlaying = null;
      console.log('self')
      return;
    }
  }

  rsongPlaying = $('.rsong.play.rsong'+index);
  rsongPlaying
    .removeClass('play')
    .addClass('pause');
  rsongs[index].play();
}

function addSong(sid,index){
  $('.plus.icon.rsong'+index)
    .removeClass('plus')
    .addClass('loading')
  $.get("/addRecSong",{aid:albumID,sid:sid},function(res){
    console.log('add song success!')
    $('.loading.icon.rsong'+index)
      .removeClass('loading')
      .addClass('checkmark')
      .addClass('green')
  })
}
