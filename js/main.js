// ==========================================================
// SUMO GUIDE：ハンバーガーメニューの開閉
// ==========================================================
const menuButton = document.querySelector('.menu-button');
const nav = document.getElementById('global-nav');
const navLinks = nav.querySelectorAll('a');

// PC表示（横並びメニュー）に切り替わる画面幅
const pcQuery = window.matchMedia('(min-width: 1024px)');

function openMenu() {
  menuButton.setAttribute('aria-expanded', 'true');
  menuButton.setAttribute('aria-label', 'メニューを閉じる');
  nav.classList.add('is-open');
  document.body.classList.add('is-menu-open');
}

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'メニューを開く');
  nav.classList.remove('is-open');
  document.body.classList.remove('is-menu-open');
}

function isMenuOpen() {
  return menuButton.getAttribute('aria-expanded') === 'true';
}

// ボタンを押したら開く／閉じる（buttonタグなので、Enterキー・スペースキーでも動きます）
menuButton.addEventListener('click', () => {
  if (isMenuOpen()) {
    closeMenu();
  } else {
    openMenu();
  }
});

// メニュー内のリンクを押したら閉じる
navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    if (isMenuOpen()) {
      closeMenu();
    }
  });
});

// Escキーで閉じて、ボタンにフォーカスを戻す
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isMenuOpen()) {
    closeMenu();
    menuButton.focus();
  }
});

// メニューを開いたまま画面を広げたときは、閉じた状態に戻す
pcQuery.addEventListener('change', (event) => {
  if (event.matches) {
    closeMenu();
  }
});

// ==========================================================
// オープニング演出
// 表示するかどうかは index.html の先頭で決めている（html に .is-opening が付く）。
// スキップボタン・クリック・キー操作・ホイール・タッチのどれでもすぐ終わる。
// ==========================================================
const root = document.documentElement;
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const opening = document.getElementById('opening');

function rememberOpening() {
  try {
    sessionStorage.setItem('sumo-opening-seen', '1');
  } catch (error) {
    // 保存できなくても動作には影響しない
  }
}

if (root.classList.contains('is-opening')) {
  const timeScale = parseFloat(getComputedStyle(root).getPropertyValue('--t')) || 1;
  const skipEvents = ['click', 'keydown', 'wheel', 'touchstart'];

  const finishOpening = () => {
    opening.hidden = true;
    skipEvents.forEach((type) => window.removeEventListener(type, skipOpening));
  };

  // スキップ：幕をすぐ下ろし、ファーストビューの演出も待ち時間なしで始める
  function skipOpening() {
    if (opening.hidden) return;
    root.classList.add('is-opening-done');
    root.style.setProperty('--intro-delay', '0s');
    rememberOpening();
    window.setTimeout(finishOpening, 300);
  }

  skipEvents.forEach((type) => window.addEventListener(type, skipOpening, { passive: true }));
  window.setTimeout(() => {
    rememberOpening();
    finishOpening();
  }, timeScale * 2400);
}

// ==========================================================
// 画面に入った要素を、一度だけ順に表示する
// （ファーストビューは上のオープニング演出で表示するので対象外）
// ==========================================================
const revealTargets = document.querySelectorAll(
  '.section-heading, .photo, .about > *, .card, .section__intro, .ranking__item, .note, .experience-panel, .footer'
);
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  revealTargets.forEach((element) => {
    const index = [...element.parentElement.children].indexOf(element);
    // 番付は横綱から順に、少しずつ時間差を付けて出す
    const delay = element.matches('.ranking__item') ? index * 140 : Math.min(index, 3) * 100;
    element.style.setProperty('--reveal-delay', `${delay}ms`);
    element.classList.add('reveal');
    revealObserver.observe(element);
  });
}

// ==========================================================
// 横スクロール（PCのみ）
// 縦にスクロールした量を「目標の横位置」とし、画面の動きは少し遅れて追いつかせる（慣性）。
// ホイール・トラックパッド・キーボードは、ブラウザ本来の縦スクロールをそのまま使う。
// タブレット・スマホ（指で操作する端末）は縦スクロールのまま。
// ==========================================================
const horizontalQuery = window.matchMedia('(min-width: 1024px) and (min-height: 600px) and (hover: hover) and (pointer: fine)');
const hscroll = document.querySelector('.hscroll');
const hscrollTrack = document.querySelector('.hscroll__track');
const header = document.querySelector('.header');
const heroVisual = document.querySelector('.hero__visual');
const backToTop = document.querySelector('.back-to-top');
const sections = [...document.querySelectorAll('main > section[id]')];
const currentLinks = document.querySelectorAll('.nav__link, .progress__link');
const progressFill = document.querySelector('.progress__fill');

backToTop.hidden = false; // 以後は .is-shown で表示を切り替える（CSSでフェード）

let hscrollDistance = 0; // 横に動ける距離
let currentX = 0;        // 今、画面に表示している横位置
let sectionStarts = [];  // 各セクションの左端（横位置）
let parallaxItems = [];  // 写真のパララックス（{ element, center }）
let jumpNextFrame = false;
let frameRequested = false;

function isHorizontal() {
  return root.classList.contains('is-horizontal');
}

function getTargetX() {
  return Math.min(hscrollDistance, Math.max(0, window.scrollY - hscroll.offsetTop));
}

// 横に動ける距離や、各要素の位置を測り直す（読み込み時・画面サイズ変更時）
function setupHorizontal() {
  root.classList.toggle('is-horizontal', horizontalQuery.matches);
  hscrollTrack.style.transform = '';
  parallaxItems.forEach(({ element }) => { element.style.transform = ''; });
  parallaxItems = [];

  if (!isHorizontal()) {
    hscrollDistance = 0;
    currentX = 0;
    hscroll.style.removeProperty('--hscroll-height');
    requestFrame();
    return;
  }

  hscrollDistance = Math.max(0, hscrollTrack.scrollWidth - window.innerWidth);
  hscroll.style.setProperty('--hscroll-height', `${hscrollDistance + window.innerHeight}px`);
  // transform を外した状態で測るので、getBoundingClientRect の値がそのまま横位置になる
  sectionStarts = sections.map((section) => section.getBoundingClientRect().left);
  // factor：動く速さ（大きいほど奥にあるように見える）／range：動く幅の上限／zoom：近づくほど拡大するか
  const measure = (element, options) => {
    const rect = element.getBoundingClientRect();
    return { element, center: rect.left + rect.width / 2, width: rect.width, ...options };
  };
  parallaxItems = [
    ...[...document.querySelectorAll('.photo img')].map((element) => measure(element, {
      factor: 0.08, range: element.getBoundingClientRect().width * 0.06, scale: 1.14,
      zoom: Boolean(element.closest('.photo--experience')),
    })),
    ...[...document.querySelectorAll('.wagara')].map((element) => measure(element, {
      factor: 0.25, range: Infinity, scale: 1, zoom: false,
    })),
  ];
  currentX = getTargetX();
  render();
}

// 画面への反映（transform と opacity だけを変更し、レイアウトの再計算を起こさない）
function render() {
  const viewWidth = window.innerWidth;
  const reduced = motionQuery.matches;

  if (isHorizontal()) {
    hscrollTrack.style.transform = `translate3d(${-currentX}px, 0, 0)`;
    // 写真は文字よりゆっくり動かし、奥行きを出す（拡大しておき、端が見えないよう動きの幅を制限）
    parallaxItems.forEach(({ element, center, width, factor, range, scale, zoom }) => {
      if (reduced) {
        element.style.transform = '';
        return;
      }
      const distance = center - currentX - viewWidth / 2; // 画面の中心からの距離
      const offset = Math.max(-range, Math.min(range, distance * -factor));
      // 国技館の写真は、画面を通り過ぎるにつれて 1.08倍→1.25倍 にゆっくり近づく
      const progress = Math.max(0, Math.min(1, 1 - (distance + width / 2) / (viewWidth + width)));
      const size = zoom ? 1.08 + progress * 0.17 : scale;
      element.style.transform = `translate3d(${offset}px, 0, 0) scale(${size})`;
    });
    if (heroVisual) {
      heroVisual.style.transform = reduced ? '' : `translate3d(${Math.min(currentX, viewWidth) * 0.3}px, 0, 0)`;
    }
    progressFill.style.transform = `scaleX(${hscrollDistance > 0 ? currentX / hscrollDistance : 0})`;
  } else if (heroVisual) {
    // スマホ・タブレットは軽いパララックスだけ
    heroVisual.style.transform = reduced ? '' : `translate3d(0, ${Math.min(window.scrollY, window.innerHeight) * 0.16}px, 0)`;
  }

  // ヘッダー・読了バー・ページトップボタン
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  header.style.setProperty('--read-progress', scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
  header.classList.toggle('is-scrolled', window.scrollY > 40);
  backToTop.classList.toggle('is-shown', window.scrollY >= 500);

  // 現在のセクションを、メニューとプログレスバーで示す
  let current = 'top';
  sections.forEach((section, i) => {
    const reached = isHorizontal()
      ? sectionStarts[i] - currentX <= viewWidth * 0.4
      : section.getBoundingClientRect().top <= header.offsetHeight + 100;
    if (reached) current = section.id;
  });
  currentLinks.forEach((link) => {
    if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

// 1フレームごとに、表示位置を目標へ少しずつ近づける
function frame() {
  frameRequested = false;
  const targetX = isHorizontal() ? getTargetX() : 0;
  if (jumpNextFrame || motionQuery.matches || !isHorizontal()) {
    currentX = targetX;
    jumpNextFrame = false;
  } else {
    currentX += (targetX - currentX) * 0.14;
    if (Math.abs(targetX - currentX) < 0.5) currentX = targetX;
  }
  render();
  if (currentX !== targetX) requestFrame();
}

function requestFrame() {
  if (!frameRequested) {
    frameRequested = true;
    requestAnimationFrame(frame);
  }
}

// 要素の位置まで移動する（横スクロール時は、横の位置を縦のスクロール量に置き換える）
function scrollToElement(target, smooth = true) {
  // 'auto' だとCSSのスムーススクロール設定が使われるため、即時移動は 'instant' を指定する
  const behavior = smooth && !motionQuery.matches ? 'smooth' : 'instant';
  if (!isHorizontal()) {
    target.scrollIntoView({ behavior });
    return;
  }
  const x = target.getBoundingClientRect().left + currentX;
  window.scrollTo({ top: hscroll.offsetTop + Math.min(x, hscrollDistance), behavior });
}

// ページ内リンク（メニュー、ボタン、プログレスバー、ページトップ）
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.hash);
    if (!target || !isHorizontal()) return;
    event.preventDefault();
    scrollToElement(target);
    history.pushState(null, '', link.hash);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
});

// Tabキーで画面外の要素にフォーカスが移ったら、その位置まですぐに横移動する
document.addEventListener('focusin', (event) => {
  if (!isHorizontal() || !hscrollTrack.contains(event.target)) return;
  const rect = event.target.getBoundingClientRect();
  if (rect.left < 0 || rect.right > window.innerWidth) {
    const x = rect.left + currentX - 120;
    window.scrollTo({ top: hscroll.offsetTop + Math.max(0, Math.min(x, hscrollDistance)), behavior: 'instant' });
    jumpNextFrame = true;
    requestFrame();
  }
});

window.addEventListener('scroll', requestFrame, { passive: true });
window.addEventListener('resize', setupHorizontal);
horizontalQuery.addEventListener('change', setupHorizontal);
motionQuery.addEventListener('change', setupHorizontal);
setupHorizontal();

// ==========================================================
// 決まり手の切り替え（タブ）
// HTMLは用語の一覧のまま。JavaScriptが有効なときだけ、ボタンで1つずつ切り替える表示にする
// ==========================================================
document.querySelectorAll('.term-list--kimarite').forEach((list, listIndex) => {
  const items = [...list.children];
  const tablist = document.createElement('div');
  tablist.className = 'kimarite-tabs';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', '決まり手を選ぶ');

  const tabs = items.map((item, i) => {
    const term = item.querySelector('dt');
    const tab = document.createElement('button');
    const panelId = `kimarite-${listIndex}-${i}`;
    tab.type = 'button';
    tab.className = 'kimarite-tabs__tab';
    tab.textContent = term.textContent;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panelId);
    item.id = panelId;
    item.setAttribute('role', 'tabpanel');
    item.setAttribute('aria-label', term.textContent);
    tablist.append(tab);
    return tab;
  });

  function select(index, moveFocus = false) {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      items[i].hidden = !selected;
    });
    if (moveFocus) tabs[index].focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    // ←→キーで隣の決まり手へ（タブ操作の一般的なキーボード操作）
    tab.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        select((i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length, true);
      }
    });
  });

  list.classList.add('is-tabs');
  list.before(tablist);
  select(0);
});

// フッターの大きな文字を1字ずつに分け、順番に浮かび上がらせる
document.querySelectorAll('.footer__mark').forEach((mark) => {
  mark.innerHTML = [...mark.textContent].map((char, i) => (
    `<span style="--i:${i}">${char === ' ' ? '&nbsp;' : char}</span>`
  )).join('');
});

// 手動スライダー。自動再生せず、自分のペースで読めるようにする。
const slider = document.querySelector('.experience');
const slides = [...slider.children];
const controls = document.querySelector('.slider-controls');
const status = controls.querySelector('.slider-status');
let slideIndex = 0;
slider.classList.add('is-slider');
controls.hidden = false;
function showSlide(index) {
  slideIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => {
    slide.hidden = i !== slideIndex;
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'スライド');
    slide.setAttribute('aria-label', `${i + 1} / ${slides.length}`);
  });
  status.textContent = `${String(slideIndex + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
}
controls.querySelector('.slider-prev').addEventListener('click', () => showSlide(slideIndex - 1));
controls.querySelector('.slider-next').addEventListener('click', () => showSlide(slideIndex + 1));
slider.tabIndex = 0;
slider.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    showSlide(slideIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
let touchStart = null;
slider.addEventListener('touchstart', (event) => {
  touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
}, { passive: true });
slider.addEventListener('touchcancel', () => { touchStart = null; });
slider.addEventListener('touchend', (event) => {
  if (!touchStart) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) showSlide(slideIndex + (dx < 0 ? 1 : -1));
  touchStart = null;
}, { passive: true });
showSlide(0);

// URLに #rule などが付いた状態で開いたときは、その位置から表示する
window.addEventListener('load', () => {
  setupHorizontal();
  const target = location.hash && document.querySelector(location.hash);
  if (target && isHorizontal()) {
    scrollToElement(target, false);
    jumpNextFrame = true;
  }
  requestFrame();
});
