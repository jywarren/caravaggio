var $T

jQuery(document).ready(function($) {

$T = {
  pos: 0,
  resetOrig: true,

  initialize: function(args) {
    this.options.height = args['height'] || 480//720
    this.options.width = args['width'] || 640//1280
    this.height = this.options.height
    this.width =  this.options.width

    getUserMedia(this.options, this.success, this.deviceError)
    window.webcam = this.options
    this.canvas = document.getElementById("canvas")
    this.originalBuffer = document.getElementById("original")
    this.liveBuffer = document.getElementById("live")

    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.width = this.width+"px"
    this.canvas.style.height = this.height+"px"

    this.liveBuffer.width = this.width
    this.liveBuffer.height = this.height
    this.liveBuffer.style.width = this.width+"px"
    this.liveBuffer.style.height = this.height+"px"

    this.originalBuffer.width = this.width
    this.originalBuffer.height = this.height
    this.originalBuffer.style.width = this.width+"px"
    this.originalBuffer.style.height = this.height+"px"

    this.ctx = this.canvas.getContext("2d")
    this.lctx = this.liveBuffer.getContext("2d")
    this.octx = this.originalBuffer.getContext("2d")
  },
  success: function (stream) {
    //console.log('success')
    if ($T.options.context === 'webrtc') {
      //console.log('webrtc')
      var video = $T.options.videoEl,
              vendorURL = window.URL || window.webkitURL;
      video.src = vendorURL ? vendorURL.createObjectURL(stream) : stream;
      video.onerror = function () {
        stream.stop();
        streamError();
      };
    }
    setTimeout(function() { $T.resetOrig = true }, 1000)
  },
  deviceError: function (error) {
    console.log(error)
  },
  // options contains the configuration information for the shim
  // it allows us to specify the width and height of the video
  // output we're working with, the location of the fallback swf,
  // events that are triggered onCapture and onSave (for the fallback)
  // and so on.
  options: {

    "audio": true,
    "video": true,

    // the element (by id) you wish to apply
    el: "webcam",

    extern: null,
    append: true,

    // the recommended mode to be used is 'callback '
    // where a callback is executed once data
    // is available
    mode: "callback",

    // the flash fallback Url
    swffile: "/javascripts/webcam-fallback/jscam_canvas_only.swf",

    // quality of the fallback stream
    quality: 100,
    context: "",

    debug: function () {},

    // callback for capturing the fallback stream
    onCapture: function () {
        window.webcam.save();
    },

    // callback for saving the stream, useful for
    // relaying data further.
    onSave: function (data) {
    // in progress for Flash now
    // seems to execute 240 times... once for each column?
    var col = data.split(";"),
      img = $T.canvas.getContext('2d').getImageData(0, 0, this.width, this.height);
      tmp = null,
      w = this.width,
      h = this.height;
 
    // USE THIS LOGIC FOR FRAME-BY-FRAME TOO:
    for (var i = 0; i < w; i++) { 
      tmp = parseInt(col[i], 10);
      img.data[$T.pos + 0] = (tmp >> 16) & 0xff;
      img.data[$T.pos + 1] = (tmp >> 8) & 0xff;
      img.data[$T.pos + 2] = tmp & 0xff;
      img.data[$T.pos + 3] = 0xff;
      $T.pos += 4;
    }
    
    if ($T.pos >= 4 * w * $T.sample_height) { 
      $T.canvas.getContext('2d').putImageData(img, 0, 0);
      $T.ctx.drawImage(img, 0, 0);
      $T.pos = 0;
    }

  },
  onLoad: function () {}
},

capture: function() {
    if ($T.options.context === 'webrtc') {
      var video = document.getElementsByTagName('video')[0]; 
      //copy from video stream into live buffer
      $T.lctx.drawImage(video, 0, 0);
    } else {
      console.log('No context was supplied to getSnapshot()');
    }
    $T.displayImg = $T.ctx.getImageData(0,0,$T.width,$T.height);
    if ($T.resetOrig) {
      $T.octx.drawImage(video, 0, 0);
      $T.originalImg = $T.octx.getImageData(0,0,$T.width,$T.height);
      $T.resetOrig = false
    }
    $T.liveImg = $T.lctx.getImageData(0,0,$T.width,$T.height);

    for (i=0;i<(4*$T.width*$T.height);i+=4) { 
      lr = $T.liveImg.data[i+0]
      lg = $T.liveImg.data[i+1]
      lb = $T.liveImg.data[i+2]
      or = $T.originalImg.data[i+0]
      og = $T.originalImg.data[i+1]
      ob = $T.originalImg.data[i+2]

      var darken = 140;
      var diff = Math.abs((lr-or)+(lg-og)+(lb-ob))/(255.00*3);

//     move all this into a function users can write realtime 

      // knock out original color proportionally to diff
      $T.displayImg.data[i+0] = (or)-darken;
      $T.displayImg.data[i+1] = (og)-darken;
      $T.displayImg.data[i+2] = (ob)-darken;

      // add new color proportionally to diff
      //if (diff > 0.1) {
        $T.displayImg.data[i+0] += (lr)*diff;
        $T.displayImg.data[i+1] += (lg)*diff;
        $T.displayImg.data[i+2] += (lb)*diff;
      //}
      $T.displayImg.data[i+3] = 255;
    } 
    $T.clear(); 
    $T.ctx.putImageData($T.displayImg,0,0);

  },
  clear: function() {
    $T.ctx.clearRect(0,0,$T.width,$T.height)
  }
}

/* Utilities */

downloadImage = function() {
  var event, format, lnk;
  lnk = document.createElement("a");
  lnk.href = getCurrentImage();
  if (lnk.href.match('image/jpeg')) {
    format = "jpg";
  } else {
    format = "png";
  }
  lnk.download = (new Date()).toISOString().replace(/:/g, "_") + "." + format;
  if (document.createEvent) {
    event = document.createEvent("MouseEvents");
    event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    lnk.dispatchEvent(event);
  } else if (lnk.fireEvent) {
    lnk.fireEvent("onclick");
  }
  return true;
};

$('#canvas').click(function(){ $T.resetOrig = true });

})
