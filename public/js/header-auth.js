(function () {
  const $ = (s, r = document) => r.querySelector(s);

  // Hide all modals on page load
  document.addEventListener('DOMContentLoaded', function () {
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('open');
    });
  });

  // Elements
  const loginBtn = $('#loginBtn');
  const logoutBtn = $('#logoutBtn');
  const loginModal = $('#loginModal');
  const loginClose = $('#closeLoginModal');
  const loginForm = $('#loginForm');
  const loginErr = $('#loginError');
  const toRegister = $('#toRegister');

  const registerBtn = $('#registerBtn');
  const registerModal = $('#registerModal');
  const registerClose = $('#closeRegisterModal');
  const registerForm = $('#registerForm');
  const registerErr = $('#registerError');
  const toLogin = $('#toLogin');

  function open(el) {
    if (!el) return;
    el.style.display = 'flex';
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('open');
  }
  function close(el) {
    if (!el) return;
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
    el.classList.remove('open');
  }

  // Helper: Check if modal exists on page
  function modalExists(el) {
    return el && document.body.contains(el);
  }

  // Login button
  loginBtn && loginBtn.addEventListener('click', (e) => {
    if (modalExists(loginModal)) {
      e.preventDefault();
      open(loginModal);
    }
    // else → normal link to /auth/login will work
  });

  loginClose && loginClose.addEventListener('click', () => close(loginModal));
  loginModal && loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) close(loginModal);
  });

  // Register button
  registerBtn && registerBtn.addEventListener('click', (e) => {
    if (modalExists(registerModal)) {
      e.preventDefault();
      open(registerModal);
    }
    // else → normal link to /auth/register will work
  });

  registerClose && registerClose.addEventListener('click', () => close(registerModal));
  registerModal && registerModal.addEventListener('click', (e) => {
    if (e.target === registerModal) close(registerModal);
  });

  // Toggle between forms
  toRegister && toRegister.addEventListener('click', (e) => {
    e.preventDefault();
    close(loginModal);
    open(registerModal);
  });
  toLogin && toLogin.addEventListener('click', (e) => {
    e.preventDefault();
    close(registerModal);
    open(loginModal);
  });

  // Escape to close any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close(loginModal);
      close(registerModal);
    }
  });

  // Logout
  logoutBtn && logoutBtn.addEventListener('click', async () => {
    console.log('🔄 Attempting logout...');
    try {
      const res = await fetch('/auth/logout', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json' 
        },
        credentials: 'include' // Include cookies (access token)
      });
      if (!res.ok) throw new Error('Logout failed');
      console.log('✅ Logout successful');
      location.reload();
    } catch (e) {
      console.error('❌ Logout error:', e);
      // Even if logout fails on server, clear client state
      document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      console.log('🧹 Cleared client-side auth cookies');
      location.reload();
    }
  });

  // Login submit
  loginForm && loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('🔄 Attempting login...');
    const fd = new FormData(loginForm);
    const identifier = (fd.get('identifier') || '').toString().trim();
    const password = (fd.get('password') || '').toString();
    if (!identifier) { 
      console.log('❌ Login failed: Missing email/username');
      loginErr && (loginErr.textContent = 'Enter email or username', loginErr.style.display = 'block'); 
      return; 
    }
    if (!password) { 
      console.log('❌ Login failed: Missing password');
      loginErr && (loginErr.textContent = 'Enter password', loginErr.style.display = 'block'); 
      return; 
    }
    const body = identifier.includes('@') ? { email: identifier, password } : { username: identifier, password };
    console.log('📤 Sending login request for:', identifier.includes('@') ? 'email' : 'username', identifier);
    try {
      loginErr && (loginErr.style.display = 'none');
      const res = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data && data.message || 'Login failed');
      console.log('✅ Login successful for user:', data.user?.username || identifier);
      close(loginModal);
      
      // Check if we're on a protected page (pose detection)
      if (window.location.pathname === '/pose' || window.location.pathname === '/index') {
        console.log('🔄 On protected page, reloading after login');
        location.reload();
        return;
      }
      
      const params = new URLSearchParams(location.search);
      if (params.get('next')) location.href = params.get('next');
      else location.reload();
    } catch (e) {
      console.error('❌ Login failed:', e.message);
      if (loginErr) { loginErr.textContent = e.message || 'Login failed'; loginErr.style.display = 'block'; }
      else alert(e.message || 'Login failed');
    }
  });

  // Register submit
  registerForm && registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('🔄 Attempting registration...');
    const fd = new FormData(registerForm);
    const payload = {
      fullName: (fd.get('fullName') || '').toString().trim(),
      username: (fd.get('username') || '').toString().trim(),
      email: (fd.get('email') || '').toString().trim(),
      password: (fd.get('password') || '').toString(),
    };
    console.log('📋 Registration data:', { 
      fullName: payload.fullName, 
      username: payload.username, 
      email: payload.email, 
      password: '***hidden***' 
    });
    if (!payload.fullName || !payload.username || !payload.email || !payload.password) {
      console.log('❌ Registration failed: Missing required fields');
      if (registerErr) { registerErr.textContent = 'All fields are required'; registerErr.style.display = 'block'; }
      return;
    }
    try {
      registerErr && (registerErr.style.display = 'none');
      console.log('📤 Sending registration request...');
      const res = await fetch('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data && data.message || 'Register failed');
      console.log('✅ Registration successful for user:', payload.username);
      if (data && (data.accessToken || data.refreshToken)) {
        console.log('🔐 Auth tokens received, redirecting to home...');
        close(registerModal);
        
        // Check if we're on a protected page (pose detection)
        if (window.location.pathname === '/pose' || window.location.pathname === '/index') {
          console.log('🔄 On protected page, reloading after registration');
          location.reload();
          return;
        }
        
        location.href = '/';
      } else {
        console.log('📝 Registration complete, prompting for login...');
        close(registerModal);
        alert('Registered successfully. Please log in to continue.');
        open(loginModal);
      }
    } catch (e) {
      console.error('❌ Registration failed:', e.message);
      if (registerErr) { registerErr.textContent = e.message || 'Register failed'; registerErr.style.display = 'block'; }
      else alert(e.message || 'Register failed');
    }
  });

  // Auto-open login/register based on URL params
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('login') === '1' && params.get('auto') === '1' && modalExists(loginModal)) {
      open(loginModal);
    }
    if (params.get('register') === '1' && params.get('auto') === '1' && modalExists(registerModal)) {
      open(registerModal);
    }
  } catch { }
})();
