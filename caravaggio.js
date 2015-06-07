
//$(document).ready(function() {
jQuery(document).ready(function($) {

  $("#image-container").ready(function() {
    glInitInfragram();

    camera.initialize();

    setInterval(function() {
      if (image) { // && video_live
        glRunInfragrammar("raw");
        video_live = true;
      }
      camera.getSnapshot();
    }, 33);
  })

  /* UI */

  $("#download").click(function() {
    downloadImage();
    return true;
  });

});

vertices = [-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0];

vertices.itemSize = 2;

waitForShadersToLoad = 0;

imgContext = null;

baseImage = false;

createBuffer = function(ctx, data) {
  var buffer, gl;
  gl = ctx.gl;
  buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  buffer.itemSize = data.itemSize;
  return buffer;
};

createTexture = function(ctx, textureUnit) {
  var gl, texture;
  gl = ctx.gl;
  texture = gl.createTexture();
  gl.activeTexture(textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ctx.canvas.width, ctx.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  return texture;
};

// This contains much of the actual program:
createContext = function(mode, selColormap, colormap, slider, canvasName) {
  var ctx;
  ctx = new Object();
  ctx.mode = mode;
  ctx.expression = ["", "", ""];
  ctx.selColormap = selColormap;
  ctx.colormap = colormap;
  ctx.slider = slider;
  ctx.updateShader = true;
  ctx.canvas = document.getElementById(canvasName);
  ctx.canvas.width = camera.options.width
  ctx.canvas.height = camera.options.height

  /* if context is lost, which apparently happens sometimes */
  ctx.canvas.addEventListener("webglcontextlost", (function(event) {
    return event.preventDefault();
  }), false);
  ctx.canvas.addEventListener("webglcontextrestored", glRestoreContext, false);

  ctx.gl = getWebGLContext(ctx.canvas);
  if (ctx.gl) {
    ctx.gl.getExtension("OES_texture_float");
    ctx.vertexBuffer = createBuffer(ctx, vertices);
    ctx.framebuffer = ctx.gl.createFramebuffer();
    ctx.imageTexture = createTexture(ctx, ctx.gl.TEXTURE0);
    ctx.baseImageTexture = createTexture(ctx, ctx.gl.TEXTURE1);
    return ctx;
  } else {
    return null;
  }
};

drawScene = function(ctx, returnImage) {
  var gl, pColormap, pHsvUniform, pNdviUniform, pSampler, pBaseSampler, pSelColormapUniform, pVertexPosition;
  if (!returnImage) {
    requestAnimFrame(function() {
      return drawScene(ctx, false);
    });
  }
  if (ctx.updateShader) {
    ctx.updateShader = false;
    generateShader(ctx);
  }

  /* create GL buffer */
  gl = ctx.gl;
  gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  gl.useProgram(ctx.shaderProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, ctx.vertexBuffer);
  pVertexPosition = gl.getAttribLocation(ctx.shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(pVertexPosition);
  gl.vertexAttribPointer(pVertexPosition, ctx.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

  /* I believe this is loading a bunch of "samples" aka textures into the shader, under given variable names */

    /* This seems to be the actual camera video feed. */
    pSampler = gl.getUniformLocation(ctx.shaderProgram, "uSampler");
    gl.uniform1i(pSampler, 0);

    pBaseSampler = gl.getUniformLocation(ctx.shaderProgram, "uBaseSampler");
    gl.uniform1i(pBaseSampler, 0);

    /* may be unnecessary NDVI stuff? */
    pNdviUniform = gl.getUniformLocation(ctx.shaderProgram, "uNdvi");
    gl.uniform1i(pNdviUniform, (ctx.mode === "ndvi" || ctx.colormap ? 1 : 0));
 
    pSelColormapUniform = gl.getUniformLocation(ctx.shaderProgram, "uSelectColormap");
    gl.uniform1i(pSelColormapUniform, ctx.selColormap);
 
    /* may be unnecessary NDVI stuff? */
    pHsvUniform = gl.getUniformLocation(ctx.shaderProgram, "uHsv");
    gl.uniform1i(pHsvUniform, (ctx.mode === "hsv" ? 1 : 0));
 
    pColormap = gl.getUniformLocation(ctx.shaderProgram, "uColormap");
    gl.uniform1i(pColormap, (ctx.colormap ? 1 : 0));

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length / vertices.itemSize);
  if (returnImage) {
    return ctx.canvas.toDataURL("image/jpeg");
  }
};

generateShader = function(ctx) {
  var b, code, g, r, _ref;
  _ref = ctx.expression, r = _ref[0], g = _ref[1], b = _ref[2];
  r = r.toLowerCase().replace(/h/g, "r").replace(/s/g, "g").replace(/v/g, "b");
  g = g.toLowerCase().replace(/h/g, "r").replace(/s/g, "g").replace(/v/g, "b");
  b = b.toLowerCase().replace(/h/g, "r").replace(/s/g, "g").replace(/v/g, "b");
  r = r.replace(/[^xrgb\/\-\+\*\(\)\.0-9]*/g, "");
  g = g.replace(/[^xrgb\/\-\+\*\(\)\.0-9]*/g, "");
  b = b.replace(/[^xrgb\/\-\+\*\(\)\.0-9]*/g, "");
  r = r.replace(/([0-9])([^\.])?/g, "$1.0$2");
  g = g.replace(/([0-9])([^\.])?/g, "$1.0$2");
  b = b.replace(/([0-9])([^\.])?/g, "$1.0$2");
  if (r === "") {
    r = "r";
  }
  if (g === "") {
    g = "g";
  }
  if (b === "") {
    b = "b";
  }
  code = $("#shader-fs-template").html();
  code = code.replace(/@1@/g, r);
  code = code.replace(/@2@/g, g);
  code = code.replace(/@3@/g, b);
  $("#shader-fs").html(code);
  return ctx.shaderProgram = createProgramFromScripts(ctx.gl, ["shader-vs", "shader-fs"]);
};

glSetMode = function(ctx, newMode) {
  ctx.mode = newMode;
  ctx.updateShader = true;
};

glShaderLoaded = function() {
  waitForShadersToLoad -= 1;
  if (!waitForShadersToLoad) {
    return drawScene(imgContext);
  }
};

glInitInfragram = function() {
  imgContext = createContext("raw", 1, 0, 1.0, "image");
  waitForShadersToLoad = 2;
  $("#shader-vs").load("shader.vert", glShaderLoaded);
  $("#shader-fs-template").load("shader.frag", glShaderLoaded);
  if (imgContext) {
    return true;
  } else {
    return false;
  }
};

glRestoreContext = function() {
  var imageData;
  imageData = imgContext.imageData;
  imgContext = createContext(imgContext.mode, imgContext.selColormap, imgContext.colormap, imgContext.slider, "image");
  if (imgContext) {
    return glUpdateImage(imageData);
  }
};

glUpdateImage = function(img) {
  var gl;
  gl = imgContext.gl;
  imgContext.imageData = img;
  gl.activeTexture(gl.TEXTURE0);
  return gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
};

glGetCurrentImage = function() {
  return drawScene(imgContext, true);
};

glRunInfragrammar = function(mode) {
  return glSetMode(imgContext, "ndvi");
};

/* camera init */

camera = {
  initialize: function() {
    getUserMedia(this.options, this.success, this.deviceError);
    window.webcam = this.options;
    this.canvas = document.getElementById("image");
    this.ctx = this.canvas.getContext("2d");
    $("#webcam-activate").hide();
    $("#snapshot").show();
    $("#live-video").show();
    return $("#webcam").show();
  },
  options: {
    "audio": false,
    "video": true,
    el: "webcam",
    extern: null,
    append: true,
    width: 1920, //$('body').width(),
    height: 1080, //$('body').height(),
    mode: "callback",
    swffile: "bower_components//fallback/jscam_canvas_only.swf",
    quality: 100,
    debug: function() {},
    onCapture: function() {
      return window.webcam.save();
    },
    onSave: function(data) {
      var col, h, i, img, tmp, w, _i, _ref;
      col = data.split("");
      img = camera.image;
      tmp = null;
      w = this.width;
      h = this.height;
      for (i = _i = 0, _ref = w - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        tmp = parseInt(col[i], 10);
        img.data[camera.pos + 0] = (tmp >> 16) & 0xff;
        img.data[camera.pos + 1] = (tmp >> 8) & 0xff;
        img.data[camera.pos + 2] = tmp & 0xff;
        img.data[camera.pos + 3] = 0xff;
        camera.pos += 4;
      }
      if (camera.pos >= 4 * w * h) {
        camera.ctx.putImageData(img, 0, 0);
        return camera.pos = 0;
      }
    },
    onLoad: function() {}
  },
  success: function(stream) {
    var vendorURL, video;
    if (camera.options.context === "webrtc") {
      video = camera.options.videoEl;
      vendorURL = window.URL || window.webkitURL;
      if (navigator.mozGetUserMedia) {
        video.mozSrcObject = stream;
        console.log("mozilla???");
      } else if ((typeof MediaStream !== "undefined" && MediaStream !== null) && stream instanceof MediaStream) {
        video.src = stream;
        return video.play();
      } else {
        video.src = vendorURL ? vendorURL.createObjectURL(stream) : stream;
      }
      return video.onerror = function(e) {
        return stream.stop();
      };
    } else {

    }
  },
  deviceError: function(error) {
    alert("No camera available.");
    console.log(error);
    return console.error("An error occurred: [CODE " + error.code + "]");
  },
  getSnapshot: function() {
    var video;
    if (camera.options.context === "webrtc") {
      video = document.getElementsByTagName("video")[0];

      if (!baseImage) {
        baseImage = video;
      }

      glUpdateImage(video);
      return $("#webcam").hide();
    } else if (camera.options.context === "flash") {
      return window.webcam.capture();
    } else {
      return alert("No context was supplied to getSnapshot()");
    }
  }
};


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
