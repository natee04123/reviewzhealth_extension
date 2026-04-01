const PLATFORMS = [
  { name: 'Uber Eats',   status: 'active' },
  { name: 'DoorDash',    status: 'active' },
  { name: 'Grubhub',     status: 'active' },
  { name: 'Yelp',        status: 'active' },
  { name: 'Tripadvisor', status: 'active' },
  { name: 'OpenTable',   status: 'active' },
];

async function getTokenFromTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => {
      const rzhTab = tabs.find(t => t.url && t.url.includes('reviewzhealth.com'));
      if (!rzhTab) { resolve(null); return; }
      chrome.scripting.executeScript({
        target: { tabId: rzhTab.id },
        func: () => localStorage.getItem('rzh_token'),
      }, (results) => {
        const token = results?.[0]?.result ?? null;
        if (token) chrome.storage.local.set({ rzh_token: token });
        resolve(token);
      });
    });
  });
}

async function init() {
  const body = document.getElementById('body');

  // Try to get token from open reviewzhealth tab
  const tabToken = await getTokenFromTab();

  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, function(response) {
    if (!response?.authenticated) {
      body.innerHTML = `
        <div class="status-card">
          <div class="status-label">
            <span class="status-dot" style="background:#BA7517"></span>
            Not connected
          </div>
          <div class="not-authed">
            <p>Sign in to reviewzhealth.com first, then come back here.</p>
            <a href="https://reviewzhealth.com" target="_blank" class="btn">
              Open reviewzhealth →
            </a>
          </div>
        </div>
      `;
      return;
    }

    chrome.storage.local.get('captured_count', function(data) {
      const count = data.captured_count ?? 0;
      const user = response.user;

      body.innerHTML = `
        <div class="status-card">
          <div class="status-label">
            <span class="status-dot" style="background:#1D9E75"></span>
            Connected
          </div>
          <div class="status-value">${user?.name ?? 'Your account'}</div>
          <div class="status-sub">${user?.email ?? ''}</div>
        </div>

        <div class="status-card" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div class="status-label" style="margin-bottom:2px">Reviews captured</div>
            <div class="status-value">Today's session</div>
          </div>
          <span class="count-badge">${count}</span>
        </div>

        <div class="platforms">
          ${PLATFORMS.map(p => `
            <div class="platform-row">
              <span class="platform-name">${p.name}</span>
              <span class="platform-status active">● Active</span>
            </div>
          `).join('')}
        </div>

        <div class="footer">
          <a href="https://reviewzhealth.com/dashboard" target="_blank">
            Open dashboard →
          </a>
        </div>
      `;
    });
  });
}

init();