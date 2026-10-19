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

function row(app) {
  const open = isOpen(app);
  const root = el('article', { class: `app${open ? '' : ' is-off'}` });

  const titles = el('div');
  titles.append(el('h3', {}, app.name));
  if (app.category) titles.append(el('div', { class: 'category' }, app.category));
  root.append(iconFor(app), titles);

  if (open) {
    root.append(el('a', { class: 'pill', href: appUrl(app), target: '_blank', rel: 'noopener' }, 'פתח'));
  } else {
    root.append(el('span', { class: 'pill', 'aria-disabled': 'true' }, app.badge || 'לא זמין'));
  }

  root.append(el('p', { class: 'desc' }, app.description || ''));
  return root;
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
    document.getElementById('count').textContent = apps.length;
    document.getElementById('n-open').textContent = open.length;
    document.getElementById('n-more').textContent = more.length;
    document.getElementById('apps').hidden = !open.length;
    document.getElementById('more').hidden = !more.length;

    const topic = document.getElementById('topic');
    for (const a of apps) topic.append(el('option', {}, a.name));
  } catch {
    openList.textContent = 'לא הצלחתי לטעון את רשימת האפליקציות.';
  }
}

function setupForm() {
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const button = form.querySelector('button');

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
