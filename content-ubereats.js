// reviewzhealth Chrome Extension — Uber Eats content script
(function() {
  const PLATFORM = 'ubereats';
  let captured = new Set();

  function extractReviews() {
    const reviews = [];

    // Uber Eats Manager reviews page DOM selectors
    // These target the review cards on merchants.ubereats.com/manager/reviews
    const reviewCards = document.querySelectorAll(
      '[data-testid="review-card"], .review-card, [class*="ReviewCard"], [class*="review-item"]'
    );

    reviewCards.forEach(card => {
      try {
        // Try multiple selector patterns since Uber Eats updates their UI frequently
        const nameEl = card.querySelector(
          '[data-testid="reviewer-name"], [class*="reviewer-name"], [class*="ReviewerName"]'
        );
        const ratingEl = card.querySelector(
          '[data-testid="star-rating"], [aria-label*="star"], [class*="StarRating"], [class*="star-rating"]'
        );
        const textEl = card.querySelector(
          '[data-testid="review-text"], [class*="review-text"], [class*="ReviewText"], [class*="comment"]'
        );
        const dateEl = card.querySelector(
          '[data-testid="review-date"], [class*="review-date"], [class*="ReviewDate"], time'
        );

        const reviewerName = nameEl?.textContent?.trim() ?? 'Anonymous';
        const reviewText   = textEl?.textContent?.trim() ?? '';
        const dateText     = dateEl?.textContent?.trim() ?? dateEl?.getAttribute('datetime') ?? '';

        // Parse star rating from aria-label or text content
        let starRating = null;
        if (ratingEl) {
          const ariaLabel = ratingEl.getAttribute('aria-label') ?? '';
          const match = ariaLabel.match(/(\d)/);
          if (match) starRating = parseInt(match[1]);
          if (!starRating) {
            const filled = card.querySelectorAll('[class*="filled"], [class*="active-star"], svg[class*="star"]');
            if (filled.length) starRating = filled.length;
          }
        }

        if (!reviewText && !starRating) return;

        // Create a unique key to avoid duplicates
        const key = `${reviewerName}-${reviewText.slice(0, 30)}-${starRating}`;
        if (captured.has(key)) return;
        captured.add(key);

        reviews.push({
          platform:      PLATFORM,
          reviewer_name: reviewerName,
          star_rating:   starRating,
          review_text:   reviewText,
          review_time:   dateText ? new Date(dateText).toISOString() : new Date().toISOString(),
          source_url:    window.location.href,
        });
      } catch (e) {
        // Skip malformed cards
      }
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
          console.log('[reviewzhealth] Review captured:', review.reviewer_name);
        }
      });
    });
  }

  function run() {
    if (!window.location.href.includes('/reviews')) return;
    const reviews = extractReviews();
    if (reviews.length) sendReviews(reviews);
  }

  // Run on page load
  run();

  // Watch for dynamic content loading
  const observer = new MutationObserver(() => {
    setTimeout(run, 1000);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
