(function () {
  'use strict';

  var WORD_LIMIT = 25;
  var SPONSOR_PRICE = 40;
  var MAX_PHOTO_BYTES = 4 * 1024 * 1024;

  var RIBBONS = {
    treatment: 'In Treatment (gold ribbon)',
    survivor: 'Survivor (teal ribbon)',
    memory: 'In Loving Memory (white dove)'
  };

  var form = document.getElementById('tributeForm');
  if (!form) return;

  var wordCount = document.getElementById('wordCount');
  var message = document.getElementById('message');
  var signFee = document.getElementById('signFee');
  var summaryRibbon = document.getElementById('summaryRibbon');
  var summaryPhoto = document.getElementById('summaryPhoto');
  var summaryType = document.getElementById('summaryType');
  var formAlert = document.getElementById('formAlert');
  var sponsorWrap = document.getElementById('sponsorWrap');
  var sponsorName = document.getElementById('sponsorName');
  var survivorWrap = document.getElementById('survivorWrap');
  var mailWrap = document.getElementById('mailWrap');
  var mailAddress = document.getElementById('mailAddress');
  var confirmation = document.getElementById('tributeConfirmation');
  var confirmationHeading = document.getElementById('confirmationHeading');
  var confirmationEyebrow = document.getElementById('confirmationEyebrow');
  var confirmationIntro = document.getElementById('confirmationIntro');
  var submitDedication = document.getElementById('submitDedication');
  var submitError = document.getElementById('submitError');
  var emailPhoto = document.getElementById('emailPhoto');
  var editDedication = document.getElementById('editDedication');

  var yourName = document.getElementById('yourName');
  var yourEmail = document.getElementById('yourEmail');
  var yourPhone = document.getElementById('yourPhone');
  var relationship = document.getElementById('relationship');
  var heroName = document.getElementById('heroName');
  var heroPhoto = document.getElementById('heroPhoto');
  var heroPhotoPreview = document.getElementById('heroPhotoPreview');
  var confirmationPhoto = document.getElementById('confirmationPhoto');
  var qrLink = document.getElementById('qrLink');
  var previewUrl = '';
  var treatmentDate = document.getElementById('treatmentDate');
  var milestone = document.getElementById('milestone');

  function money(amount) {
    return amount === 0 ? 'Free' : '$' + amount;
  }

  function motion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isUrl(value) {
    return /^https?:\/\/\S+$/i.test(value);
  }

  function words(value) {
    var trimmed = String(value || '').trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  function selectedValue(name) {
    var selected = form.querySelector('input[name="' + name + '"]:checked');
    return selected ? selected.value : '';
  }

  function errorElement(input) {
    var id = input.getAttribute('aria-errormessage') || (input.id ? input.id + '-error' : '');
    return id ? document.getElementById(id) : null;
  }

  function flag(input, messageText) {
    var error = errorElement(input);
    input.setAttribute('aria-invalid', 'true');
    if (error) {
      error.textContent = messageText;
      error.classList.remove('hidden');
    }
    return input;
  }

  function clearFieldError(input) {
    if (!input || !input.getAttribute) return;
    input.removeAttribute('aria-invalid');
    var error = errorElement(input);
    if (!error) return;
    error.textContent = '';
    error.classList.add('hidden');
  }

  function selectedPhoto() {
    return heroPhoto && heroPhoto.files && heroPhoto.files[0] ? heroPhoto.files[0] : null;
  }

  function photoFileError(file) {
    if (!file || !file.size) return 'Attach a photo of your hero.';
    var type = String(file.type || '').toLowerCase();
    var name = String(file.name || '');
    var allowedType = type === 'image/png' || type === 'image/jpeg' || type === 'image/jpg';
    var allowedName = /\.(png|jpe?g)$/i.test(name);
    if (type && !allowedType) return 'Use a PNG, JPG, or JPEG photo.';
    if (!type && !allowedName) return 'Use a PNG, JPG, or JPEG photo.';
    if (!allowedType && !allowedName) return 'Use a PNG, JPG, or JPEG photo.';
    if (file.size > MAX_PHOTO_BYTES) return 'Use a photo smaller than 4 MB.';
    return '';
  }

  function showPreview(file) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
    if (!heroPhotoPreview) return;
    if (!file) {
      heroPhotoPreview.hidden = true;
      heroPhotoPreview.removeAttribute('src');
      heroPhotoPreview.alt = '';
      return;
    }
    previewUrl = URL.createObjectURL(file);
    heroPhotoPreview.src = previewUrl;
    heroPhotoPreview.alt = 'Selected photo of ' + (heroName.value.trim() || 'your hero');
    heroPhotoPreview.hidden = false;
  }

  function ribbonLabel(value) {
    return RIBBONS[value] || 'Not chosen';
  }

  function dedicationLabel() {
    return selectedValue('dedication') === 'sponsor'
      ? 'Sponsor a sign ($40)'
      : 'Pediatric cancer family (free)';
  }

  function feeAmount() {
    return selectedValue('dedication') === 'sponsor' ? SPONSOR_PRICE : 0;
  }

  function updateSummary() {
    var count = words(message.value);
    wordCount.textContent = count + ' / ' + WORD_LIMIT + ' words';
    wordCount.classList.toggle('text-red-700', count > WORD_LIMIT);
    wordCount.classList.toggle('text-slate-500', count <= WORD_LIMIT);
    signFee.textContent = money(feeAmount());
    summaryRibbon.textContent = ribbonLabel(selectedValue('ribbon'));
    summaryType.textContent = dedicationLabel();
    if (summaryPhoto) {
      var photo = selectedPhoto();
      summaryPhoto.textContent = photo && !photoFileError(photo) ? photo.name : 'Required';
    }
    sponsorWrap.hidden = selectedValue('dedication') !== 'sponsor';
    survivorWrap.hidden = selectedValue('ribbon') !== 'survivor';
    mailWrap.hidden = selectedValue('returnMethod') !== 'mail';
  }

  function validate() {
    var first = null;
    function keep(element) {
      if (!first && element) first = element;
    }

    if (!yourName.value.trim()) keep(flag(yourName, 'Enter your name.'));
    else clearFieldError(yourName);

    if (!isEmail(yourEmail.value.trim())) keep(flag(yourEmail, 'Enter a valid email so we can confirm the sign.'));
    else clearFieldError(yourEmail);

    var phoneDigits = yourPhone.value.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      keep(flag(yourPhone, 'Enter a phone number for the trail marker text.'));
    } else {
      clearFieldError(yourPhone);
    }

    if (!relationship.value) keep(flag(relationship, 'Choose how you know this hero.'));
    else clearFieldError(relationship);

    if (!heroName.value.trim()) keep(flag(heroName, "Enter your hero's first name."));
    else clearFieldError(heroName);

    var photoError = photoFileError(selectedPhoto());
    if (photoError) keep(flag(heroPhoto, photoError));
    else clearFieldError(heroPhoto);

    var count = words(message.value);
    if (!count) keep(flag(message, 'Write a short message for the sign.'));
    else if (count > WORD_LIMIT) keep(flag(message, 'Keep the message to 25 words so it fits the sign.'));
    else clearFieldError(message);

    var ribbon = form.querySelector('input[name="ribbon"]');
    if (!selectedValue('ribbon')) keep(flag(ribbon, 'Choose a ribbon.'));
    else clearFieldError(ribbon);

    if (qrLink.value.trim() && !isUrl(qrLink.value.trim())) {
      keep(flag(qrLink, 'Use a full link starting with https:// for the QR code, or leave this blank.'));
    } else {
      clearFieldError(qrLink);
    }

    if (selectedValue('dedication') === 'sponsor' && !sponsorName.value.trim()) {
      sponsorWrap.hidden = false;
      keep(flag(sponsorName, 'Enter the sponsor or business name for the logo line.'));
    } else {
      clearFieldError(sponsorName);
    }

    if (selectedValue('returnMethod') === 'mail' && mailAddress.value.trim().length < 8) {
      mailWrap.hidden = false;
      keep(flag(mailAddress, 'Enter the mailing address for the sign.'));
    } else {
      clearFieldError(mailAddress);
    }

    return { firstInvalid: first };
  }

  function submissionData() {
    var data = new FormData();
    var photo = selectedPhoto();
    data.append('submitterName', yourName.value.trim());
    data.append('contactEmail', yourEmail.value.trim());
    data.append('phone', yourPhone.value.trim());
    data.append('relationship', relationship.value);
    data.append('heroName', heroName.value.trim());
    data.append('ribbon', selectedValue('ribbon'));
    data.append('message', message.value.trim());
    data.append('qrLink', qrLink.value.trim());
    data.append('treatmentDate', treatmentDate.value.trim());
    data.append('milestone', milestone.value.trim());
    data.append('signType', selectedValue('dedication'));
    data.append('sponsorName', sponsorName.value.trim());
    data.append('returnMethod', selectedValue('returnMethod'));
    data.append('mailAddress', mailAddress.value.trim());
    data.append('heroPhoto', photo, photo.name);
    return data;
  }

  function logoMailto() {
    var lines = [
      'Please attach the sponsor logo.',
      '',
      'Hero first name: ' + heroName.value.trim(),
      'Submitted by: ' + yourName.value.trim(),
      'Email: ' + yourEmail.value.trim()
    ];
    return 'mailto:info@hopecopeheal.org?subject=' +
      encodeURIComponent('Tribute logo: ' + heroName.value.trim()) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  function setSubmitting(isSubmitting) {
    if (!submitDedication) return;
    submitDedication.disabled = isSubmitting;
    submitDedication.textContent = isSubmitting ? 'Saving dedication…' : 'Submit dedication';
    submitDedication.setAttribute('aria-busy', String(isSubmitting));
  }

  function showSaved() {
    var sponsor = selectedValue('dedication') === 'sponsor';
    confirmationEyebrow.textContent = 'Dedication saved';
    confirmationHeading.textContent = 'Your tribute sign is saved';
    confirmationIntro.textContent = sponsor
      ? 'We have the dedication and the hero photo. Email the sponsor logo so it can be printed on the sign.'
      : 'We have the dedication and the hero photo. Volunteers will use them when they print and stake the signs.';
    submitDedication.classList.add('hidden');
    editDedication.classList.add('hidden');
    submitError.classList.add('hidden');
    if (sponsor) {
      emailPhoto.href = logoMailto();
      emailPhoto.hidden = false;
      emailPhoto.textContent = 'Email the logo';
    } else {
      emailPhoto.hidden = true;
    }
    confirmationHeading.focus({ preventScroll: true });
  }

  async function handleSubmit() {
    var photoError = photoFileError(selectedPhoto());
    if (photoError) {
      submitError.textContent = photoError;
      submitError.classList.remove('hidden');
      return;
    }
    setSubmitting(true);
    submitError.classList.add('hidden');
    try {
      var response = await fetch('/api/tributes', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: submissionData()
      });
      var data = {};
      try {
        data = await response.json();
      } catch (parseError) {
        data = {};
      }
      if (!response.ok || data.success !== true) {
        var message = data && typeof data.error === 'string' && data.error.length < 240
          ? data.error
          : 'We could not save this dedication. Please try again.';
        throw new Error(message);
      }
      showSaved();
    } catch (error) {
      console.error(error);
      var failure = error && error.message && error.name !== 'TypeError'
        ? error.message
        : 'We could not reach the server. Check your connection and try again.';
      submitError.textContent = failure;
      submitError.classList.remove('hidden');
    } finally {
      setSubmitting(false);
    }
  }

  function showConfirmation() {
    document.getElementById('confirmationName').textContent = yourName.value.trim();
    document.getElementById('confirmationEmail').textContent = yourEmail.value.trim();
    document.getElementById('confirmationPhone').textContent = yourPhone.value.trim();
    document.getElementById('confirmationHero').textContent = heroName.value.trim();
    document.getElementById('confirmationRibbon').textContent = ribbonLabel(selectedValue('ribbon'));
    if (confirmationPhoto && previewUrl) {
      confirmationPhoto.src = previewUrl;
      confirmationPhoto.alt = 'Photo of ' + (heroName.value.trim() || 'your hero');
      confirmationPhoto.hidden = false;
    }
    document.getElementById('confirmationMessage').textContent = message.value.trim();
    document.getElementById('confirmationQr').textContent = qrLink.value.trim() || 'None';
    document.getElementById('confirmationFee').textContent = money(feeAmount());
    document.getElementById('confirmationType').textContent = dedicationLabel();
    confirmationEyebrow.textContent = 'Ready to send';
    confirmationHeading.textContent = 'Review your tribute sign';
    confirmationIntro.textContent = 'Submit this dedication, including the hero photo, to save it for the tribute trail.';
    submitError.classList.add('hidden');
    submitDedication.classList.remove('hidden');
    editDedication.classList.remove('hidden');
    emailPhoto.hidden = true;
    setSubmitting(false);
    form.classList.add('hidden');
    confirmation.classList.remove('hidden');
    confirmation.scrollIntoView({ behavior: motion(), block: 'start' });
    confirmationHeading.focus({ preventScroll: true });
  }

  form.addEventListener('input', function (event) {
    formAlert.classList.add('hidden');
    if (event.target && event.target.id) clearFieldError(event.target);
    updateSummary();
  });

  form.addEventListener('change', function (event) {
    formAlert.classList.add('hidden');
    if (event.target && (event.target.id || event.target.getAttribute('aria-errormessage'))) {
      clearFieldError(event.target);
    }
    if (event.target === heroPhoto) showPreview(selectedPhoto());
    updateSummary();
    if (event.target && event.target.name === 'dedication' && event.target.value === 'sponsor') {
      sponsorName.focus();
    }
    if (event.target && event.target.name === 'returnMethod' && event.target.value === 'mail') {
      mailAddress.focus();
    }
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var result = validate();
    if (result.firstInvalid) {
      formAlert.textContent = 'Please complete the highlighted fields to continue.';
      formAlert.classList.remove('hidden');
      var scrollTarget = result.firstInvalid.closest('fieldset, section, div') || result.firstInvalid;
      scrollTarget.scrollIntoView({ behavior: motion(), block: 'center' });
      result.firstInvalid.focus({ preventScroll: true });
      return;
    }
    showConfirmation();
  });

  editDedication.addEventListener('click', function () {
    confirmation.classList.add('hidden');
    form.classList.remove('hidden');
    setSubmitting(false);
    form.scrollIntoView({ behavior: motion(), block: 'start' });
    yourName.focus({ preventScroll: true });
  });

  submitDedication.addEventListener('click', function () {
    handleSubmit();
  });

  updateSummary();
})();
