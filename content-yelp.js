(function() {
  const PLATFORM = 'yelp';
  let captured = new Set();

  function extractReviews() {
    const reviews = [];
    const cards = document.querySelectorAll(
      '[class*="review__"], [data-review-id], [class*="ReviewCard"]'
    );

    cards.forEach(card => {
      try {
        const nameEl   = card.querySelector('[class*="user-name"], [class*="username"], a[href*="/user_details"]');
        const ratingEl = card.querySelector('[class*="stars"], [aria-label*="star"]');
        const textEl   = card.querySelector('[class*="comment__"], [lang], [class*="review-content"]');
        const dateEl   = card.querySelector('[class*="rating-qualifier"], time, [class*="review-date"]');

        const reviewerName = nameEl?.textContent?.trim() ?? 'Anonymous';
        const reviewText   = textEl?.textContent?.trim() ?? '';

        let starRating = null;
        if (ratingEl) {
          const aria = ratingEl.getAttribute('aria-label') ?? '';
          const match = aria.match(/(\d(\.\d)?)/);
          if (match) starRating = Math.round(parseFloat(match[1]));
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
          review_time: dateEl?.textContent?.trim() ? new Date(dateEl.textContent.trim()).toISOString() : new Date().toISOString(),
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
    if (!window.location.href.includes('review')) return;
    const reviews = extractReviews();
    if (reviews.length) sendReviews(reviews);
  }

  run();
  const observer = new MutationObserver(() => setTimeout(run, 1000));
  observer.observe(document.body, { childList: true, subtree: true });
})();
