import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/*
 * Shared motion vocabulary for the landing page.
 *
 * Every helper is a no-op when the visitor asks for reduced motion, and none of
 * them rely on CSS to hide anything up front - the "from" state is only ever set
 * at runtime by GSAP. That way a visitor who never triggers an animation (reduced
 * motion, a failed script, a trigger that never scrolls into view) still sees
 * fully rendered content rather than a blank section.
 */

export const EASE = 'power3.out';

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** Fade-and-rise, played once when the element scrolls into view. */
export function revealOnScroll(targets, { y = 28, stagger = 0, delay = 0, trigger } = {}) {
  if (prefersReducedMotion() || !targets) return;

  gsap.fromTo(
    targets,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: EASE,
      stagger,
      delay,
      scrollTrigger: { trigger: trigger ?? targets, start: 'top 85%', once: true },
    },
  );
}

/** Cards sliding in from the side - used by the squad rail. */
export function revealFromSide(targets, { x = 40, stagger = 0.08, trigger } = {}) {
  if (prefersReducedMotion() || !targets) return;

  gsap.fromTo(
    targets,
    { opacity: 0, x },
    {
      opacity: 1,
      x: 0,
      duration: 0.7,
      ease: EASE,
      stagger,
      scrollTrigger: { trigger: trigger ?? targets, start: 'top 85%', once: true },
    },
  );
}

/**
 * Counts an element's text from 0 to `value` when it enters the viewport.
 * Under reduced motion the final figure is written immediately.
 */
export function countUp(element, value, { duration = 1.4 } = {}) {
  if (!element) return;

  if (prefersReducedMotion()) {
    element.textContent = String(value);
    return;
  }

  const counter = { current: 0 };

  gsap.to(counter, {
    current: value,
    duration,
    ease: 'power2.out',
    scrollTrigger: { trigger: element, start: 'top 90%', once: true },
    onUpdate: () => {
      element.textContent = String(Math.round(counter.current));
    },
    onComplete: () => {
      element.textContent = String(value);
    },
  });
}

/**
 * The hero's opening sequence: nav, then label, headline lines, copy, buttons,
 * and the 3D ball last. Returns the timeline so the caller can dispose of it.
 */
export function playHeroIntro(scope) {
  if (prefersReducedMotion()) return null;

  const timeline = gsap.timeline({ defaults: { ease: EASE, duration: 0.9 } });
  const q = gsap.utils.selector(scope);

  timeline
    .fromTo(q('[data-hero="nav"]'), { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.7 })
    .fromTo(q('[data-hero="label"]'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3')
    .fromTo(
      q('[data-hero="line"]'),
      { opacity: 0, yPercent: 110 },
      { opacity: 1, yPercent: 0, stagger: 0.12 },
      '-=0.25',
    )
    .fromTo(q('[data-hero="copy"]'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.5')
    .fromTo(
      q('[data-hero="cta"]'),
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 },
      '-=0.45',
    )
    .fromTo(
      q('[data-hero="stage"]'),
      { opacity: 0, scale: 0.86 },
      { opacity: 1, scale: 1, duration: 1.2 },
      '-=0.9',
    )
    .fromTo(q('[data-hero="glow"]'), { opacity: 0 }, { opacity: 1, duration: 1.4 }, '-=1.1');

  return timeline;
}
