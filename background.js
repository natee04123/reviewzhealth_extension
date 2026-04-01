const API_BASE = 'https://reviewzhealthbackend-production.up.railway.app';

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
        console.log('[reviewzhealth background] No token found');
        sendResponse({ ok: false, error: 'Not authenticated' });
        return;
      }

      try {
        console.log('[reviewzhealth background] Sending review to API:', message.review);
        const res = await fetch(`${API_BASE}/api/reviews/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token,
          },
          body: JSON.stringify(message.review),
        });

        const text = await res.text();
        console.log('[reviewzhealth background] Response status:', res.status);
        console.log('[reviewzhealth background] Response body:', text);

        try {
          const json = JSON.parse(text);
          sendResponse({ ok: res.ok, data: json });
        } catch {
          sendResponse({ ok: false, error: text });
        }
      } catch (e) {
        console.log('[reviewzhealth background] Fetch error:', e.message);
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
      } catch (e) {
        console.log('[reviewzhealth background] Status check error:', e.message);
        sendResponse({ authenticated: false });
      }
    });
    return true;
  }

});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ captured_count: 0 });
});