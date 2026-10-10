'use client';

import { useEffect } from 'react';

export default function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector('.rentiaLanding');
    if (!root) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sections = root.querySelectorAll<HTMLElement>('[data-landing-reveal]');
    const scenes = root.querySelectorAll<HTMLElement>('[data-landing-scene]');
    const beams = root.querySelectorAll<HTMLElement>('[data-landing-beam]');
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
    const menuCleanups: (() => void)[] = [];
    const menuTimers = new Map<HTMLDetailsElement, ReturnType<typeof setTimeout>>();
    function cancelMenuClose(menu: HTMLDetailsElement) {
      clearTimeout(menuTimers.get(menu));
      menuTimers.delete(menu);
    }
    root.querySelectorAll<HTMLDetailsElement>('[data-product-menu]').forEach(menu => {
      const enter = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || !hover.matches) return;
        cancelMenuClose(menu);
        menu.open = true;
      };
      const leave = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse') return;
        cancelMenuClose(menu);
        menuTimers.set(menu, setTimeout(() => {
          menuTimers.delete(menu);
          if (!menu.contains(document.activeElement)) menu.open = false;
        }, 200));
      };
      const blur = (event: FocusEvent) => {
        if (!menu.contains(event.relatedTarget as Node | null) && !menu.matches(':hover')) {
          cancelMenuClose(menu);
          menu.open = false;
        }
      };
      menu.addEventListener('pointerenter', enter);
      menu.addEventListener('pointerleave', leave);
      menu.addEventListener('focusout', blur);
      menuCleanups.push(() => {
        cancelMenuClose(menu);
        menu.removeEventListener('pointerenter', enter);
        menu.removeEventListener('pointerleave', leave);
        menu.removeEventListener('focusout', blur);
      });
    });
    let observer: IntersectionObserver | undefined;
    let sceneObserver: IntersectionObserver | undefined;
    let beamObserver: IntersectionObserver | undefined;
    function updatePageVisibility() { root?.classList.toggle('landingPageActive', document.visibilityState === 'visible'); }
    function closeMenus(event: Event) {
      const target = event.target;
      root?.querySelectorAll<HTMLDetailsElement>('[data-product-menu]').forEach(menu => {
        if (event instanceof KeyboardEvent ? event.key === 'Escape' : target instanceof Element && (!menu.contains(target) || !!target.closest('a'))) {
          cancelMenuClose(menu);
          if (event instanceof KeyboardEvent && menu.open && menu.contains(document.activeElement)) menu.querySelector('summary')?.focus();
          menu.open = false;
        }
      });
    }
    function setup() {
      observer?.disconnect();
      sceneObserver?.disconnect();
      beamObserver?.disconnect();
      sections.forEach(section => section.classList.remove('landingRevealPending'));
      scenes.forEach(scene => scene.classList.remove('isSceneVisible'));
      beams.forEach(beam => beam.classList.remove('isBeamVisible'));
      if (preference.matches) return;
      beamObserver = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('isBeamVisible', entry.isIntersecting)), { threshold: .1 });
      beams.forEach(beam => beamObserver?.observe(beam));
      sceneObserver = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('isSceneVisible', entry.isIntersecting)), {threshold:.15});
      scenes.forEach(scene => sceneObserver?.observe(scene));
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove('landingRevealPending');
          observer?.unobserve(entry.target);
        });
      }, { threshold: .05, rootMargin: '0px 0px -30px 0px' });
      sections.forEach(section => {
        if (section.getBoundingClientRect().top > window.innerHeight) {
          section.classList.add('landingRevealPending');
          observer?.observe(section);
        }
      });
    }
    setup();
    updatePageVisibility();
    preference.addEventListener('change', setup);
    document.addEventListener('visibilitychange', updatePageVisibility);
    document.addEventListener('click', closeMenus);
    document.addEventListener('keydown', closeMenus);
    return () => {
      menuCleanups.forEach(cleanup => cleanup());
      observer?.disconnect();
      sceneObserver?.disconnect();
      beamObserver?.disconnect();
      preference.removeEventListener('change', setup);
      document.removeEventListener('visibilitychange', updatePageVisibility);
      document.removeEventListener('click', closeMenus);
      document.removeEventListener('keydown', closeMenus);
      root.classList.remove('landingPageActive');
      sections.forEach(section => section.classList.remove('landingRevealPending'));
      scenes.forEach(scene => scene.classList.remove('isSceneVisible'));
      beams.forEach(beam => beam.classList.remove('isBeamVisible'));
    };
  }, []);
  return null;
}
