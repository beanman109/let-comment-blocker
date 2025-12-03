const blockedOrigins = new Set();

// When a content script finds blocked URLs, add their origins:
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === "block-urls" && msg.urls) {
    for (const url of msg.urls) {
      try {
        const origin = new URL(url).origin;
        blockedOrigins.add(origin);
        console.log("Blocking origin:", origin);
      } catch (_) {}
    }
  }
});

// Intercept all requests; if a request's origin exists in blockedOrigins, cancel it.
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const urlOrigin = new URL(details.url).origin;
    if (blockedOrigins.has(urlOrigin)) {
      console.log("Request blocked:", details.url);
      return { cancel: true };
    }
    return {};
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);