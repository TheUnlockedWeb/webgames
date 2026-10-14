/* ------------------------------------------------------------------
 * ui.js — tiny modal manager + toast used by every dialog.
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  const TL = (window.TL = window.TL || {});
  const stack = [];

  TL.modal = {
    /**
     * Opens a modal. Elements with [data-close] inside it close it.
     * Returns the overlay element; call overlay.close() to close from code.
     */
    open({ cls = '', html = '', onClose = null, dismissable = true }) {
      const root = document.getElementById('modal-root');
      const overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
      const opener = document.activeElement;
      let closed = false;

      overlay.close = () => {
        if (closed) return;
        closed = true;
        const i = stack.indexOf(overlay);
        if (i >= 0) stack.splice(i, 1);
        overlay.classList.add('out');
        setTimeout(() => overlay.remove(), 120);
        if (!stack.length) document.body.classList.remove('modal-open');
        if (onClose) onClose();
        if (opener && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      };
      overlay.dismissable = dismissable;

      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay && dismissable) overlay.close();
      });
      overlay.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) overlay.close();
      });

      root.appendChild(overlay);
      stack.push(overlay);
      document.body.classList.add('modal-open');
      return overlay;
    },
    closeTop() {
      const top = stack[stack.length - 1];
      if (top && top.dismissable) top.close();
    },
    isOpen: () => stack.length > 0,
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stack.length) TL.modal.closeTop();
  });

  /* ---------- toast ---------- */
  let toastTimer = null;
  TL.toast = function (msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  };
})();
