const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const wait = () => new Promise((r) => setTimeout(r, 20));
test('standalone HTML contains its assets and runs the real SDK signup/login/logout flows', async () => {
  const html = readFileSync('index.html', 'utf8');
  const storage = new Map();
  const requests = [];
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', (e) => errors.push(e.message));
  const user = { id: '12345678-1234-1234-1234-123456789012', email: 'artifact@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'test'].join('.');
  const dom = new JSDOM(html, {
    url: 'file:///C:/preview/index.html', runScripts: 'dangerously',
    virtualConsole: console,
    beforeParse(win) {
      Object.defineProperty(win, 'localStorage', { value: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: (key) => storage.delete(key)
      } });
      win.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
      win.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new win.Event('close')); };
      win.fetch = async (url, options) => {
        requests.push({ url: String(url), body: options?.body && JSON.parse(options.body) });
        if (String(url).includes('/signup')) return new Response(JSON.stringify({ user, session: null }), { status: 200 });
        if (String(url).includes('/token')) return new Response(JSON.stringify({ access_token: jwt, refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, user }), { status: 200 });
        if (String(url).includes('/logout')) return new Response(null, { status: 204 });
        throw new Error('Unexpected request ' + url);
      };
    }
  });
  try {
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('script[src], link[rel="stylesheet"]').length, 0);
    for (let i = 0; i < 30 && doc.getElementById('openSignup').disabled; i++) await wait();
    doc.getElementById('openSignup').click();
    assert.equal(doc.getElementById('authDialog').open, true);
    doc.getElementById('authEmail').value = user.email;
    doc.getElementById('authPassword').value = 'artifact-test-password';
    doc.getElementById('authConfirm').value = 'artifact-test-password';
    doc.getElementById('authForm').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    for (let i = 0; i < 30 && doc.getElementById('authFields').disabled; i++) await wait();
    assert.match(doc.getElementById('authFeedback').textContent, /인증 메일/);
    assert.equal(requests[0].url.includes('redirect_to'), false);
    doc.getElementById('authPassword').value = 'artifact-test-password';
    doc.getElementById('authForm').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    for (let i = 0; i < 30 && doc.getElementById('authFields').disabled; i++) await wait();
    assert.equal(doc.getElementById('memberEmail').textContent, user.email);
    assert.equal(doc.getElementById('authDialog').open, false);
    assert.ok(storage.has('antigravity-auth'));
    doc.getElementById('logout').click();
    for (let i = 0; i < 30 && doc.getElementById('logout').disabled; i++) await wait();
    assert.equal(doc.getElementById('guestActions').hidden, false);
    assert.equal(storage.has('antigravity-auth'), false);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
