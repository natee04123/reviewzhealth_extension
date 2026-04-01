console.log('[reviewzhealth] Uber Eats content script loaded', window.location.href);
chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, response => {
  console.log('[reviewzhealth] Token check:', response);
});
(function() {
  const PLATFORM = 'ubereats';
  let captured = new Set();

  function parseReviewRow(row) {
    try {
      const lines = row.innerText.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      // Name is the second non-empty line (first is initials)
      const reviewerName = lines[1] ?? 'Anonymous';

      // Find date line
      const dateLine = lines.find(l => l.startsWith('Reviewed '));
      const dateStr = dateLine ? dateLine.replace('Reviewed ', '') : null;

      // Find review text — it's between customer type and items/date
      // Filter out known non-review lines
      const skipPatterns = [
        /^[A-Z]{2}$/,           // initials
        /^Reviewed /,           // date
        /^Total \$/,            // total
        /^New customer$/,       // customer type
        /^\d+ orders?$/,        // order count
        /^\d+ items?$/,         // item count
        /^ \d+ items?$/,        // item count with space
        /^Reply$/,              // button
        /^View$/,               // button
        /^Last day$/,           // urgency label
      ];

      const reviewText = lines.find(l =>
        !skipPatterns.some(pattern => pattern.test(l)) && l !== reviewerName
      ) ?? null;

      // Count filled stars
      const svgs = row.querySelectorAll('svg[color]');
      const starRating = Array.from(svgs)
        .filter(s => s.getAttribute('color') !== '#AFAFAF')
        .length || null;

      const key = `${reviewerName}-${dateStr}-${starRating}`;
      if (captured.has(key)) return null;
      captured.add(key);

      return {
        platform:      PLATFORM,
        reviewer_name: reviewerName,
        star_rating:   starRating,
        review_text:   reviewText,
        review_time:   dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        source_url:    window.location.href,
      };
    } catch (e) {
      return null;
    }
  }

  function extractAndSend() {
    if (!window.location.href.includes('/feedback/reviews')) {
      console.log('[reviewzhealth] Not on reviews page, skipping');
      return;
    }

    const rows = document.querySelectorAll('tbody tr');
    console.log('[reviewzhealth] Found rows:', rows.length);
    if (!rows.length) return;

    const reviews = Array.from(rows)
      .map(parseReviewRow)
      .filter(Boolean);

    console.log('[reviewzhealth] Parsed reviews:', reviews.length, reviews);

    reviews.forEach(review => {
      console.log('[reviewzhealth] Sending review:', review);
      chrome.runtime.sendMessage({ type: 'INGEST_REVIEW', review }, response => {
        console.log('[reviewzhealth] Ingest response:', response);
        if (response?.ok && !response?.duplicate) {
          chrome.storage.local.get('captured_count', data => {
            chrome.storage.local.set({ captured_count: (data.captured_count ?? 0) + 1 });
          });
          console.log('[reviewzhealth] Captured:', review.reviewer_name, review.star_rating, '★');
        }
      });
    });
  }

  // Run after page loads
  setTimeout(extractAndSend, 2000);

  // Watch for navigation changes (SPA)
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(extractAndSend, 2000);
    }
  }).observe(document.body, { childList: true, subtree: true });

})();