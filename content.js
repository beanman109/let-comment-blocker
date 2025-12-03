/**
 * LowEndTalk Blocker Content Script
 * Tracks blocked comments and URLs for popup debug view
 */

const api = typeof browser !== "undefined" ? browser : chrome;

const blockedData = {
  count: 0,
  entries: [] // Each { username, urls: [], id }
};

function getBlockedUsers(cb) {
  (api.storage || chrome.storage).local.get("blockedUsers", (res) => {
    cb(res.blockedUsers || []);
  });
}

function removeBlockedComments(blockedUsers) {
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

      if (urls.length > 0 && api.runtime && api.runtime.sendMessage) {
        api.runtime.sendMessage({ type: "blockedUrls", urls });
      }

      blockedData.entries.push({ username, urls, id: comment.id });
      blockedData.count++;

      comment.remove();
    }
  });
}

function startBlocker() {
  getBlockedUsers((blockedUsers) => {
    if (!blockedUsers.length) return;

    const runOnce = () => removeBlockedComments(blockedUsers);
    runOnce();

    // Observe new comments
    const obs = new MutationObserver(runOnce);
    obs.observe(document.body, { childList: true, subtree: true });
  });
}

// Respond to popup requests
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getStats") {
    const lines = blockedData.entries.map((e) =>
      `${e.username} — ${e.urls.length} embed(s) blocked${e.id ? " [" + e.id + "]" : ""}`
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