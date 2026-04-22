const API_URL = 'https://clipdrop-f8zi.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const loginView = document.getElementById('login-view');
  const mainView = document.getElementById('main-view');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');

  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // Personal Tab Elements
  const personalInput = document.getElementById('personal-input');
  const personalComment = document.getElementById('personal-comment');
  const personalSendBtn = document.getElementById('personal-send-btn');
  const personalHistory = document.getElementById('personal-history');
  const openDashboardBtn = document.getElementById('open-dashboard-btn');

  // Room Tab Elements
  const roomSelector = document.querySelector('.room-selector');
  const roomCodeInput = document.getElementById('room-code-input');
  const roomJoinBtn = document.getElementById('room-join-btn');
  const roomDropArea = document.getElementById('room-drop-area');
  const currentRoomDisplay = document.getElementById('current-room-display');
  const roomChangeBtn = document.getElementById('room-change-btn');
  const roomInput = document.getElementById('room-input');
  const roomComment = document.getElementById('room-comment');
  const roomSendBtn = document.getElementById('room-send-btn');
  const roomHistory = document.getElementById('room-history');
  const openRoomBtn = document.getElementById('open-room-btn');

  // State
  let token = null;
  let userId = null;
  let currentRoom = null;

  // Initialize
  const { auth_token, auth_user, active_room, history_personal, history_room } = await chrome.storage.local.get([
    'auth_token', 'auth_user', 'active_room', 'history_personal', 'history_room'
  ]);

  if (auth_token && auth_user) {
    token = auth_token;
    userId = auth_user.id;
    showMainView();
  } else {
    showLoginView();
  }

  if (active_room) {
    setRoom(active_room);
  }

  renderHistory(history_personal || [], personalHistory);
  renderHistory(history_room || [], roomHistory);

  // --- UI Toggles ---
  function showLoginView() {
    loginView.classList.remove('hidden');
    mainView.classList.add('hidden');
  }

  function showMainView() {
    loginView.classList.add('hidden');
    mainView.classList.remove('hidden');
  }

  function setRoom(code) {
    currentRoom = code.toUpperCase();
    chrome.storage.local.set({ active_room: currentRoom });
    currentRoomDisplay.textContent = currentRoom;
    roomSelector.classList.add('hidden');
    roomDropArea.classList.remove('hidden');
  }

  function clearRoom() {
    currentRoom = null;
    chrome.storage.local.remove('active_room');
    roomSelector.classList.remove('hidden');
    roomDropArea.classList.add('hidden');
    roomCodeInput.value = '';
  }

  // --- Auth ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    loginError.textContent = '';

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      token = data.token;
      userId = data.user.id;
      await chrome.storage.local.set({ auth_token: token, auth_user: data.user });
      showMainView();
    } catch (err) {
      loginError.textContent = err.message;
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    token = null;
    userId = null;
    await chrome.storage.local.remove(['auth_token', 'auth_user', 'active_room']);
    showLoginView();
    clearRoom();
  });

  // --- Tabs ---
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // --- Room Setup ---
  roomJoinBtn.addEventListener('click', () => {
    if (roomCodeInput.value.trim()) {
      setRoom(roomCodeInput.value.trim());
    }
  });

  roomChangeBtn.addEventListener('click', clearRoom);

  // --- Open Website ---
  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: `${API_URL}/dashboard` });
  });

  openRoomBtn.addEventListener('click', () => {
    if (currentRoom) {
      chrome.tabs.create({ url: `${API_URL}/room/${currentRoom}` });
    }
  });

  // --- Sending Clips ---
  async function sendClip(roomCode, content, comment, type, isPersonal) {
    try {
      const res = await fetch(`${API_URL}/api/clips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomCode, type, content, comment: comment || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Save to local history
      const historyKey = isPersonal ? 'history_personal' : 'history_room';
      const result = await chrome.storage.local.get(historyKey);
      let history = result[historyKey] || [];
      history.unshift({ type, content, comment, timestamp: Date.now() });
      if (history.length > 3) history.pop(); // Keep only last 3
      
      await chrome.storage.local.set({ [historyKey]: history });
      renderHistory(history, isPersonal ? personalHistory : roomHistory);
      
      return true;
    } catch (err) {
      alert(`Error sending clip: ${err.message}`);
      return false;
    }
  }

  personalSendBtn.addEventListener('click', async () => {
    const content = personalInput.value.trim();
    const comment = personalComment.value.trim();
    if (!content) return;

    personalSendBtn.disabled = true;
    personalSendBtn.textContent = 'Sending...';

    const isLink = /^https?:\/\//.test(content);
    const success = await sendClip(`SOLO_${userId}`, content, comment, isLink ? 'link' : 'text', true);
    
    if (success) {
      personalInput.value = '';
      personalComment.value = '';
    }
    personalSendBtn.disabled = false;
    personalSendBtn.textContent = 'Send to Dashboard';
  });

  roomSendBtn.addEventListener('click', async () => {
    const content = roomInput.value.trim();
    const comment = roomComment.value.trim();
    if (!content || !currentRoom) return;

    roomSendBtn.disabled = true;
    roomSendBtn.textContent = 'Sending...';

    const isLink = /^https?:\/\//.test(content);
    const success = await sendClip(currentRoom, content, comment, isLink ? 'link' : 'text', false);
    
    if (success) {
      roomInput.value = '';
      roomComment.value = '';
    }
    roomSendBtn.disabled = false;
    roomSendBtn.textContent = 'Send to Room';
  });

  // --- Helpers ---
  function renderHistory(items, container) {
    container.innerHTML = '';
    if (items.length === 0) {
      container.innerHTML = '<div style="color: #64748b; font-size: 0.8rem;">No recent clips sent from extension.</div>';
      return;
    }

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      
      let html = `<div class="history-item-type">${item.type === 'link' ? '🔗 Link' : '📝 Text'}</div>`;
      html += `<div class="history-item-content">${item.content}</div>`;
      if (item.comment) {
        html += `<div class="history-item-comment">💬 ${item.comment}</div>`;
      }
      
      div.innerHTML = html;
      container.appendChild(div);
    });
  }
});
