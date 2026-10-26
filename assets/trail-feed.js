(function () {
  'use strict';

  var grid = document.getElementById('feedGrid');
  var reportDialog = document.getElementById('reportDialog');
  var reportName = document.getElementById('reportName');
  var feedStatus = document.getElementById('feedStatus');
  var feedNotice = document.getElementById('feedNotice');
  if (!grid) return;

  var blobs = new Map();
  var blobOrder = [];
  var inflight = new Map();
  var pendingArticle = null;
  var REACTION_LABELS = { hearts: 'Heart', candles: 'Candle', hugs: 'Hug' };

  function setStatus(message) {
    if (!feedStatus) return;
    feedStatus.textContent = message || '';
    feedStatus.classList.toggle('hidden', !message);
  }

  function showNotice() {
    if (!feedNotice) return;
    var message = '';
    try {
      message = sessionStorage.getItem('hch-trail-notice') || '';
      sessionStorage.removeItem('hch-trail-notice');
    } catch (e) {}
    if (!message) return;
    feedNotice.textContent = message;
    feedNotice.classList.remove('hidden');
  }

  function articleOf(node) {
    return node && node.closest ? node.closest('article[data-id]') : null;
  }

  function postFrom(article) {
    if (!article) return null;
    return {
      id: article.dataset.id || '',
      name: article.dataset.name || '',
      caption: article.dataset.caption || '',
      photo: article.dataset.photo || '',
      location: article.dataset.location || ''
    };
  }

  function rememberBlob(id, blob) {
    if (!id || !blob) return;
    if (!blobs.has(id)) blobOrder.push(id);
    blobs.set(id, blob);
    while (blobOrder.length > 8) {
      blobs.delete(blobOrder.shift());
    }
  }

  function prefetch(article) {
    var post = postFrom(article);
    if (!post || !post.photo || blobs.has(post.id) || inflight.has(post.id)) {
      return inflight.get(post && post.id) || Promise.resolve();
    }
    var job = fetch(post.photo)
      .then(function (response) {
        if (!response.ok) throw new Error('photo');
        return response.blob();
      })
      .then(function (blob) {
        rememberBlob(post.id, blob);
        return blob;
      })
      .catch(function () {
        return null;
      })
      .finally(function () {
        inflight.delete(post.id);
      });
    inflight.set(post.id, job);
    return job;
  }

  function shareText(post) {
    return post.name + ' at ' + post.location + ' on the Hope. Cope. Heal. Tribute Trail. "' + post.caption + '"';
  }

  function shareUrl(post) {
    return location.origin + '/trail-feed#checkin-' + post.id;
  }

  function fileFor(blob) {
    var type = blob.type || 'image/jpeg';
    var ext = type === 'image/png' ? 'png' : 'jpg';
    return new File([blob], 'tribute-trail-checkin.' + ext, { type: type });
  }

  function fallbackShare(post, blob) {
    var text = shareText(post) + ' ' + shareUrl(post);
    var copy = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(text).catch(function () {})
      : Promise.resolve();
    copy.finally(function () {
      if (blob) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'tribute-trail-checkin.jpg';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        setStatus('Sharing is not available in this browser. The caption was copied, and the photo downloaded so you can post it.');
        return;
      }
      if (post.photo) {
        var link = document.createElement('a');
        link.href = post.photo;
        link.download = 'tribute-trail-checkin.jpg';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setStatus('Sharing is not available in this browser. The caption was copied so you can paste it with the photo.');
    });
  }

  function shareLink(post) {
    var payload = {
      title: 'Hope. Cope. Heal. Trail Feed',
      text: shareText(post),
      url: shareUrl(post)
    };
    if (!navigator.share) {
      fallbackShare(post, blobs.get(post.id));
      return;
    }
    navigator.share(payload).catch(function (error) {
      if (error && error.name === 'AbortError') return;
      fallbackShare(post, blobs.get(post.id));
    });
  }

  function shareFile(post, blob) {
    var file = fileFor(blob);
    var payload = {
      files: [file],
      title: 'Hope. Cope. Heal. Trail Feed',
      text: shareText(post)
    };
    var canFile = false;
    try {
      canFile = navigator.canShare && navigator.canShare(payload);
    } catch (e) {
      canFile = false;
    }
    if (!navigator.share || !canFile) {
      shareLink(post);
      return;
    }
    navigator.share(payload).catch(function (error) {
      if (error && error.name === 'AbortError') return;
      shareLink(post);
    });
  }

  function onShare(button) {
    var article = articleOf(button);
    var post = postFrom(article);
    if (!post) return;
    prefetch(article);
    var blob = blobs.get(post.id);
    if (blob) shareFile(post, blob);
    else shareLink(post);
  }

  function setCount(button, count) {
    var slot = button.querySelector('[data-count]');
    var key = button.getAttribute('data-reaction');
    if (slot) slot.textContent = String(count);
    var label = REACTION_LABELS[key] || 'Reaction';
    button.setAttribute('aria-label', label + ', ' + count);
  }

  function onReaction(button) {
    var article = articleOf(button);
    var post = postFrom(article);
    var key = button.getAttribute('data-reaction');
    if (!post || !REACTION_LABELS[key] || button.disabled) return;
    var slot = button.querySelector('[data-count]');
    var previous = slot ? slot.textContent : '0';
    var next = (Number(previous) || 0) + 1;
    setCount(button, next);
    button.disabled = true;
    fetch('/api/trail-feed/' + encodeURIComponent(post.id) + '/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction: key })
    })
      .then(function (response) {
        return response.json().then(function (body) {
          return { ok: response.ok, body: body };
        });
      })
      .then(function (result) {
        var counts = result.body && result.body.reactions;
        if (!result.ok || !counts || typeof counts[key] !== 'number') {
          setCount(button, previous);
          setStatus((result.body && result.body.error) || 'That reaction could not be saved.');
          return;
        }
        article.querySelectorAll('[data-reaction]').forEach(function (item) {
          var itemKey = item.getAttribute('data-reaction');
          if (typeof counts[itemKey] === 'number') setCount(item, counts[itemKey]);
        });
      })
      .catch(function () {
        setCount(button, previous);
        setStatus('That reaction could not be saved.');
      })
      .finally(function () {
        button.disabled = false;
      });
  }

  function emptyFeed() {
    if (grid.querySelector('[data-id]')) return;
    grid.textContent = '';
    var note = document.createElement('p');
    note.className = 'col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600';
    note.textContent = 'No check-ins yet. Share a photo and a one-sentence kindness note from the trail.';
    grid.appendChild(note);
  }

  function flagArticle(article) {
    var post = postFrom(article);
    if (!post) return;
    fetch('/api/trail-feed/' + encodeURIComponent(post.id) + '/flag', { method: 'POST' })
      .then(function (response) {
        return response.json().then(function (body) {
          return { ok: response.ok, body: body };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          setStatus((result.body && result.body.error) || 'This check-in could not be hidden.');
          return;
        }
        article.remove();
        setStatus('That check-in was hidden from the feed.');
        emptyFeed();
      })
      .catch(function () {
        setStatus('This check-in could not be hidden.');
      });
  }

  grid.addEventListener('pointerdown', function (event) {
    var share = event.target.closest('[data-share]');
    if (share) prefetch(articleOf(share));
  });

  grid.addEventListener('click', function (event) {
    var reaction = event.target.closest('[data-reaction]');
    if (reaction) {
      onReaction(reaction);
      return;
    }
    var share = event.target.closest('[data-share]');
    if (share) {
      onShare(share);
      return;
    }
    var flag = event.target.closest('[data-flag]');
    if (flag && reportDialog) {
      pendingArticle = articleOf(flag);
      if (!pendingArticle) return;
      if (reportName) reportName.textContent = pendingArticle.dataset.name || 'this person';
      reportDialog.showModal();
    }
  });

  if (reportDialog) {
    reportDialog.addEventListener('close', function () {
      var article = pendingArticle;
      pendingArticle = null;
      if (reportDialog.returnValue !== 'confirm' || !article) return;
      flagArticle(article);
    });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) prefetch(entry.target);
      });
    }, { rootMargin: '240px' });
    grid.querySelectorAll('article[data-id]').forEach(function (article) {
      observer.observe(article);
    });
  }

  showNotice();

  var hash = location.hash.replace(/^#/, '');
  if (hash) {
    var card = document.getElementById(hash);
    if (card) {
      card.classList.add('ring-1', 'ring-gold-300');
      card.scrollIntoView({ block: 'center' });
    }
  }
})();
