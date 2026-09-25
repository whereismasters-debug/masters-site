(function () {
  'use strict';

  var MAX_TECHNIQUES = 20;
  var MAX_TECHNIQUE_LEN = 50;
  var FIELDS = ['first_name', 'last_name', 'phone', 'telegram', 'address',
                'work_format', 'price_from', 'works_done', 'portfolio', 'techniques'];

  var form = document.getElementById('lead-form');
  var statusEl = document.getElementById('form-status');
  var submitBtn = document.getElementById('submit');
  var list = document.getElementById('techniques-list');
  var addBtn = document.getElementById('add-technique');
  var thanks = document.getElementById('thanks');
  var againBtn = document.getElementById('again');

  function container(name) {
    return form.querySelector('[data-field="' + name + '"]');
  }

  function focusTarget(name) {
    var box = container(name);
    if (!box) return null;
    return box.querySelector('input, textarea, button');
  }

  function showError(name, message) {
    var box = document.getElementById('err-' + name);
    if (box) {
      box.textContent = message;
      box.hidden = false;
    }
    var field = container(name);
    if (field) field.classList.add('field--invalid');
    var el = focusTarget(name);
    if (el && el.tagName !== 'BUTTON') el.setAttribute('aria-invalid', 'true');
  }

  function clearError(name) {
    var box = document.getElementById('err-' + name);
    if (box) {
      box.textContent = '';
      box.hidden = true;
    }
    var field = container(name);
    if (field) {
      field.classList.remove('field--invalid');
      field.querySelectorAll('[aria-invalid]').forEach(function (el) {
        el.removeAttribute('aria-invalid');
      });
    }
  }

  function clearAllErrors() {
    FIELDS.forEach(clearError);
    statusEl.hidden = true;
    statusEl.textContent = '';
  }

  function setStatus(message) {
    statusEl.textContent = message;
    statusEl.hidden = !message;
  }

  function value(name) {
    var el = form.elements[name];
    return el && typeof el.value === 'string' ? el.value.trim() : '';
  }

  function normalizePhone(s) {
    if (!/^[0-9+()\s-]+$/.test(s)) return null;

    var d = (s.match(/\d/g) || []).join('');
    if (d.length === 11 && (d[0] === '7' || d[0] === '8')) {
      d = '7' + d.slice(1);
    } else if (d.length === 10) {
      d = '7' + d;
    } else {
      return null;
    }

    return '34589'.indexOf(d[1]) === -1 ? null : '+' + d;
  }

  function parseCount(name, label, max, errors) {
    var raw = value(name);
    if (raw === '') {
      errors.push([name, 'Заполни это поле']);
      return null;
    }
    if (!/^\d+$/.test(raw)) {
      errors.push([name, 'Введи ' + label + ' числом, без букв и пробелов']);
      return null;
    }
    var n = Number(raw);
    if (n > max) {
      errors.push([name, 'Слишком большое число — проверь ' + label]);
      return null;
    }
    return n;
  }

  var menu = document.getElementById('techniques-menu');

  function options() {
    return Array.prototype.slice.call(menu.querySelectorAll('.technique__option'));
  }

  function collectTechniques() {
    return options()
      .filter(function (o) { return o.checked; })
      .map(function (o) { return o.value; })
      .slice(0, MAX_TECHNIQUES);
  }

  function renderChips() {
    var frag = document.createDocumentFragment();

    collectTechniques().forEach(function (value) {
      var li = document.createElement('li');
      li.className = 'chip';

      var text = document.createElement('span');
      text.className = 'chip__text';
      text.textContent = value;

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'chip__remove';
      remove.setAttribute('aria-label', 'Убрать технику «' + value + '»');
      remove.textContent = '\u2715';
      remove.addEventListener('click', function () {
        var option = options().filter(function (o) { return o.value === value; })[0];
        if (option) option.checked = false;
        renderChips();
        clearError('techniques');
        addBtn.focus();
      });

      li.appendChild(text);
      li.appendChild(remove);
      frag.appendChild(li);
    });

    list.replaceChildren(frag);
  }

  function setMenu(open) {
    menu.hidden = !open;
    addBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function toggleMenu() {
    setMenu(menu.hidden);
    if (!menu.hidden) {
      var first = options()[0];
      if (first) first.focus();
    }
  }

  function buildPayload(errors) {
    var firstName = value('first_name');
    var lastName = value('last_name');
    var phone = value('phone');
    var telegram = value('telegram');
    var address = value('address');
    var portfolio = value('portfolio');
    var format = form.querySelector('input[name="work_format"]:checked');

    if (!firstName) errors.push(['first_name', 'Без имени заявку не примем']);
    if (!lastName) errors.push(['last_name', 'Укажи фамилию']);

    var normalPhone = null;
    if (!phone) {
      errors.push(['phone', 'Телефон нужен, чтобы связаться с тобой']);
    } else {
      normalPhone = normalizePhone(phone);
      if (!normalPhone) {
        errors.push(['phone', 'Нужен российский номер: +7 999 123-45-67 или 8 999 123-45-67']);
      }
    }

    if (telegram && !/^@?[A-Za-z0-9_]{4,32}$/.test(telegram)) {
      errors.push(['telegram', 'Логин телеграм — латиница, цифры и подчёркивания, от 4 символов']);
    }

    if (!address) errors.push(['address', 'Укажи город или адрес']);
    if (!format) errors.push(['work_format', 'Выбери формат работы']);

    if (!portfolio) {
      errors.push(['portfolio', 'Оставь ссылку на портфолио — без неё заявку не рассмотреть']);
    } else if (!/^https?:\/\//i.test(portfolio)) {
      errors.push(['portfolio', 'Ссылка должна начинаться с http:// или https://']);
    }

    var worksDone = parseCount('works_done', 'количество работ', 100000, errors);
    var priceFrom = parseCount('price_from', 'стоимость', 100000000, errors);

    var techniques = collectTechniques();
    if (!techniques.length) {
      errors.push(['techniques', 'Добавь хотя бы одну технику']);
    }

    if (errors.length) return null;

    return {
      first_name: firstName,
      last_name: lastName,
      phone: normalPhone,
      contact_pref: telegram ? 'telegram' : 'phone',
      telegram: telegram || null,
      address: address,
      works_done: worksDone,
      work_format: format.value,
      price_from: priceFrom,
      portfolio: portfolio,
      techniques: techniques
    };
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearAllErrors();

    var errors = [];
    var payload = buildPayload(errors);

    if (!payload) {
      errors.forEach(function (pair) { showError(pair[0], pair[1]); });
      setStatus('Проверь подсвеченные поля.');
      var el = focusTarget(errors[0][0]);
      if (el && typeof el.focus === 'function') el.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'ОТПРАВЛЯЕМ…';

    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (res.status === 201) {
        form.hidden = true;
        thanks.hidden = false;
        thanks.setAttribute('tabindex', '-1');
        thanks.focus();
        return null;
      }
      return res.json().then(function (body) {
        setStatus((body && body.error) || 'Не получилось отправить заявку, попробуй ещё раз');
      }, function () {
        setStatus('Не получилось отправить заявку, попробуй ещё раз');
      });
    }).catch(function () {
      setStatus('Нет связи с сервером. Проверь интернет и попробуй ещё раз');
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'ОТПРАВИТЬ';
    });
  });

  form.addEventListener('input', function (event) {
    if (event.target.name) clearError(event.target.name);
  });

  form.addEventListener('change', function (event) {
    if (event.target.name) clearError(event.target.name);
  });

  addBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    clearError('techniques');
    toggleMenu();
  });

  menu.addEventListener('change', function (event) {
    if (!event.target.classList.contains('technique__option')) return;
    if (collectTechniques().length > MAX_TECHNIQUES) {
      event.target.checked = false;
      return;
    }
    renderChips();
    clearError('techniques');
  });

  menu.addEventListener('click', function (event) { event.stopPropagation(); });

  document.addEventListener('click', function () {
    if (!menu.hidden) setMenu(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !menu.hidden) {
      setMenu(false);
      addBtn.focus();
    }
  });

  againBtn.addEventListener('click', function () {
    form.reset();
    setMenu(false);
    renderChips();
    clearAllErrors();
    thanks.hidden = true;
    form.hidden = false;
    form.elements.first_name.focus();
  });

  renderChips();
})();
