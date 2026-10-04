export async function mountAuth(auth, doc, win) {
  const el = (id) => doc.getElementById(id);
  let mode = 'login';
  let busy = false;
  let revision = 0;
  // file:// has no HTTP origin. Let Supabase use its configured Site URL
  // for confirmation emails instead of sending an invalid "null/" redirect.
  const redirectOptions = /^https?:$/.test(win.location.protocol)
    ? { emailRedirectTo: win.location.origin + '/' } : {};
  const feedback = (message, error = false) => {
    el('authFeedback').textContent = message;
    el('authFeedback').dataset.error = String(error);
  };
  const errors = {
    invalid_credentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    email_not_confirmed: '받은 메일에서 이메일 인증을 완료한 후 로그인해주세요.',
    user_already_exists: '가입을 완료할 수 없습니다. 기존 계정으로 로그인해보세요.',
    weak_password: '더 안전한 비밀번호를 입력해주세요.',
    email_address_invalid: '유효한 이메일 주소를 입력해주세요.',
    email_address_not_authorized: '현재 이메일 발송 설정에서 이 주소로 인증 메일을 보낼 수 없습니다. 관리자에게 문의해주세요.',
    signup_disabled: '현재 회원가입이 잠시 중단되었습니다.',
    over_email_send_rate_limit: '인증 메일 요청이 많습니다. 잠시 후 다시 시도해주세요.',
    over_request_rate_limit: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  };
  const errorText = (error) => errors[error.code] || (error.status === 429
    ? '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
    : '요청을 완료하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
  function render(session) {
    const user = session?.user;
    el('accountStatus').textContent = user ? '로그인됨' : '게스트';
    el('accountMessage').textContent = user ? '로그인되었습니다. 오늘도 집중하는 시간을 만들어보세요.' : '계정을 만들거나 로그인하세요. 로그인 상태는 이 브라우저에서 유지됩니다.';
    el('guestActions').hidden = !!user;
    el('memberActions').hidden = !user;
    el('memberEmail').textContent = user?.email || '';
    el('openLogin').disabled = false;
    el('openSignup').disabled = false;
  }
  function setMode(next) {
    mode = next;
    const signup = mode === 'signup';
    el('authTitle').textContent = signup ? '회원가입' : '로그인';
    el('authDescription').textContent = signup ? '이메일과 비밀번호로 새 계정을 만드세요.' : '이메일과 비밀번호로 로그인하세요.';
    el('authSubmit').textContent = signup ? '회원가입' : '로그인';
    el('switchAuth').textContent = signup ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입';
    el('confirmField').hidden = !signup;
    el('passwordHint').hidden = !signup;
    el('authConfirm').required = signup;
    el('authConfirm').value = '';
    el('authPassword').value = '';
    el('authPassword').minLength = signup ? 8 : 1;
    el('authPassword').autocomplete = signup ? 'new-password' : 'current-password';
    el('resendConfirmation').hidden = true;
    feedback('');
  }
  function open(next) {
    setMode(next);
    el('authDialog').showModal();
    el('authEmail').focus();
  }
  el('openLogin').addEventListener('click', () => open('login'));
  el('openSignup').addEventListener('click', () => open('signup'));
  el('switchAuth').addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));
  el('closeAuth').addEventListener('click', () => { if (!busy) el('authDialog').close(); });
  el('authDialog').addEventListener('cancel', (event) => { if (busy) event.preventDefault(); });
  el('authDialog').addEventListener('close', () => {
    el('authPassword').value = '';
    el('authConfirm').value = '';
    feedback('');
  });
  el('authForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !el('authForm').reportValidity()) return;
    const email = el('authEmail').value.trim();
    const password = el('authPassword').value;
    if (mode === 'signup' && password.length < 8) {
      feedback('비밀번호는 8자 이상으로 입력해주세요.', true);
      return;
    }
    if (mode === 'signup' && password !== el('authConfirm').value) {
      feedback('비밀번호가 일치하지 않습니다.', true);
      el('authConfirm').focus();
      return;
    }
    busy = true;
    el('authFields').disabled = true;
    el('closeAuth').disabled = true;
    feedback('처리 중입니다…');
    try {
      const result = mode === 'signup'
        ? await auth.signUp({ email, password, options: redirectOptions })
        : await auth.signInWithPassword({ email, password });
      if (result.error) {
        feedback(errorText(result.error), true);
        el('resendConfirmation').hidden = result.error.code !== 'email_not_confirmed';
        return;
      }
      el('authPassword').value = '';
      el('authConfirm').value = '';
      if (result.data.session) {
        render(result.data.session);
        el('authDialog').close();
      } else {
        setMode('login');
        el('resendConfirmation').hidden = false;
        feedback('가입 가능한 주소라면 인증 메일을 보냈습니다. 받은 메일과 스팸함을 확인하고 이메일 인증 후 로그인해주세요.');
      }
    } catch {
      feedback('서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.', true);
    } finally {
      busy = false;
      el('authFields').disabled = false;
      el('closeAuth').disabled = false;
    }
  });
  el('logout').addEventListener('click', async () => {
    el('logout').disabled = true;
    try {
      const { error } = await auth.signOut({ scope: 'local' });
      if (error) throw error;
      render(null);
    } catch {
      el('accountMessage').textContent = '로그아웃하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
    } finally { el('logout').disabled = false; }
  });
  el('resendConfirmation').addEventListener('click', async () => {
    if (busy || !el('authEmail').reportValidity()) return;
    busy = true;
    el('authFields').disabled = true;
    el('closeAuth').disabled = true;
    try {
      const { error } = await auth.resend({
        type: 'signup', email: el('authEmail').value.trim(),
        options: redirectOptions
      });
      feedback(error ? errorText(error) : '가입 가능한 주소라면 인증 메일을 다시 보냈습니다. 받은 메일과 스팸함을 확인해주세요.', !!error);
    } catch { feedback('메일을 요청하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.', true); }
    finally { busy = false; el('authFields').disabled = false; el('closeAuth').disabled = false; }
  });
  // Opening a form must never depend on the network or session restoration.
  render(null);
  auth.onAuthStateChange((event, session) => {
    revision++;
    render(session);
    if (session && el('authDialog').open) el('authDialog').close();
  });
  const initialRevision = revision;
  try {
    const { data, error } = await auth.getSession();
    if (error) throw error;
    if (revision === initialRevision) render(data.session);
  } catch {
    if (revision === initialRevision) {
      render(null);
      el('accountMessage').textContent = '로그인 상태를 확인하지 못했습니다. 다시 로그인해주세요.';
    }
  }
  if (new URLSearchParams(win.location.hash.slice(1)).has('error')) {
    open('login');
    el('resendConfirmation').hidden = false;
    feedback('이메일 인증 링크가 만료되었거나 유효하지 않습니다. 인증 메일을 다시 요청해주세요.', true);
    win.history.replaceState(null, '', win.location.pathname);
  }
}
