const DOMAIN = 'jacob-apps.co.il';

function appUrl(app) {
  if (app.url) return app.url;
  return app.subdomain ? `https://${app.subdomain}.${DOMAIN}/` : null;
}

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

function iconFor(app) {
  const fallback = el('div', { class: 'app-icon', 'aria-hidden': 'true' }, app.name.trim()[0]);
  if (!app.icon) return fallback;
  const img = el('img', { class: 'app-icon', src: app.icon, alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.replaceWith(fallback));
  return img;
}

function isOpen(app) {
  return app.status === 'active' && !!appUrl(app);
}

function hostOf(app) {
  try { return new URL(appUrl(app)).host; } catch { return ''; }
}

function row(app) {
  const open = isOpen(app);
  const root = open
    ? el('a', { class: 'app', href: appUrl(app), target: '_blank', rel: 'noopener' })
    : el('div', { class: 'app is-off' });

  const body = el('div', { class: 'app-body' });
  const title = el('div', { class: 'app-title' });
  title.append(el('h3', {}, app.name));
  const meta = el('div', { class: 'meta' });
  const host = open && hostOf(app);
  if (app.category) meta.append(el('span', { class: 'cat' }, host ? `${app.category} · ` : app.category));
  if (host) meta.append(el('bdi', {}, host));
  title.append(meta);
  body.append(title, el('p', { class: 'desc' }, app.description || ''));
  root.append(iconFor(app), body);

  if (open) {
    root.append(el('span', { class: 'pill', 'aria-hidden': 'true' }, 'פתח'));
  } else {
    const badge = app.badge || 'לא זמין';
    root.append(el('span', { class: `badge${badge === 'פרטי' ? ' private' : ''}` }, badge));
  }
  return root;
}

function topicChip(name) {
  const label = el('label', { class: 'chip' });
  label.append(el('input', { type: 'radio', name: 'topic', value: name }), el('span', {}, name));
  return label;
}

async function loadApps() {
  const openList = document.getElementById('open-list');
  try {
    const res = await fetch('apps.json', { cache: 'no-cache' });
    const apps = (await res.json()).filter(a => a.status !== 'hidden');
    const open = apps.filter(isOpen);
    const more = apps.filter(a => !isOpen(a));

    openList.replaceChildren(...open.map(row));
    document.getElementById('more-list').replaceChildren(...more.map(row));
    for (const [id, n] of [['n-open', open.length], ['n-open-stat', open.length], ['n-more', more.length], ['n-more-stat', more.length]]) {
      document.getElementById(id).textContent = n;
    }
    document.getElementById('apps').hidden = !open.length;
    document.getElementById('more').hidden = !more.length;

    document.getElementById('topics').append(...apps.map(a => topicChip(a.name)));
  } catch {
    openList.textContent = 'לא הצלחתי לטעון את רשימת האפליקציות.';
  }
}

function setupForm() {
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const button = form.querySelector('button[type=submit]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.name.trim() || !data.message.trim()) {
      status.className = 'form-status err';
      status.textContent = 'צריך למלא שם והודעה.';
      return;
    }
    button.disabled = true;
    status.className = 'form-status';
    status.textContent = 'שולח...';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 429) throw new Error('יותר מדי הודעות. נסו שוב בעוד שעה.');
      if (!res.ok) throw new Error('השליחה נכשלה. נסו שוב מאוחר יותר.');
      form.reset();
      status.className = 'form-status ok';
      status.textContent = 'תודה! ההודעה נשלחה.';
    } catch (err) {
      status.className = 'form-status err';
      status.textContent = err.message.startsWith('יותר') || err.message.startsWith('השליחה')
        ? err.message : 'השליחה נכשלה. נסו שוב מאוחר יותר.';
    } finally {
      button.disabled = false;
    }
  });
}

document.getElementById('year').textContent = new Date().getFullYear();
loadApps();
setupForm();
