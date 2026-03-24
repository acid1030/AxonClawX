document.querySelectorAll('[data-tab-group]').forEach((group) => {
  const tabs = group.querySelectorAll('[data-tab]');
  const panes = group.querySelectorAll('[data-tab-pane]');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      tabs.forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
      panes.forEach((pane) => {
        pane.classList.toggle('active', pane.getAttribute('data-tab-pane') === target);
      });
    });
  });
});

document.querySelectorAll('[data-collapse]').forEach((collapse) => {
  const header = collapse.querySelector('[data-collapse-header]');
  const body = collapse.querySelector('[data-collapse-body]');
  if (!header || !body) return;
  header.addEventListener('click', () => {
    body.classList.toggle('open');
  });
});

document.querySelectorAll('[data-modal-trigger]').forEach((trigger) => {
  const targetId = trigger.getAttribute('data-modal-trigger');
  const target = document.querySelector(`[data-modal="${targetId}"]`);
  if (!target) return;
  trigger.addEventListener('click', () => {
    target.classList.add('active');
  });
});

document.querySelectorAll('[data-modal-close]').forEach((close) => {
  close.addEventListener('click', () => {
    const modal = close.closest('[data-modal]');
    if (modal) {
      modal.classList.remove('active');
    }
  });
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelectorAll('[data-modal]').forEach((modal) => {
      modal.classList.remove('active');
    });
  }
});
