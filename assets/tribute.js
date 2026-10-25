(function () {
  'use strict';

  var WORD_LIMIT = 25;
  var SPONSOR_PRICE = 40;

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
  var summaryType = document.getElementById('summaryType');
  var formAlert = document.getElementById('formAlert');
  var sponsorWrap = document.getElementById('sponsorWrap');
  var sponsorName = document.getElementById('sponsorName');
  var survivorWrap = document.getElementById('survivorWrap');
  var mailWrap = document.getElementById('mailWrap');
  var mailAddress = document.getElementById('mailAddress');
  var confirmation = document.getElementById('tributeConfirmation');
  var confirmationHeading = document.getElementById('confirmationHeading');
  var editDedication = document.getElementById('editDedication');

  var yourName = document.getElementById('yourName');
  var yourEmail = document.getElementById('yourEmail');
  var yourPhone = document.getElementById('yourPhone');
  var relationship = document.getElementById('relationship');
  var heroName = document.getElementById('heroName');
  var photoUrl = document.getElementById('photoUrl');
  var caringBridge = document.getElementById('caringBridge');
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

    var count = words(message.value);
    if (!count) keep(flag(message, 'Write a short message for the sign.'));
    else if (count > WORD_LIMIT) keep(flag(message, 'Keep the message to 25 words so it fits the sign.'));
    else clearFieldError(message);

    var ribbon = form.querySelector('input[name="ribbon"]');
    if (!selectedValue('ribbon')) keep(flag(ribbon, 'Choose a ribbon.'));
    else clearFieldError(ribbon);

    if (photoUrl.value.trim() && !isUrl(photoUrl.value.trim())) {
      keep(flag(photoUrl, 'Use a full link starting with https://, or leave this blank and attach the photo in the email.'));
    } else {
      clearFieldError(photoUrl);
    }

    if (caringBridge.value.trim() && !isUrl(caringBridge.value.trim())) {
      keep(flag(caringBridge, 'Use a full link starting with https://, or leave this blank.'));
    } else {
      clearFieldError(caringBridge);
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

  function buildMailto() {
    var lines = [
      'Tribute Trail sign dedication',
      'Hope. Cope. Heal. Inaugural 5K, 10K & Family Festival',
      'Saturday, March 27, 2027 · Frisco Commons Park',
      '',
      'Submitted by: ' + yourName.value.trim(),
      'Email: ' + yourEmail.value.trim(),
      'Phone: ' + yourPhone.value.trim(),
      'Relationship: ' + relationship.options[relationship.selectedIndex].text,
      '',
      'Hero first name: ' + heroName.value.trim(),
      'Ribbon: ' + ribbonLabel(selectedValue('ribbon')),
      'Message (' + words(message.value) + ' words): ' + message.value.trim(),
      'Photo link: ' + (photoUrl.value.trim() || 'Attach the photo to this email'),
      'CaringBridge or meal train: ' + (caringBridge.value.trim() || 'None'),
      'Last treatment date: ' + (treatmentDate.value || 'Not provided'),
      'Milestone: ' + (milestone.value.trim() || 'Not provided'),
      '',
      'Dedication: ' + dedicationLabel(),
      'Sponsor / business: ' + (selectedValue('dedication') === 'sponsor' ? sponsorName.value.trim() : 'Not a sponsor sign'),
      'Sign fee: ' + money(feeAmount()),
      'Return: ' + (selectedValue('returnMethod') === 'mail'
        ? 'Mail to ' + mailAddress.value.trim()
        : 'Pickup at the Pavilion after 3:30 PM'),
      '',
      'Please confirm this Honoring Our Heroes sign. Deadline: Friday, March 12, 2027.'
    ];

    return 'mailto:info@hopecopeheal.org?subject=' +
      encodeURIComponent('Tribute sign: ' + heroName.value.trim()) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  function showConfirmation() {
    document.getElementById('confirmationName').textContent = yourName.value.trim();
    document.getElementById('confirmationEmail').textContent = yourEmail.value.trim();
    document.getElementById('confirmationPhone').textContent = yourPhone.value.trim();
    document.getElementById('confirmationHero').textContent = heroName.value.trim();
    document.getElementById('confirmationRibbon').textContent = ribbonLabel(selectedValue('ribbon'));
    document.getElementById('confirmationMessage').textContent = message.value.trim();
    document.getElementById('confirmationFee').textContent = money(feeAmount());
    document.getElementById('confirmationType').textContent = dedicationLabel();
    document.getElementById('emailDedication').href = buildMailto();
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
    form.scrollIntoView({ behavior: motion(), block: 'start' });
    yourName.focus({ preventScroll: true });
  });

  updateSummary();
})();
