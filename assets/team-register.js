(function () {
  'use strict';

  /* Team bundle: $56 covers the first 2 runners at the $28 team rate.
     Each runner above 2 adds $28. Individual entry is $35,
     so savings are (runners × 35) − total. */
  var MIN_RUNNERS = 2;
  var MAX_RUNNERS = 25;
  var RUNNER_PRICE = 28;
  var BASE_PRICE = MIN_RUNNERS * RUNNER_PRICE;
  var STANDARD_PRICE = 35;

  var SHIRTS = [
    ['Youth', ['Youth S', 'Youth M', 'Youth L']],
    ['Adult', ['Adult XS', 'Adult S', 'Adult M', 'Adult L', 'Adult XL', 'Adult 2XL', 'Adult 3XL']]
  ];

  var RACES = [
    ['5k', '5K Run/Walk'],
    ['10k', '10K Run']
  ];

  var FIELD_CLASS = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 aria-invalid:border-red-500';
  var PILL_CLASS = 'block rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-700 peer-checked:border-gold-500 peer-checked:bg-gold-50 peer-checked:text-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-gold-700 peer-focus-visible:ring-offset-2';

  var form = document.getElementById('teamForm');
  var roster = document.getElementById('runnerRoster');
  if (!form || !roster) return;

  var count = MIN_RUNNERS;
  var decrement = document.getElementById('decrementRunners');
  var increment = document.getElementById('incrementRunners');
  var runnerCount = document.getElementById('runnerCount');
  var liveTotal = document.getElementById('liveTotal');
  var liveRunnerCount = document.getElementById('liveRunnerCount');
  var savingsBadge = document.getElementById('savingsBadge');
  var rosterCountLabel = document.getElementById('rosterCountLabel');
  var additionalLabel = document.getElementById('additionalLabel');
  var additionalCost = document.getElementById('additionalCost');
  var summaryTotal = document.getElementById('summaryTotal');
  var summaryGoal = document.getElementById('summaryGoal');
  var summarySavings = document.getElementById('summarySavings');
  var formAlert = document.getElementById('formAlert');
  var teamName = document.getElementById('teamName');
  var captainName = document.getElementById('captainName');
  var captainEmail = document.getElementById('captainEmail');
  var captainPhone = document.getElementById('captainPhone');
  var customGoalWrap = document.getElementById('customGoalWrap');
  var customGoal = document.getElementById('customGoal');
  var confirmation = document.getElementById('teamConfirmation');
  var confirmationHeading = document.getElementById('confirmationHeading');
  var editRegistration = document.getElementById('editRegistration');

  function money(amount) {
    return '$' + amount.toLocaleString('en-US');
  }

  function quote(runnerCountValue) {
    var additional = runnerCountValue - MIN_RUNNERS;
    var additionalAmount = additional * RUNNER_PRICE;
    var totalCost = BASE_PRICE + additionalAmount;
    return {
      additional: additional,
      additionalCost: additionalAmount,
      totalCost: totalCost,
      savings: runnerCountValue * STANDARD_PRICE - totalCost
    };
  }

  function motion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function parseGoal(value) {
    var digits = String(value || '').replace(/[^0-9]/g, '');
    if (!digits) return null;
    var amount = Number(digits);
    if (!amount || amount > 1000000) return null;
    return amount;
  }

  function selectedGoalValue() {
    var selected = form.querySelector('input[name="fundraising"]:checked');
    return selected ? selected.value : 'none';
  }

  function goalText() {
    var value = selectedGoalValue();
    if (value === 'none') return 'No goal set';
    if (value === 'custom') {
      var amount = parseGoal(customGoal.value);
      return amount ? money(amount) : 'Custom';
    }
    return money(Number(value));
  }

  function raceName(value) {
    for (var i = 0; i < RACES.length; i++) {
      if (RACES[i][0] === value) return RACES[i][1];
    }
    return value;
  }

  function errorElement(input) {
    var id = input.getAttribute('aria-errormessage') || (input.id ? input.id + '-error' : '');
    return id ? document.getElementById(id) : null;
  }

  function flag(input, message) {
    var error = errorElement(input);
    input.setAttribute('aria-invalid', 'true');
    if (error) {
      error.textContent = message;
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

  function updatePrices() {
    var pricing = quote(count);
    runnerCount.textContent = String(count);
    runnerCount.setAttribute('aria-label', count + ' runners');
    liveRunnerCount.textContent = count + ' runners';
    liveTotal.textContent = money(pricing.totalCost);
    savingsBadge.textContent = '🎉 Your team saves ' + money(pricing.savings) + ' vs. individual entry!';
    rosterCountLabel.textContent = count + (count === 1 ? ' runner' : ' runners');
    additionalLabel.textContent = 'Additional Runners (' + pricing.additional + ' × $28)';
    additionalCost.textContent = money(pricing.additionalCost);
    summaryTotal.textContent = money(pricing.totalCost);
    summaryGoal.textContent = goalText();
    summarySavings.textContent = 'Your team saves ' + money(pricing.savings) + ' vs. individual entry.';
    decrement.disabled = count <= MIN_RUNNERS;
    increment.disabled = count >= MAX_RUNNERS;
  }

  function readRunners() {
    return Array.prototype.map.call(roster.querySelectorAll('[data-runner]'), function (card) {
      var race = card.querySelector('[data-field="race"]:checked');
      return {
        name: card.querySelector('[data-field="name"]').value,
        email: card.querySelector('[data-field="email"]').value,
        shirt: card.querySelector('[data-field="shirt"]').value,
        race: race ? race.value : '5k'
      };
    });
  }

  function addError(parent, id) {
    var error = document.createElement('p');
    error.id = id;
    error.className = 'mt-1.5 hidden text-xs font-semibold text-red-700';
    parent.appendChild(error);
    return error;
  }

  function textField(options) {
    var wrap = document.createElement('div');
    var label = document.createElement('label');
    label.htmlFor = options.id;
    label.className = 'block text-sm font-semibold text-slate-900';
    label.appendChild(document.createTextNode(options.label));
    if (options.hint) {
      var hint = document.createElement('span');
      hint.className = 'ml-1.5 font-medium text-slate-500';
      hint.textContent = options.hint;
      label.appendChild(hint);
    }

    var input = document.createElement('input');
    input.id = options.id;
    input.type = options.type || 'text';
    input.className = FIELD_CLASS;
    input.dataset.field = options.field;
    input.value = options.value || '';
    input.maxLength = options.type === 'email' ? 120 : 80;
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.autocomplete) input.autocomplete = options.autocomplete;
    if (options.required) input.required = true;
    if (options.type === 'email') {
      input.spellcheck = false;
      input.inputMode = 'email';
    }
    input.setAttribute('aria-describedby', options.id + '-error');

    wrap.appendChild(label);
    wrap.appendChild(input);
    addError(wrap, options.id + '-error');
    return wrap;
  }

  function raceField(index, selected) {
    var fieldset = document.createElement('fieldset');
    var legend = document.createElement('legend');
    legend.className = 'text-sm font-semibold text-slate-900';
    legend.textContent = 'Race Event';
    fieldset.appendChild(legend);

    var grid = document.createElement('div');
    grid.className = 'mt-2 grid grid-cols-2 gap-2';
    var errorId = 'runner-' + index + '-race-error';

    RACES.forEach(function (race) {
      var label = document.createElement('label');
      label.className = 'cursor-pointer';
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'runner-race-' + index;
      input.value = race[0];
      input.className = 'peer sr-only';
      input.dataset.field = 'race';
      input.checked = selected === race[0];
      input.setAttribute('aria-describedby', errorId);
      input.setAttribute('aria-errormessage', errorId);
      var span = document.createElement('span');
      span.className = PILL_CLASS;
      span.textContent = race[1];
      label.appendChild(input);
      label.appendChild(span);
      grid.appendChild(label);
    });

    fieldset.appendChild(grid);
    addError(fieldset, errorId);
    return fieldset;
  }

  function shirtField(index, selected) {
    var wrap = document.createElement('div');
    var id = 'runner-' + index + '-shirt';
    var label = document.createElement('label');
    label.htmlFor = id;
    label.className = 'block text-sm font-semibold text-slate-900';
    label.textContent = 'T-Shirt Size';

    var select = document.createElement('select');
    select.id = id;
    select.className = FIELD_CLASS;
    select.dataset.field = 'shirt';
    select.required = true;
    select.setAttribute('aria-describedby', id + '-error');

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a size';
    select.appendChild(placeholder);

    SHIRTS.forEach(function (group) {
      var optgroup = document.createElement('optgroup');
      optgroup.label = group[0];
      group[1].forEach(function (size) {
        var option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
    });

    select.value = selected || '';
    wrap.appendChild(label);
    wrap.appendChild(select);
    addError(wrap, id + '-error');
    return wrap;
  }

  function createRunnerCard(index, data) {
    data = data || {};
    var article = document.createElement('article');
    article.className = 'rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5';
    article.dataset.runner = String(index);

    var header = document.createElement('div');
    header.className = 'flex items-center gap-3';

    var badge = document.createElement('span');
    badge.className = 'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-100 text-sm font-extrabold text-gold-800 ring-1 ring-inset ring-gold-300';
    badge.textContent = String(index);
    badge.setAttribute('aria-hidden', 'true');

    var title = document.createElement('h3');
    title.id = 'runner-' + index + '-title';
    title.className = 'text-base font-extrabold text-slate-900';
    title.textContent = 'Runner ' + index;
    article.setAttribute('aria-labelledby', title.id);
    header.appendChild(badge);
    header.appendChild(title);

    var grid = document.createElement('div');
    grid.className = 'mt-4 grid gap-4 sm:grid-cols-2';
    grid.appendChild(textField({
      id: 'runner-' + index + '-name',
      label: 'Runner Full Name',
      field: 'name',
      value: data.name || '',
      autocomplete: 'name',
      required: true,
      placeholder: 'Full name'
    }));
    grid.appendChild(textField({
      id: 'runner-' + index + '-email',
      label: 'Runner Email',
      hint: '(optional for minors)',
      field: 'email',
      type: 'email',
      value: data.email || '',
      autocomplete: 'email',
      placeholder: 'name@email.com'
    }));
    grid.appendChild(raceField(index, data.race || '5k'));
    grid.appendChild(shirtField(index, data.shirt || ''));

    article.appendChild(header);
    article.appendChild(grid);
    return article;
  }

  function renderRoster(focusIndex) {
    var existing = readRunners();
    var fragment = document.createDocumentFragment();
    for (var i = 1; i <= count; i++) {
      fragment.appendChild(createRunnerCard(i, existing[i - 1]));
    }
    roster.replaceChildren(fragment);
    if (!focusIndex) return;
    var field = document.getElementById('runner-' + focusIndex + '-name');
    if (field) field.focus();
  }

  function setCount(next, focusIndex) {
    count = Math.max(MIN_RUNNERS, Math.min(MAX_RUNNERS, next));
    updatePrices();
    renderRoster(focusIndex);
  }

  function validate() {
    var first = null;
    function keep(element) {
      if (!first && element) first = element;
    }

    if (!teamName.value.trim()) keep(flag(teamName, 'Enter a team or group name.'));
    else clearFieldError(teamName);

    if (!captainName.value.trim()) keep(flag(captainName, "Enter the team captain's name."));
    else clearFieldError(captainName);

    if (!isEmail(captainEmail.value.trim())) keep(flag(captainEmail, 'Enter a valid email for the team captain.'));
    else clearFieldError(captainEmail);

    var phoneDigits = captainPhone.value.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      keep(flag(captainPhone, 'Enter a phone number for race-day packet pickup.'));
    } else {
      clearFieldError(captainPhone);
    }

    var runners = [];
    Array.prototype.forEach.call(roster.querySelectorAll('[data-runner]'), function (card) {
      var nameInput = card.querySelector('[data-field="name"]');
      var emailInput = card.querySelector('[data-field="email"]');
      var shirtInput = card.querySelector('[data-field="shirt"]');
      var raceInput = card.querySelector('[data-field="race"]:checked') || card.querySelector('[data-field="race"]');
      var name = nameInput.value.trim();
      var email = emailInput.value.trim();
      var shirt = shirtInput.value;
      var race = raceInput && raceInput.checked ? raceInput.value : '';

      if (!name) keep(flag(nameInput, "Enter this runner's full name."));
      else clearFieldError(nameInput);

      if (email && !isEmail(email)) {
        keep(flag(emailInput, 'Enter a valid email, or leave this blank for a minor.'));
      } else {
        clearFieldError(emailInput);
      }

      if (!race) keep(flag(raceInput, 'Choose a race.'));
      else clearFieldError(raceInput);

      if (!shirt) keep(flag(shirtInput, 'Choose a t-shirt size.'));
      else clearFieldError(shirtInput);

      runners.push({ name: name, email: email, shirt: shirt, race: race });
    });

    if (selectedGoalValue() === 'custom' && !parseGoal(customGoal.value)) {
      customGoalWrap.hidden = false;
      keep(flag(customGoal, 'Enter a fundraising amount, or choose a suggested goal.'));
    } else {
      clearFieldError(customGoal);
    }

    return { firstInvalid: first, runners: runners };
  }

  function buildMailto(runners, pricing) {
    var lines = [
      'Team & Group Registration',
      'Hope. Cope. Heal. Inaugural 5K, 10K & Family Festival',
      'Saturday, March 27, 2027 · Frisco Commons Park',
      '',
      'Team: ' + teamName.value.trim(),
      'Captain: ' + captainName.value.trim(),
      'Email: ' + captainEmail.value.trim(),
      'Phone: ' + captainPhone.value.trim(),
      'Fundraising goal: ' + goalText(),
      '',
      'Runners (' + runners.length + '):'
    ];

    runners.forEach(function (runner, index) {
      var line = (index + 1) + '. ' + runner.name + ' — ' + raceName(runner.race) + ' — ' + runner.shirt;
      if (runner.email) line += ' — ' + runner.email;
      lines.push(line);
    });

    lines.push(
      '',
      'Team Base (' + MIN_RUNNERS + ' runners): ' + money(BASE_PRICE),
      'Additional Runners (' + pricing.additional + ' × $28): ' + money(pricing.additionalCost),
      'Total Due: ' + money(pricing.totalCost),
      '',
      'Please send payment instructions for this team registration.'
    );

    return 'mailto:info@hopecopeheal.org?subject=' +
      encodeURIComponent('Team registration: ' + teamName.value.trim()) +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  function showConfirmation(runners) {
    var pricing = quote(count);
    document.getElementById('confirmationTeam').textContent = teamName.value.trim();
    document.getElementById('confirmationCaptain').textContent = captainName.value.trim();
    document.getElementById('confirmationEmail').textContent = captainEmail.value.trim();
    document.getElementById('confirmationPhone').textContent = captainPhone.value.trim();
    document.getElementById('confirmationGoal').textContent = goalText();
    document.getElementById('confirmationAdditionalLabel').textContent = 'Additional Runners (' + pricing.additional + ' × $28)';
    document.getElementById('confirmationAdditionalCost').textContent = money(pricing.additionalCost);
    document.getElementById('confirmationTotal').textContent = money(pricing.totalCost);
    document.getElementById('confirmationSavings').textContent = '🎉 Your team saves ' + money(pricing.savings) + ' vs. individual entry!';

    var list = document.getElementById('confirmationRoster');
    list.replaceChildren();
    runners.forEach(function (runner, index) {
      var item = document.createElement('li');
      item.className = 'rounded-xl border border-slate-200 bg-slate-50 p-4';

      var title = document.createElement('p');
      title.className = 'font-extrabold text-slate-900';
      title.textContent = 'Runner ' + (index + 1) + ' · ' + runner.name;

      var meta = document.createElement('p');
      meta.className = 'mt-1 text-sm text-slate-600';
      meta.textContent = raceName(runner.race) + ' · ' + runner.shirt + (runner.email ? ' · ' + runner.email : ' · Email not provided');

      item.appendChild(title);
      item.appendChild(meta);
      list.appendChild(item);
    });

    document.getElementById('emailRoster').href = buildMailto(runners, pricing);
    form.classList.add('hidden');
    confirmation.classList.remove('hidden');
    confirmation.scrollIntoView({ behavior: motion(), block: 'start' });
    confirmationHeading.focus({ preventScroll: true });
  }

  decrement.addEventListener('click', function () {
    if (count <= MIN_RUNNERS) return;
    setCount(count - 1, null);
    if (decrement.disabled) increment.focus();
  });

  increment.addEventListener('click', function () {
    if (count >= MAX_RUNNERS) return;
    var next = count + 1;
    setCount(next, next);
  });

  form.addEventListener('input', function (event) {
    formAlert.classList.add('hidden');
    if (event.target && event.target.id) clearFieldError(event.target);
    if (event.target === customGoal) updatePrices();
  });

  form.addEventListener('change', function (event) {
    formAlert.classList.add('hidden');
    if (event.target && (event.target.id || event.target.getAttribute('aria-errormessage'))) {
      clearFieldError(event.target);
    }
    if (event.target && event.target.name === 'fundraising') {
      var isCustom = event.target.value === 'custom';
      customGoalWrap.hidden = !isCustom;
      if (!isCustom) clearFieldError(customGoal);
      if (isCustom) customGoal.focus();
    }
    updatePrices();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var result = validate();
    if (result.firstInvalid) {
      formAlert.textContent = 'Please complete the highlighted fields to continue.';
      formAlert.classList.remove('hidden');
      var scrollTarget = result.firstInvalid.closest('article, fieldset, section') || result.firstInvalid;
      scrollTarget.scrollIntoView({ behavior: motion(), block: 'center' });
      result.firstInvalid.focus({ preventScroll: true });
      return;
    }
    showConfirmation(result.runners);
  });

  editRegistration.addEventListener('click', function () {
    confirmation.classList.add('hidden');
    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: motion(), block: 'start' });
    teamName.focus({ preventScroll: true });
  });

  setCount(MIN_RUNNERS, null);
})();
