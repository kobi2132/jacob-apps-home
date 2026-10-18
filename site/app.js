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

function card(app) {
  const url = appUrl(app);
  const open = app.status === 'active' && url;
  const root = el('article', { class: `card app${open ? '' : ' is-off'}` });

  const head = el('div', { class: 'app-head' });
  const titles = el('div');
  titles.append(el('h3', {}, app.name));
  if (app.category) titles.append(el('div', { class: 'category' }, app.category));
  head.append(iconFor(app), titles);
  root.append(head);

  if (open) {
    root.append(el('a', { class: 'btn', href: url, target: '_blank', rel: 'noopener' }, 'פתח'));
  } else {
    root.append(el('span', { class: 'btn btn-off', 'aria-disabled': 'true' }, app.badge || 'לא זמין'));
  }

  root.append(el('p', { class: 'desc' }, app.description || ''));
  return root;
}

async function loadApps() {
  const grid = document.getElementById('grid');
  try {
    const res = await fetch('apps.json', { cache: 'no-cache' });
    const apps = (await res.json()).filter(a => a.status !== 'hidden');
    // Openable apps first, keeping file order within each group.
    apps.sort((a, b) => (b.status === 'active') - (a.status === 'active'));
    grid.replaceChildren(...apps.map(card));

    const topic = document.getElementById('topic');
    for (const a of apps) topic.append(el('option', {}, a.name));
  } catch {
    grid.textContent = 'לא הצלחתי לטעון את רשימת האפליקציות.';
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
