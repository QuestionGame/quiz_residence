/* Shared behaviour of the slide-up sheets (item sheet, trainer picker):
   bottom sheet on phones / centered dialog on desktop, closed by ✕, backdrop, Esc, swipe down
   or the phone's Back button (opening pushes a history entry that closing consumes). */

export function createSheet({ rootId, dialogId, stateKey }) {
  let returnFocus = null;
  const root = () => document.getElementById(rootId);
  const dialog = () => document.getElementById(dialogId);
  const isOpen = () => root().classList.contains('is-open');

  function open(trigger) {
    const wasOpen = isOpen();
    returnFocus = trigger || document.activeElement;
    root().classList.add('is-open');
    root().setAttribute('aria-hidden', 'false');
    document.body.classList.add('sheet-is-open');
    dialog().scrollTop = 0;
    if (!wasOpen) history.pushState({ sheet: stateKey }, '');
    requestAnimationFrame(() => dialog().focus({ preventScroll: true }));
  }

  function hide() {
    if (!isOpen()) return;
    root().classList.remove('is-open');
    root().setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.item-sheet-root.is-open')) document.body.classList.remove('sheet-is-open');
    if (returnFocus instanceof HTMLElement) returnFocus.focus({ preventScroll: true });
  }

  /* Closing goes through history so the entry pushed on open is consumed (popstate → hide). */
  function close() {
    if (!isOpen()) return;
    if (history.state?.sheet === stateKey) history.back(); else hide();
  }

  function bind() {
    window.addEventListener('popstate', () => { if (history.state?.sheet !== stateKey) hide(); });

    // Swipe down from the top of the sheet closes it.
    let startY = null;
    dialog().addEventListener('touchstart', event => {
      startY = dialog().scrollTop === 0 ? event.touches[0].clientY : null;
    }, { passive: true });
    dialog().addEventListener('touchend', event => {
      if (startY !== null && event.changedTouches[0].clientY - startY > 100) close();
      startY = null;
    }, { passive: true });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && isOpen()) close();
    });
  }

  return { open, close, hide, isOpen, bind };
}
