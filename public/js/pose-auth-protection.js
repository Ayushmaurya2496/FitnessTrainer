(function () {
  // Only run if auth protection overlay exists (user not logged in)
  const authOverlay = document.getElementById('authProtectionOverlay');
  if (!authOverlay) return;

  console.log('🔒 Auth protection active - user not logged in');

  const protectionLoginBtn = document.getElementById('protectionLoginBtn');
  const protectionRegisterBtn = document.getElementById('protectionRegisterBtn');
  
  // Get modal elements from header
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');

  function openModal(modal) {
    if (!modal) return;
    // Hide the auth protection overlay when opening a modal
    authOverlay.classList.add('hidden');
    
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
    
    // Show the auth protection overlay again when modal is closed
    authOverlay.classList.remove('hidden');
  }

  // Listen for modal close events to show overlay again
  function setupModalCloseListeners() {
    // Close buttons
    const loginClose = document.getElementById('closeLoginModal');
    const registerClose = document.getElementById('closeRegisterModal');
    
    if (loginClose) {
      loginClose.addEventListener('click', () => closeModal(loginModal));
    }
    
    if (registerClose) {
      registerClose.addEventListener('click', () => closeModal(registerModal));
    }
    
    // Click outside modal to close
    if (loginModal) {
      loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) closeModal(loginModal);
      });
    }
    
    if (registerModal) {
      registerModal.addEventListener('click', (e) => {
        if (e.target === registerModal) closeModal(registerModal);
      });
    }
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (loginModal && loginModal.classList.contains('open')) {
          closeModal(loginModal);
        }
        if (registerModal && registerModal.classList.contains('open')) {
          closeModal(registerModal);
        }
      }
    });
  }

  // Login button click
  protectionLoginBtn && protectionLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('🔄 Opening login modal from pose page protection');
    
    if (loginModal && document.body.contains(loginModal)) {
      openModal(loginModal);
    } else {
      // Fallback: redirect to login page
      console.log('⚠️ Login modal not found, redirecting to login page');
      window.location.href = '/auth/login?next=' + encodeURIComponent(window.location.pathname);
    }
  });

  // Register button click
  protectionRegisterBtn && protectionRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('🔄 Opening register modal from pose page protection');
    
    if (registerModal && document.body.contains(registerModal)) {
      openModal(registerModal);
    } else {
      // Fallback: redirect to register page
      console.log('⚠️ Register modal not found, redirecting to register page');
      window.location.href = '/auth/register?next=' + encodeURIComponent(window.location.pathname);
    }
  });

  // Initialize modal close listeners when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    setupModalCloseListeners();
    
    // Disable pose detection functionality when not authenticated
    const correctPoseBtn = document.getElementById('correctPoseBtn');
    const webcam = document.getElementById('webcam');
    
    if (correctPoseBtn) {
      correctPoseBtn.disabled = true;
      correctPoseBtn.style.opacity = '0.5';
      correctPoseBtn.style.cursor = 'not-allowed';
      correctPoseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🚫 Pose detection blocked - authentication required');
      });
    }

    // Prevent webcam access
    if (webcam) {
      webcam.style.pointerEvents = 'none';
    }
  });

  // Listen for successful authentication to reload page
  window.addEventListener('storage', function(e) {
    if (e.key === 'auth_success') {
      console.log('✅ Authentication successful, reloading page');
      window.location.reload();
    }
  });

})();
