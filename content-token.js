// Runs on reviewzhealth.com — reads the auth token and sends to extension storage
(function() {
  try {
    const token = localStorage.getItem('rzh_token');
    if (token) {
      chrome.runtime.sendMessage({ type: 'SET_TOKEN', token });
    }
  } catch (e) {
    // Extension context may not be available
  }
})();
