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

// 画面に入った要素を、一度だけ順に表示する。
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealTargets = document.querySelectorAll(
  '.hero__content > *, .section-heading, .photo, .about > *, .card, .section__intro, .ranking__item, .note'
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
    element.style.setProperty('--reveal-delay', `${Math.min(index, 3) * 100}ms`);
    element.classList.add('reveal');
    revealObserver.observe(element);
  });
}

// ==========================================================
// 横スクロール（PC・タブレット）
// 縦にスクロールした量だけ、ページの中身を左へ動かす。
// ホイール・トラックパッド・キーボード（↓、Space、PageDown）は、ブラウザ本来の縦スクロールをそのまま使う。
// ==========================================================
const horizontalQuery = window.matchMedia('(min-width: 768px) and (min-height: 600px)');
const hscroll = document.querySelector('.hscroll');
const hscrollTrack = document.querySelector('.hscroll__track');
let hscrollDistance = 0;

function isHorizontal() {
  return document.documentElement.classList.contains('is-horizontal');
}

// 横に動ける距離を測り、その分だけ縦の長さを確保する
function setupHorizontal() {
  document.documentElement.classList.toggle('is-horizontal', horizontalQuery.matches);
  if (isHorizontal()) {
    hscrollDistance = Math.max(0, hscrollTrack.scrollWidth - window.innerWidth);
    hscroll.style.setProperty('--hscroll-height', `${hscrollDistance + window.innerHeight}px`);
  } else {
    hscrollDistance = 0;
    hscroll.style.removeProperty('--hscroll-height');
    hscrollTrack.style.removeProperty('--hscroll-x');
  }
}

// 今、横に何px動いているか
function getHorizontalX() {
  return Math.min(hscrollDistance, Math.max(0, window.scrollY - hscroll.offsetTop));
}

// 要素の位置まで移動する（横スクロール時は、横の位置を縦のスクロール量に置き換える）
function scrollToElement(target, smooth = true) {
  // 'auto' だとCSSのスムーススクロール設定が使われるため、即時移動は 'instant' を指定する
  const behavior = smooth && !motionQuery.matches ? 'smooth' : 'instant';
  if (!isHorizontal()) {
    target.scrollIntoView({ behavior });
    return;
  }
  const x = target.getBoundingClientRect().left + getHorizontalX();
  window.scrollTo({ top: hscroll.offsetTop + Math.min(x, hscrollDistance), behavior });
}

// ページ内リンク（メニュー、ボタン、ページトップ）
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

// Tabキーで画面外の要素にフォーカスが移ったら、その位置まで横に移動する
document.addEventListener('focusin', (event) => {
  if (!isHorizontal() || !hscrollTrack.contains(event.target)) return;
  const rect = event.target.getBoundingClientRect();
  if (rect.left < 0 || rect.right > window.innerWidth) {
    window.scrollTo({ top: window.scrollY + rect.left - 120, behavior: 'instant' });
  }
});

window.addEventListener('resize', () => {
  setupHorizontal();
  requestScrollUpdate();
});
horizontalQuery.addEventListener('change', () => {
  setupHorizontal();
  requestScrollUpdate();
});
setupHorizontal();

// 読了バー、ヘッダー、現在地ナビを1フレームにまとめて更新する。
const header = document.querySelector('.header');
const heroVisual = document.querySelector('.hero__visual');
const backToTop = document.querySelector('.back-to-top');
const sections = [...document.querySelectorAll('main > section[id]')];
let scrollPending = false;
function updateScroll() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  header.style.setProperty('--read-progress', scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
  header.classList.toggle('is-scrolled', window.scrollY > 40);
  backToTop.hidden = window.scrollY < 500;
  const x = isHorizontal() ? getHorizontalX() : 0;
  hscrollTrack.style.setProperty('--hscroll-x', x);
  if (heroVisual) {
    const parallax = motionQuery.matches ? 0 : Math.min(window.scrollY, window.innerHeight) * 0.16;
    heroVisual.style.setProperty('--parallax', isHorizontal() ? '0px' : `${parallax}px`);
    heroVisual.style.setProperty('--parallax-x', motionQuery.matches ? '0px' : `${Math.min(x, window.innerWidth) * 0.3}px`);
  }
  let current = 'top';
  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (isHorizontal() ? rect.left <= window.innerWidth * 0.4 : rect.top <= header.offsetHeight + 100) current = section.id;
  });
  navLinks.forEach((link) => {
    if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scrollPending = false;
}
function requestScrollUpdate() {
  if (!scrollPending) {
    scrollPending = true;
    requestAnimationFrame(updateScroll);
  }
}
window.addEventListener('scroll', requestScrollUpdate, { passive: true });
motionQuery.addEventListener('change', requestScrollUpdate);
updateScroll();

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
  if (target && isHorizontal()) scrollToElement(target, false);
  requestScrollUpdate();
});
