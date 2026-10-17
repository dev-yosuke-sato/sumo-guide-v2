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
  if (heroVisual) {
    heroVisual.style.setProperty('--parallax', motionQuery.matches ? '0px' : `${Math.min(window.scrollY, window.innerHeight) * 0.16}px`);
  }
  let current = 'top';
  sections.forEach((section) => {
    if (section.getBoundingClientRect().top <= header.offsetHeight + 100) current = section.id;
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
window.addEventListener('resize', requestScrollUpdate);
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
