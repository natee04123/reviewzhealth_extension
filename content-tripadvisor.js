(function() {
  const PLATFORM = 'tripadvisor';
  let captured = new Set();

  function extractReviews() {
    const reviews = [];
    const cards = document.querySelectorAll(
      '[data-reviewid], [class*="ReviewCard"], [class*="review-container"]'
    );

    cards.forEach(card => {
      try {
        const nameEl   = card.querySelector('[class*="info_text"], [class*="username"], a[href*="Profile"]');
        const ratingEl = card.querySelector('[class*="ui_bubble_rating"], [class*="bubbles"], svg[aria-label*="star"]');
        const textEl   = card.querySelector('[class*="partial_entry"], [class*="entry"], [data-test*="review-body"]');
        const dateEl   = card.querySelector('[class*="ratingDate"], [class*="review-date"]');

        const reviewerName = nameEl?.textContent?.trim() ?? 'Anonymous';
        const reviewText   = textEl?.textContent?.trim()?.replace('More', '').trim() ?? '';

        let starRating = null;
        if (ratingEl) {
          const cls = ratingEl.className ?? '';
          const match = cls.match(/bubble_(\d+)/);
          if (match) starRating = Math.round(parseInt(match[1]) / 10);
          if (!starRating) {
            const aria = ratingEl.getAttribute('aria-label') ?? '';
            const m2 = aria.match(/(\d)/);
            if (m2) starRating = parseInt(m2[1]);
          }
        }

        if (!reviewText && !starRating) return;

        const key = `${reviewerName}-${reviewText.slice(0,30)}`;
        if (captured.has(key)) return;
        captured.add(key);

        reviews.push({
          platform: PLATFORM,
          reviewer_name: reviewerName,
          star_rating: starRating,
          review_text: reviewText,
          review_time: new Date().toISOString(),
          source_url: window.location.href,
        });
      } catch (e) {}
    });
    return reviews;
  }

  function sendReviews(reviews) {
    reviews.forEach(review => {
      chrome.runtime.sendMessage({ type: 'INGEST_REVIEW', review }, response => {
        if (response?.ok) {
          chrome.storage.local.get('captured_count', data => {
            chrome.storage.local.set({ captured_count: (data.captured_count ?? 0) + 1 });
          });
        }
      });
    });
  }

  function run() {
    if (!window.location.href.includes('Review') && !window.location.href.includes('review')) return;
    const reviews = extractReviews();
    if (reviews.length) sendReviews(reviews);
  }

  run();
  const observer = new MutationObserver(() => setTimeout(run, 1000));
  observer.observe(document.body, { childList: true, subtree: true });
})();
