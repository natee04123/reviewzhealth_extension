(function() {
  const PLATFORM = 'doordash';
  let captured = new Set();

  function extractReviews() {
    const reviews = [];
    const cards = document.querySelectorAll(
      '[class*="ReviewCard"], [class*="review-card"], [data-testid*="review"]'
    );

    cards.forEach(card => {
      try {
        const nameEl   = card.querySelector('[class*="reviewer"], [class*="customer-name"], [class*="ConsumerName"]');
        const ratingEl = card.querySelector('[class*="star"], [aria-label*="star"], [class*="Rating"]');
        const textEl   = card.querySelector('[class*="review-text"], [class*="comment"], [class*="ReviewText"]');
        const dateEl   = card.querySelector('[class*="date"], [class*="Date"], time');

        const reviewerName = nameEl?.textContent?.trim() ?? 'Anonymous';
        const reviewText   = textEl?.textContent?.trim() ?? '';

        let starRating = null;
        if (ratingEl) {
          const aria = ratingEl.getAttribute('aria-label') ?? '';
          const match = aria.match(/(\d)/);
          if (match) starRating = parseInt(match[1]);
        }

        if (!reviewText && !starRating) return;

        const key = `${reviewerName}-${reviewText.slice(0,30)}-${starRating}`;
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
    if (!window.location.href.includes('review')) return;
    const reviews = extractReviews();
    if (reviews.length) sendReviews(reviews);
  }

  run();
  const observer = new MutationObserver(() => setTimeout(run, 1000));
  observer.observe(document.body, { childList: true, subtree: true });
})();
