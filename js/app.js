/* =========================================================
   Luồng trải nghiệm — 6 bến
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var audio = window.NguoiLaiDoAudio;
  var FX = window.Effects;

  var ACT_NAMES = ['Mở đầu', 'Thầm lặng', 'Cảm ơn', 'Lời chúc', 'Món quà', 'Kết thúc'];
  var TOTAL_WHISPERS = 5;

  var state = {
    act: 1,
    whispers: 0,
    letterOpen: false,
    giftOpen: false
  };

  var stage = $('#stage');
  var acts = $$('.act');
  var dots = $$('.dot');
  var hudNum = $('#hudNum');
  var hudName = $('#hudName');

  var mainBtn = $('#mainBtn');
  var mainLabel = $('#mainLabel');
  var altBtn = $('#altBtn');
  var backBtn = $('#backBtn');
  var toastEl = $('#toast');
  var sweepEl = $('#sweep');

  var whispers = $('#whispers');
  var whisperNow = $('#whisperNow');

  var letterStage = $('#letterStage');
  var envelope = $('#envelope');
  var letter = $('#letter');
  var letterPaper = $('.letter-paper', letter);
  var letterTo = $('#letterTo');
  var letterFrom = $('#letterFrom');

  var gift = $('#gift');
  var giftCardWrap = $('#giftCardWrap');

  var finalTo = $('#finalTo');
  var act3Timer = null;
  var toastTimer = null;

  /* ---------- cá nhân hoá qua đường dẫn ---------- */
  var params = new URLSearchParams(window.location.search);

  function clean(v) {
    return (v || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  }

  var TO = clean(params.get('to'));
  var FROM = clean(params.get('from'));

  if (TO) {
    letterTo.textContent = 'Gửi ' + TO + ',';
    finalTo.textContent = 'Gửi ' + TO;
    finalTo.hidden = false;
  }
  if (FROM) {
    letterFrom.textContent = '— ' + FROM;
  }

  /* ---------- trạng thái ban đầu ---------- */
  acts.forEach(function (a) {
    a.setAttribute('aria-hidden', a.classList.contains('is-active') ? 'false' : 'true');
  });

  if (audio.muted) {
    document.body.classList.add('is-muted');
  }

  var soundBtn = $('#soundBtn');
  if (soundBtn) {
    soundBtn.setAttribute('aria-pressed', audio.muted ? 'false' : 'true');
    soundBtn.setAttribute('aria-label', audio.muted ? 'Bật nhạc nền' : 'Tắt nhạc nền');
  }

  /* ---------- điều hướng ---------- */
  function sweep() {
    if (!sweepEl) return;
    sweepEl.classList.remove('run');
    void sweepEl.offsetWidth;
    sweepEl.classList.add('run');
  }

  function goTo(n) {
    if (n < 1 || n > 6 || n === state.act) return;

    window.clearTimeout(act3Timer);
    state.act = n;

    audio.sfx('page');
    sweep();

    acts.forEach(function (a) {
      var on = Number(a.dataset.act) === n;
      a.classList.toggle('is-active', on);
      a.setAttribute('aria-hidden', on ? 'false' : 'true');
    });

    document.body.dataset.act = String(n);

    updateHUD();
    updateControls();
    renderWhispers();
    FX.setScene(n);

    var inner = acts[n - 1].querySelector('.act-inner');
    if (inner) inner.scrollTop = 0;

    if (n === 3) armQuietMoment();
    if (n === 2 && state.whispers === 0) {
      window.setTimeout(function () {
        if (state.act === 2 && state.whispers === 0) revealNext();
      }, 750);
    }
    if (n === 6) window.setTimeout(function () { FX.celebrate(); }, 600);
  }

  function updateHUD() {
    dots.forEach(function (d, i) {
      var idx = i + 1;
      d.classList.toggle('is-on', idx === state.act);
      d.classList.toggle('is-done', idx < state.act);
    });
    hudNum.textContent = state.act < 10 ? '0' + state.act : String(state.act);
    hudName.textContent = ACT_NAMES[state.act - 1];
  }

  var narrowQuery = window.matchMedia('(max-width:560px)');

  function setAlt(label, shortLabel) {
    altBtn.hidden = false;
    altBtn.textContent = narrowQuery.matches && shortLabel ? shortLabel : label;
  }

  function mainLabelText(full, short) {
    mainLabel.textContent = narrowQuery.matches && short ? short : full;
  }

  function updateControls() {
    backBtn.hidden = state.act === 1;
    altBtn.hidden = true;
    altBtn.textContent = '';

    mainBtn.classList.remove('is-hidden');
    mainBtn.removeAttribute('aria-hidden');

    switch (state.act) {
      case 1:
        mainLabelText('Bắt đầu hành trình', 'Bắt đầu');
        break;
      case 2:
        mainLabelText(
          state.whispers < TOTAL_WHISPERS ? 'Điều tiếp theo' : 'Đi tiếp',
          state.whispers < TOTAL_WHISPERS ? 'Tiếp' : 'Đi tiếp'
        );
        break;
      case 3:
        mainLabelText('Đi tiếp', 'Đi tiếp');
        break;
      case 4:
        mainLabelText(state.letterOpen ? 'Đi tiếp' : 'Đọc lời chúc', state.letterOpen ? 'Đi tiếp' : 'Đọc thư');
        if (state.letterOpen) setAlt('Chia sẻ', 'Chia sẻ');
        break;
      case 5:
        mainLabelText(state.giftOpen ? 'Đi tiếp' : 'Mở quà', state.giftOpen ? 'Đi tiếp' : 'Mở quà');
        if (state.giftOpen) setAlt('Mở lại', 'Mở lại');
        break;
      case 6:
        mainLabelText('Xem lại hành trình', 'Xem lại');
        setAlt('Sao chép đường dẫn', 'Sao chép');
        break;
    }
  }

  function armQuietMoment() {
    mainBtn.classList.add('is-hidden');
    mainBtn.setAttribute('aria-hidden', 'true');
    act3Timer = window.setTimeout(function () {
      if (state.act !== 3) return;
      mainBtn.classList.remove('is-hidden');
      mainBtn.removeAttribute('aria-hidden');
    }, 1800);
  }

  /* ---------- những điều thầm lặng ---------- */
  function renderWhispers() {
    var items = $$('.whisper', whispers);
    items.forEach(function (li, i) {
      li.classList.toggle('is-in', i < state.whispers);
    });
    whisperNow.textContent = String(state.whispers);
  }

  function revealNext() {
    if (state.whispers >= TOTAL_WHISPERS) return;

    state.whispers += 1;
    var li = whispers.children[state.whispers - 1];
    if (li) li.classList.add('is-in');

    whisperNow.textContent = String(state.whispers);
    audio.sfx('tick');

    if (li && state.act === 2) {
      window.setTimeout(function () {
        var inner = $('#act-2 .act-inner');
        if (!inner || inner.scrollHeight <= inner.clientHeight + 2) return;
        var r = li.getBoundingClientRect();
        var ir = inner.getBoundingClientRect();
        if (r.bottom > ir.bottom - 8 || r.top < ir.top) {
          li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 280);
    }

    if (state.whispers >= TOTAL_WHISPERS) {
      mainLabelText('Đi tiếp', 'Đi tiếp');
    }
  }

  if (whispers) {
    whispers.addEventListener('click', function (e) {
      var li = e.target.closest('.whisper');
      if (!li) return;
      var idx = Number(li.dataset.i);
      if (idx === state.whispers + 1) revealNext();
    });
  }

  /* ---------- lá thư ---------- */
  function updateLetterFade() {
    if (!letterPaper) return;
    var left = letterPaper.scrollHeight - letterPaper.scrollTop - letterPaper.clientHeight;
    letter.classList.toggle('has-more', left > 6);
  }

  if (letterPaper) {
    letterPaper.addEventListener('scroll', updateLetterFade, { passive: true });
  }
  if (letter) {
    letter.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'opacity') updateLetterFade();
    });
  }

  function openLetter() {
    if (state.letterOpen) return;
    state.letterOpen = true;

    letterStage.classList.add('is-open');
    envelope.setAttribute('aria-expanded', 'true');
    envelope.setAttribute('tabindex', '-1');
    letter.setAttribute('aria-hidden', 'false');
    letterPaper.scrollTop = 0;

    audio.sfx('seal');
    window.setTimeout(function () { audio.sfx('open'); }, 280);
    window.setTimeout(updateLetterFade, 850);

    updateControls();
  }

  function resetLetter() {
    state.letterOpen = false;
    letterStage.classList.remove('is-open');
    envelope.removeAttribute('aria-expanded');
    envelope.setAttribute('tabindex', '0');
    letter.setAttribute('aria-hidden', 'true');
    letterPaper.scrollTop = 0;
    letter.classList.remove('has-more');
  }

  if (envelope) {
    envelope.setAttribute('tabindex', '0');
    envelope.addEventListener('click', openLetter);
    envelope.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLetter();
      }
    });
  }

  /* ---------- hộp quà ---------- */
  function openGift() {
    if (state.giftOpen) return;
    state.giftOpen = true;

    gift.classList.add('is-open');
    gift.parentElement.classList.add('is-open');
    gift.setAttribute('aria-pressed', 'true');
    giftCardWrap.classList.add('is-open');

    audio.sfx('open');
    FX.giftJoy();
    updateControls();

    window.setTimeout(function () {
      if (state.act === 5 && giftCardWrap.classList.contains('is-open')) {
        giftCardWrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 700);
  }

  function closeGift() {
    state.giftOpen = false;
    gift.classList.remove('is-open');
    gift.parentElement.classList.remove('is-open');
    gift.setAttribute('aria-pressed', 'false');
    giftCardWrap.classList.remove('is-open');
    FX.calmGift();
  }

  function replayGift() {
    if (!state.giftOpen) {
      openGift();
      return;
    }
    closeGift();
    updateControls();
    audio.sfx('tick');
    window.setTimeout(function () {
      if (state.act === 5) openGift();
    }, 560);
  }

  if (gift) {
    gift.addEventListener('click', openGift);
    gift.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (state.giftOpen) replayGift();
        else openGift();
      }
    });
  }

  /* ---------- đường dẫn & chia sẻ ---------- */
  function buildUrl() {
    var url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    if (TO) url.searchParams.set('to', TO);
    if (FROM) url.searchParams.set('from', FROM);
    return url.toString();
  }

  function fallbackCopy(url, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (e) {
      toast('Đường dẫn: ' + url);
    }
  }

  function copyLink() {
    var url = buildUrl();
    var done = function () {
      audio.sfx('chime');
      toast('Đã sao chép đường dẫn');
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(done).catch(function () {
        fallbackCopy(url, done);
      });
    } else {
      fallbackCopy(url, done);
    }
  }

  function shareLetter() {
    var url = buildUrl();
    if (navigator.share) {
      navigator.share({
        title: 'Người lái đò — Một đời đưa đò, vạn lời tri ân',
        text: 'Một lời tri ân gửi thầy cô nhân ngày 20/11.',
        url: url
      }).catch(function () {});
    } else {
      copyLink();
    }
  }

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2600);
  }

  /* ---------- nút điều khiển ---------- */
  mainBtn.addEventListener('click', function () {
    audio.start();

    switch (state.act) {
      case 1:
        goTo(2);
        break;
      case 2:
        if (state.whispers < TOTAL_WHISPERS) revealNext();
        else goTo(3);
        break;
      case 3:
        goTo(4);
        break;
      case 4:
        if (!state.letterOpen) openLetter();
        else goTo(5);
        break;
      case 5:
        if (!state.giftOpen) openGift();
        else goTo(6);
        break;
      case 6:
        replay();
        break;
    }
  });

  backBtn.addEventListener('click', function () {
    if (state.act <= 1) return;
    audio.sfx('tick');
    goTo(state.act - 1);
  });

  altBtn.addEventListener('click', function () {
    if (state.act === 4) shareLetter();
    else if (state.act === 5) replayGift();
    else if (state.act === 6) copyLink();
  });

  /* ---------- xem lại ---------- */
  function replay() {
    window.clearTimeout(act3Timer);

    state.whispers = 0;
    renderWhispers();

    resetLetter();
    closeGift();

    $$('.act.is-active').forEach(function (a) { a.classList.remove('is-active'); });
    state.act = 0;

    FX.setScene(1);

    goTo(1);
  }

  /* ---------- bàn phím ---------- */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (state.act < 6) goTo(state.act + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (state.act > 1) goTo(state.act - 1);
    }
  });

  /* ---------- vuốt trên điện thoại ---------- */
  var touchX = 0, touchY = 0, touchT = 0;

  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
    touchT = Date.now();
  }, { passive: true });

  stage.addEventListener('touchend', function (e) {
    if (e.touches.length) return;
    var t = e.changedTouches[0];
    if (!t) return;

    var dx = t.clientX - touchX;
    var dy = t.clientY - touchY;
    var dt = Date.now() - touchT;

    if (dt > 900) return;
    if (Math.abs(dx) < 70) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;

    if (dx < 0 && state.act < 6) goTo(state.act + 1);
    else if (dx > 0 && state.act > 1) goTo(state.act - 1);
  }, { passive: true });

  /* ---------- âm thanh ---------- */
  var audioStarted = false;

  function kickAudio() {
    if (audioStarted) return;
    audioStarted = true;
    audio.start();
  }

  document.addEventListener('pointerdown', kickAudio, { once: true, passive: true });
  document.addEventListener('keydown', kickAudio, { once: true });

  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      audio.start();
      audio.toggle();
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (!audio.ready) return;
    audio.duck(document.hidden);
  });

  /* ---------- khởi động ---------- */
  updateHUD();
  updateControls();
  renderWhispers();
  FX.setScene(1);

  if (narrowQuery.addEventListener) {
    narrowQuery.addEventListener('change', updateControls);
  } else if (narrowQuery.addListener) {
    narrowQuery.addListener(updateControls);
  }

  if (soundBtn) {
    var mutedNow = audio.muted;
    soundBtn.setAttribute('aria-pressed', mutedNow ? 'false' : 'true');
    soundBtn.setAttribute('aria-label', mutedNow ? 'Bật nhạc nền' : 'Tắt nhạc nền');
  }
})();
