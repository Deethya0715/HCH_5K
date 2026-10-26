(function () {
  'use strict';

  var OUT_W = 1080;
  var OUT_H = 1350;
  var MAX_SOURCE = 15 * 1024 * 1024;
  var MAX_OUTPUT = 4 * 1024 * 1024;

  var form = document.getElementById('checkinForm');
  var canvas = document.getElementById('previewCanvas');
  if (!form || !canvas) return;

  var frameOn = document.getElementById('frameOn');
  var nameTag = document.getElementById('nameTag');
  var heroName = document.getElementById('heroName');
  var userName = document.getElementById('userName');
  var caption = document.getElementById('caption');
  var captionCount = document.getElementById('captionCount');
  var locationTag = document.getElementById('locationTag');
  var formAlert = document.getElementById('formAlert');
  var submitButton = document.getElementById('submitCheckin');
  var takePhoto = document.getElementById('takePhoto');
  var uploadPhoto = document.getElementById('uploadPhoto');
  var photoCamera = document.getElementById('photoCamera');
  var photoLibrary = document.getElementById('photoLibrary');
  var dropZone = document.getElementById('dropZone');
  var stampButtons = Array.prototype.slice.call(document.querySelectorAll('[data-stamp]'));
  var photo = null;
  var drawFrame = 0;

  var FRAMES = {
    gold: { wash: 'rgba(245, 158, 11, 0.4)', edge: '#d97706', mark: '#d97706' },
    teal: { wash: 'rgba(13, 148, 136, 0.4)', edge: '#0f766e', mark: '#0f766e' },
    white: { wash: 'rgba(255, 255, 255, 0.45)', edge: '#64748b', mark: '#f8fafc', markStroke: '#475569' }
  };

  function showError(message, field) {
    formAlert.textContent = message;
    formAlert.classList.remove('hidden');
    if (field && field.focus) field.focus();
    formAlert.scrollIntoView({ block: 'nearest' });
  }

  function hideError() {
    formAlert.textContent = '';
    formAlert.classList.add('hidden');
  }

  function selectedRibbon() {
    var input = form.querySelector('input[name="ribbonColor"]:checked');
    return input ? input.value : 'gold';
  }

  function selectedStamp() {
    var pressed = stampButtons.filter(function (button) {
      return button.getAttribute('aria-pressed') === 'true';
    })[0];
    return pressed ? pressed.getAttribute('data-stamp') : 'none';
  }

  function setStamp(value) {
    stampButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-stamp') === value ? 'true' : 'false');
    });
    scheduleDraw();
  }

  function roundPath(ctx, x, y, w, h, radius) {
    var r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fitText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    var trimmed = text;
    while (trimmed.length > 1 && ctx.measureText(trimmed + '…').width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    return trimmed + '…';
  }

  function drawRibbonMark(ctx, x, y, theme) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = theme.mark;
    ctx.strokeStyle = theme.markStroke || 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(22, 10);
    ctx.bezierCurveTo(22, 10, 2, 12, 5, 26);
    ctx.bezierCurveTo(8, 38, 20, 36, 22, 48);
    ctx.bezierCurveTo(24, 36, 36, 38, 39, 26);
    ctx.bezierCurveTo(42, 12, 22, 10, 22, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(15, 42);
    ctx.lineTo(8, 66);
    ctx.lineTo(18, 54);
    ctx.lineTo(22, 68);
    ctx.lineTo(26, 54);
    ctx.lineTo(36, 66);
    ctx.lineTo(29, 42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawBadge(ctx, theme) {
    var label = 'Hope. Cope. Heal.';
    ctx.save();
    ctx.font = '700 30px Georgia, "Times New Roman", serif';
    var textWidth = ctx.measureText(label).width;
    var x = 48;
    var y = 48;
    var h = 92;
    var w = textWidth + 124;
    roundPath(ctx, x, y, w, h, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.fill();
    drawRibbonMark(ctx, x + 18, y + 12, theme);
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 84, y + h / 2);
    ctx.restore();
  }

  function drawFrameOverlay(ctx, ribbon) {
    var theme = FRAMES[ribbon] || FRAMES.gold;
    ctx.save();
    var wash = ctx.createLinearGradient(0, 0, 0, OUT_H);
    wash.addColorStop(0, theme.wash);
    wash.addColorStop(0.2, 'rgba(0,0,0,0)');
    wash.addColorStop(0.8, 'rgba(0,0,0,0)');
    wash.addColorStop(1, theme.wash);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    ctx.strokeStyle = theme.edge;
    ctx.lineWidth = 36;
    ctx.strokeRect(18, 18, OUT_W - 36, OUT_H - 36);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 6;
    ctx.strokeRect(42, 42, OUT_W - 84, OUT_H - 84);
    drawBadge(ctx, theme);
    ctx.restore();
  }

  function drawStamp(ctx, kind) {
    var lines = kind === 'virtual' ? ['VIRTUAL', 'PARTICIPANT'] : ['TRIBUTE TRAIL', '2027'];
    var accent = kind === 'virtual' ? '#5eead4' : '#fcd34d';
    ctx.save();
    ctx.translate(OUT_W - 188, 268);
    ctx.rotate(-0.2);
    ctx.beginPath();
    ctx.arc(0, 0, 126, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = accent;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 108, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 22px Georgia, "Times New Roman", serif';
    var size = 22;
    while (size > 14 && ctx.measureText(lines[0]).width > 180) {
      size -= 1;
      ctx.font = '700 ' + size + 'px Georgia, "Times New Roman", serif';
    }
    ctx.fillText(lines[0], 0, -18);
    ctx.fillStyle = accent;
    ctx.font = '700 34px Georgia, "Times New Roman", serif';
    ctx.fillText(lines[1], 0, 22);
    ctx.restore();
  }

  function drawNameTag(ctx, name) {
    ctx.save();
    var scrim = ctx.createLinearGradient(0, OUT_H - 340, 0, OUT_H);
    scrim.addColorStop(0, 'rgba(15,23,42,0)');
    scrim.addColorStop(1, 'rgba(15,23,42,0.55)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, OUT_H - 340, OUT_W, 340);
    ctx.font = '700 46px Georgia, "Times New Roman", serif';
    var text = fitText(ctx, 'For ' + name, OUT_W - 180);
    var width = ctx.measureText(text).width + 64;
    var x = 48;
    var y = OUT_H - 156;
    var h = 96;
    roundPath(ctx, x, y, width, h, 48);
    ctx.fillStyle = 'rgba(15,23,42,0.82)';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 32, y + h / 2);
    ctx.restore();
  }

  function drawPlaceholder(ctx) {
    var background = ctx.createLinearGradient(0, 0, OUT_W, OUT_H);
    background.addColorStop(0, '#fff7ed');
    background.addColorStop(1, '#f8fafc');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 54px Georgia, "Times New Roman", serif';
    ctx.fillText('Your photo', OUT_W / 2, OUT_H / 2 - 24);
    ctx.font = '500 32px Georgia, "Times New Roman", serif';
    ctx.fillText('appears here', OUT_W / 2, OUT_H / 2 + 36);
  }

  function drawCover(ctx, image) {
    var scale = Math.max(OUT_W / image.width, OUT_H / image.height);
    var width = image.width * scale;
    var height = image.height * scale;
    ctx.drawImage(image, (OUT_W - width) / 2, (OUT_H - height) / 2, width, height);
  }

  function draw() {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (canvas.width !== OUT_W) canvas.width = OUT_W;
    if (canvas.height !== OUT_H) canvas.height = OUT_H;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (photo) drawCover(ctx, photo);
    else drawPlaceholder(ctx);
    if (frameOn.checked) drawFrameOverlay(ctx, selectedRibbon());
    var stamp = selectedStamp();
    if (stamp === 'trail' || stamp === 'virtual') drawStamp(ctx, stamp);
    var hero = heroName.value.replace(/\s+/g, ' ').trim();
    if (nameTag.checked && hero) drawNameTag(ctx, hero);
  }

  function scheduleDraw() {
    if (drawFrame) return;
    drawFrame = requestAnimationFrame(function () {
      drawFrame = 0;
      draw();
    });
  }

  function loadPhoto(file) {
    if (!file) return;
    if (file.size > MAX_SOURCE) {
      showError('Use a photo smaller than 15 MB.', null);
      return;
    }
    var loader;
    if (typeof createImageBitmap === 'function') {
      try {
        loader = createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () {
          return createImageBitmap(file);
        });
      } catch (e) {
        try {
          loader = createImageBitmap(file);
        } catch (err) {
          loader = Promise.reject(err);
        }
      }
    } else {
      loader = new Promise(function (resolve, reject) {
          var url = URL.createObjectURL(file);
          var image = new Image();
          image.onload = function () {
            URL.revokeObjectURL(url);
            resolve(image);
          };
          image.onerror = function () {
            URL.revokeObjectURL(url);
            reject(new Error('image'));
          };
          image.src = url;
        });
    }
    loader.then(function (bitmap) {
      if (photo && photo.close) photo.close();
      photo = bitmap;
      hideError();
      draw();
    }).catch(function () {
      showError('Use a JPG or PNG photo.', null);
    });
  }

  function hasMultipleSentences(value) {
    var parts = value.split(/[.!?]+/).map(function (part) {
      return part.trim();
    }).filter(Boolean);
    var abbrev = /^(dr|mr|mrs|ms|st|jr|sr|mt|ft)$/i;
    var count = 0;
    var pending = false;
    parts.forEach(function (part) {
      var words = part.split(/\s+/).filter(Boolean);
      var token = words[0] || '';
      if (words.length === 1 && (abbrev.test(token) || /^[A-Za-z]$/.test(token))) {
        pending = true;
        return;
      }
      count += 1;
      pending = false;
    });
    if (pending) count += 1;
    return count > 1;
  }

  function validate() {
    var name = userName.value.replace(/\s+/g, ' ').trim();
    var note = caption.value.replace(/\s+/g, ' ').trim();
    var hero = heroName.value.replace(/\s+/g, ' ').trim();
    if (!photo) return { message: 'Add a photo to check in.', field: takePhoto };
    if (name.length < 2) return { message: 'Enter your name.', field: userName };
    if (name.length > 80) return { message: 'One of the fields is too long.', field: userName };
    if (note.length < 3 || !/[A-Za-z]/.test(note)) {
      return { message: 'Write a one-sentence kindness note.', field: caption };
    }
    if (note.length > 180) return { message: 'One of the fields is too long.', field: caption };
    if (hasMultipleSentences(note)) return { message: 'Keep the note to a single sentence.', field: caption };
    if (!locationTag.value) return { message: 'Choose a trail location.', field: locationTag };
    if (nameTag.checked && hero.length < 2) {
      return { message: "Enter the hero's name to show the name tag.", field: heroName };
    }
    if (hero.length > 40) return { message: 'One of the fields is too long.', field: heroName };
    return {
      data: {
        userName: name,
        caption: note,
        ribbonColor: selectedRibbon(),
        locationTag: locationTag.value
      }
    };
  }

  function canvasBlob(quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) reject(new Error('blob'));
        else resolve(blob);
      }, 'image/jpeg', quality);
    });
  }

  function exportPhoto() {
    var quality = 0.86;
    return canvasBlob(quality).then(function (blob) {
      function shrink(current, q) {
        if (current.size <= MAX_OUTPUT || q <= 0.5) return current;
        return canvasBlob(q - 0.12).then(function (smaller) {
          return shrink(smaller, q - 0.12);
        });
      }
      return shrink(blob, quality);
    });
  }

  takePhoto.addEventListener('click', function () { photoCamera.click(); });
  uploadPhoto.addEventListener('click', function () { photoLibrary.click(); });
  photoCamera.addEventListener('change', function () {
    loadPhoto(photoCamera.files && photoCamera.files[0]);
    photoCamera.value = '';
  });
  photoLibrary.addEventListener('change', function () {
    loadPhoto(photoLibrary.files && photoLibrary.files[0]);
    photoLibrary.value = '';
  });

  dropZone.addEventListener('dragover', function (event) { event.preventDefault(); });
  dropZone.addEventListener('drop', function (event) {
    event.preventDefault();
    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    loadPhoto(file);
  });

  stampButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setStamp(button.getAttribute('data-stamp'));
    });
  });

  form.querySelectorAll('input[name="ribbonColor"]').forEach(function (input) {
    input.addEventListener('change', scheduleDraw);
  });
  frameOn.addEventListener('change', scheduleDraw);
  nameTag.addEventListener('change', scheduleDraw);
  heroName.addEventListener('input', scheduleDraw);
  caption.addEventListener('input', function () {
    captionCount.textContent = caption.value.length + ' / 180';
  });
  locationTag.addEventListener('change', function () {
    if (locationTag.value === 'Participating from Home' && selectedStamp() === 'none') {
      setStamp('virtual');
    }
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    hideError();
    var validated = validate();
    if (validated.message) {
      showError(validated.message, validated.field);
      return;
    }
    draw();
    submitButton.disabled = true;
    var originalLabel = submitButton.textContent;
    submitButton.textContent = 'Posting…';
    exportPhoto().then(function (blob) {
      if (!blob || blob.size > MAX_OUTPUT) {
        throw new Error('That photo is too large. Try a different one.');
      }
      var body = new FormData();
      body.set('userName', validated.data.userName);
      body.set('caption', validated.data.caption);
      body.set('ribbonColor', validated.data.ribbonColor);
      body.set('locationTag', validated.data.locationTag);
      body.set('photo', blob, 'trail-checkin.jpg');
      return fetch('/api/trail-feed', { method: 'POST', body: body });
    }).then(function (response) {
      return response.json().then(function (payload) {
        return { ok: response.ok, payload: payload };
      });
    }).then(function (result) {
      if (!result.ok || !result.payload || !result.payload.id) {
        throw new Error((result.payload && result.payload.error) || 'We could not save this check-in. Please try again.');
      }
      try {
        sessionStorage.setItem('hch-trail-notice', 'Your check-in is on the community trail.');
      } catch (e) {}
      location.assign('/trail-feed#checkin-' + result.payload.id);
    }).catch(function (error) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
      var message = error && error.message && error.message !== 'blob'
        ? error.message
        : 'We could not save this check-in. Please try again.';
      showError(message, null);
    });
  });

  scheduleDraw();
})();
