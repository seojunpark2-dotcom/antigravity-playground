const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { readFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
async function setup(overrides = {}, hash = '', url = 'http://localhost:3000/') {
  const dom = new JSDOM(readFileSync('src/page.html', 'utf8'), { url: url + hash });
  const doc = dom.window.document;
  const dialog = doc.getElementById('authDialog');
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.dispatchEvent(new dom.window.Event('close')); };
  let listener;
  let calls = [];
  const session = { user: { email: 'member@example.com', id: 'member' } };
  const auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (fn) => { listener = fn; },
    signInWithPassword: async (value) => { calls.push(value); return { data: { session }, error: null }; },
    signUp: async (value) => { calls.push(value); return { data: { session: null }, error: null }; },
    signOut: async () => ({ error: null }),
    ...overrides
  };
  const { mountAuth } = await import(pathToFileURL(process.cwd() + '/src/auth-ui.js').href);
  await mountAuth(auth, doc, dom.window);
  const el = (id) => doc.getElementById(id);
  const submit = async () => {
    el('authForm').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    await new Promise((resolve) => setImmediate(resolve));
  };
  const fill = () => { el('authEmail').value = 'member@example.com'; el('authPassword').value = 'strong-password'; };
  return { el, submit, fill, calls, session, emit: (event, s) => listener(event, s), dom };
}
test('login, restored session, auth changes and logout update account UI', async () => {
  const s = await setup();
  s.el('openLogin').click(); s.fill(); await s.submit();
  assert.equal(s.el('authDialog').open, false);
  assert.equal(s.el('memberEmail').textContent, 'member@example.com');
  assert.equal(s.el('authPassword').value, '');
  s.el('logout').click(); await new Promise((r) => setImmediate(r));
  assert.equal(s.el('guestActions').hidden, false);
  s.emit('SIGNED_IN', s.session); assert.equal(s.el('memberActions').hidden, false);
  s.emit('SIGNED_OUT', null); assert.equal(s.el('memberEmail').textContent, '');
  const restored = await setup({ getSession: async () => ({ data: { session: s.session } }) });
  assert.equal(restored.el('guestActions').hidden, true);
});
test('signup rejects mismatched and short passwords before calling provider', async () => {
  const s = await setup();
  s.el('openSignup').click(); s.fill(); s.el('authConfirm').value = 'different-password'; await s.submit();
  assert.equal(s.calls.length, 0); assert.match(s.el('authFeedback').textContent, /일치/);
  s.el('authPassword').value = 'short'; s.el('authConfirm').value = 'short'; await s.submit();
  assert.equal(s.calls.length, 0);
});
test('signup awaiting verification does not falsely mark user logged in', async () => {
  const s = await setup(); s.el('openSignup').click(); s.fill();
  s.el('authConfirm').value = 'strong-password'; await s.submit();
  assert.equal(s.el('memberActions').hidden, true);
  assert.match(s.el('authFeedback').textContent, /인증 메일/);
  assert.equal(s.calls[0].options.emailRedirectTo, 'http://localhost:3000/');
  assert.equal(s.el('authPassword').value, '');
});
test('invalid login, network failure and logout failure display errors', async () => {
  const s = await setup({ signInWithPassword: async () => ({ error: { code: 'invalid_credentials' } }), signOut: async () => ({ error: new Error('offline') }) });
  s.el('openLogin').click(); s.fill(); await s.submit();
  assert.match(s.el('authFeedback').textContent, /올바르지/);
  assert.equal(s.el('authFields').disabled, false);
  s.emit('SIGNED_IN', s.session); s.el('logout').click(); await new Promise((r) => setImmediate(r));
  assert.equal(s.el('memberActions').hidden, false);
  assert.match(s.el('accountMessage').textContent, /로그아웃하지/);
  const offline = await setup({ signInWithPassword: async () => { throw Error('offline'); } });
  offline.el('openLogin').click(); offline.fill(); await offline.submit();
  assert.match(offline.el('authFeedback').textContent, /연결하지/);
});
test('in-flight submit is deduplicated and controls unlock after completion', async () => {
  let resolve;
  let count = 0;
  const s = await setup({ signInWithPassword: () => { count++; return new Promise((r) => { resolve = r; }); } });
  s.el('openLogin').click(); s.fill(); await s.submit(); await s.submit();
  assert.equal(count, 1); assert.equal(s.el('authFields').disabled, true);
  resolve({ data: { session: s.session } }); await new Promise((r) => setImmediate(r));
  assert.equal(s.el('authFields').disabled, false);
});
test('expired confirmation and untrusted email are rendered safely', async () => {
  const s = await setup({}, '#error=access_denied&error_description=expired');
  assert.match(s.el('authFeedback').textContent, /만료/);
  assert.equal(s.dom.window.location.hash, '');
  s.emit('SIGNED_IN', { user: { email: '<img src=x onerror=alert(1)>' } });
  assert.equal(s.el('memberEmail').querySelector('img'), null);
});
test('confirmation resend handles provider limits and restores controls', async () => {
  let call;
  const s = await setup({ resend: async (input) => { call = input; return { error: { code: 'over_email_send_rate_limit' } }; } }, '#error=access_denied');
  s.el('authEmail').value = 'member@example.com';
  s.el('resendConfirmation').click(); await new Promise((r) => setImmediate(r));
  assert.equal(call.type, 'signup');
  assert.equal(call.email, 'member@example.com');
  assert.match(s.el('authFeedback').textContent, /잠시 후/);
  assert.equal(s.el('authFields').disabled, false);
});
test('opening forms does not wait for a stalled session lookup', async () => {
  let resolve;
  const sessionLookup = new Promise((r) => { resolve = r; });
  const dom = new JSDOM(readFileSync('src/page.html', 'utf8'), { url: 'http://localhost:3000' });
  const doc = dom.window.document;
  const dialog = doc.getElementById('authDialog');
  dialog.showModal = () => { dialog.open = true; };
  const { mountAuth } = await import(pathToFileURL(process.cwd() + '/src/auth-ui.js').href);
  const mounting = mountAuth({ onAuthStateChange() {}, getSession: () => sessionLookup }, doc, dom.window);
  doc.getElementById('openLogin').click();
  assert.equal(dialog.open, true);
  assert.equal(doc.getElementById('authTitle').textContent, '로그인');
  doc.getElementById('openSignup').click();
  assert.equal(doc.getElementById('authTitle').textContent, '회원가입');
  resolve({ data: { session: null } });
  await mounting;
});
test('file previews never send a null origin as an email redirect', async () => {
  const s = await setup({}, '', 'file:///C:/preview/index.html');
  s.el('openSignup').click(); s.fill();
  s.el('authConfirm').value = 'strong-password'; await s.submit();
  assert.equal('emailRedirectTo' in s.calls[0].options, false);
  assert.match(s.el('authFeedback').textContent, /인증 메일/);
});
