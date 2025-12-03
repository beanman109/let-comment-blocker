const api = typeof browser !== "undefined" ? browser : chrome;

const blockedData = {
  count: 0,
  entries: []
};

function getBlockedUsers(cb) {
  (api.storage || chrome.storage).local.get("blockedUsers", (res) => {
    cb(res.blockedUsers || []);
  });
}

function removeBlockedComments(blockedUsers) {
  // 1. Remove direct comments from blocked users
  const comments = document.querySelectorAll(".Item.ItemComment");

  comments.forEach((comment) => {
    const userEl = comment.querySelector(".Username");
    if (!userEl) return;

    const username = userEl.textContent.trim();
    const match = blockedUsers.some(
      (u) => u.toLowerCase() === username.toLowerCase()
    );

    if (match) {
      const embeds = comment.querySelectorAll("img, audio, video, iframe, source");
      const urls = [];
      embeds.forEach((el) => {
        const src = el.src || el.getAttribute("data-src");
        if (src) urls.push(src);
      });

      blockedData.entries.push({ username, urls, id: comment.id, type: "comment" });
      blockedData.count++;

      comment.remove();
    }
  });

  // 2. Remove quotes from blocked users
  const quotes = document.querySelectorAll("blockquote.UserQuote");

  quotes.forEach((quote) => {
    // Find the "@username said:" link
    const quoteLink = quote.querySelector(".QuoteText a[rel='nofollow']");
    if (!quoteLink) return;

    const quoteText = quoteLink.textContent.trim();
    // Extract username from "@username said" or similar pattern
    const usernameMatch = quoteText.match(/@(\w+)\s+said/i);
    if (!usernameMatch) return;

    const quotedUsername = usernameMatch[1];
    const match = blockedUsers.some(
      (u) => u.toLowerCase() === quotedUsername.toLowerCase()
    );

    if (match) {
      // Collect any embedded URLs in the quote
      const embeds = quote.querySelectorAll("img, audio, video, iframe, source");
      const urls = [];
      embeds.forEach((el) => {
        const src = el.src || el.getAttribute("data-src");
        if (src) urls.push(src);
      });

      blockedData.entries.push({
        username: quotedUsername,
        urls,
        id: quote.closest(".ItemComment")?.id || "quote",
        type: "quote"
      });
      blockedData.count++;

      quote.remove();
    }
  });
}

function startBlocker() {
  getBlockedUsers((blockedUsers) => {
    if (!blockedUsers.length) return;

    removeBlockedComments(blockedUsers);

    const obs = new MutationObserver(() => removeBlockedComments(blockedUsers));
    obs.observe(document.body, { childList: true, subtree: true });
  });
}

// Respond to popup stats requests
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getStats") {
    const lines = blockedData.entries.map((e) =>
      `${e.username} [${e.type}] — ${e.urls.length} embed(s) found`
    );
    sendResponse({
      blockedCount: blockedData.count,
      debugLines: lines
    });
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startBlocker);
} else {
  startBlocker();
}
