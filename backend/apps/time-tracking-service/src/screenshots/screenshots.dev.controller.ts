import { Controller, Get, Header } from '@nestjs/common';

/** Dev-only helper page. Visit: http://localhost:3017/dev/screenshots */
@Controller('dev/screenshots')
export class ScreenshotsDevController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  page() {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dev — Screenshots</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, Arial; margin: 24px; }
    input { padding: 6px 8px; margin-right: 8px; }
    button { padding: 6px 10px; margin-left: 6px; }
    .row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #eee; }
    .muted { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Dev — Screenshots</h1>
  <div>
    <label>UserId <input id="userId" placeholder="test-user" /></label>
    <label>Bearer <input id="bearer" placeholder="dev-secret-123" /></label>
    <button id="save">Save</button>
  </div>
  <p class="muted">Values persist in localStorage.</p>
  <div style="margin-top: 16px;"><button id="refresh">Refresh</button></div>
  <div id="list" style="margin-top: 16px;"></div>
<script>
(function() {
  const $ = id => document.getElementById(id);
  $('userId').value = localStorage.getItem('dev_user_id') || 'test-user';
  $('bearer').value = localStorage.getItem('dev_bearer') || '';
  $('save').onclick = () => {
    localStorage.setItem('dev_user_id', $('userId').value.trim());
    localStorage.setItem('dev_bearer', $('bearer').value.trim());
    load();
  };
  $('refresh').onclick = () => load();
  async function api(method, url, body) {
    const h = { Accept: 'application/json' };
    const tok = $('bearer').value.trim();
    if (tok) h['Authorization'] = 'Bearer ' + tok;
    if (body) h['Content-Type'] = 'application/json';
    const r = await fetch(url, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error(method + ' ' + url + ' -> ' + r.status);
    return r.json();
  }
  async function load() {
    const userId = $('userId').value.trim();
    if (!userId) { $('list').innerHTML = '<p>Please set a userId.</p>'; return; }
    $('list').innerHTML = '<p class="muted">Loading…</p>';
    try {
      const data = await api('GET', location.origin + '/api/screenshots?userId=' + encodeURIComponent(userId) + '&limit=50');
      const items = data.items || [];
      if (!items.length) { $('list').innerHTML = '<p>No screenshots.</p>'; return; }
      const frag = document.createDocumentFragment();
      items.forEach(it => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = '<div><b>ID:</b> ' + it.id + '</div><div><b>key:</b> ' + it.key + '</div><div class="muted">at ' + it.createdAt + '</div><button>Delete</button>';
        row.querySelector('button').onclick = async () => {
          const btn = row.querySelector('button');
          btn.disabled = true;
          try {
            await api('DELETE', location.origin + '/api/screenshots/' + it.id + '?userId=' + encodeURIComponent(userId));
            row.remove();
            if (!document.querySelector('#list .row')) $('list').innerHTML = '<p>No screenshots.</p>';
          } catch(e) { alert('Delete failed: ' + e.message); btn.disabled = false; }
        };
        frag.appendChild(row);
      });
      $('list').innerHTML = '';
      $('list').appendChild(frag);
    } catch(e) { $('list').innerHTML = '<p style="color:#b00;">' + e.message + '</p>'; }
  }
  load();
})();
</script>
</body>
</html>`;
  }
}
