const API_BASE = 'https://reviewzhealthbackend-production.up.railway.app';

// Listen for token from reviewzhealth.com
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_TOKEN' && message.token) {
    chrome.storage.local.set({ rzh_token: message.token });
    return;
  }

  if (message.type === 'GET_TOKEN') {
    chrome.storage.local.get('rzh_token', (data) => {
      sendResponse({ token: data.rzh_token ?? null });
    });
    return true;
  }

  if (message.type === 'INGEST_REVIEW') {
    chrome.storage.local.get('rzh_token', async (data) => {
      const token = data.rzh_token;
      if (!token) {
        sendResponse({ ok: false, error: 'Not authenticated' });
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/reviews/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token,
          },
          body: JSON.stringify(message.review),
        });

        const data = await res.json();
        sendResponse({ ok: res.ok, data });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    });
    return true;
  }

  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get('rzh_token', async (data) => {
      const token = data.rzh_token;
      if (!token) {
        sendResponse({ authenticated: false });
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'x-auth-token': token },
        });
        const json = await res.json();
        sendResponse({
          authenticated: !!json?.user?.id,
          user: json?.user ?? null,
        });
      } catch {
        sendResponse({ authenticated: false });
      }
    });
    return true;
  }
});

// When extension is installed show a welcome notification
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ captured_count: 0 });
});
