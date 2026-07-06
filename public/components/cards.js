// components/cards.js

export function createBeatCard(beat) {
  const card = document.createElement("div");
  card.className = "latest-card";

  card.innerHTML = `
    <img src="${beat.cover_url || beat.image || 'images/studio.jpg'}" />

    <div class="latest-title">${beat.title || "Untitled Beat"}</div>
    <div class="latest-tag">#${beat.genre || "Trap"}</div>

    <div class="latest-price-row">
      <span class="old-price">$49</span>
      <span class="new-price">$19</span>
    </div>

    <div class="latest-actions">
      <button class="btn-buy">Buy</button>
      <button class="btn-free play-btn" data-src="${beat.mp3_url}">
        Preview
      </button>
    </div>
  `;

  return card;
}
