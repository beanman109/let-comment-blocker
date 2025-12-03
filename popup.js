const storage = chrome.storage.local;

const input = document.getElementById("usernameInput");
const addBtn = document.getElementById("addBtn");
const listEl = document.getElementById("userList");

const blockedCountEl = document.getElementById("blockedCount");
const debugBtn = document.getElementById("debugBtn");
const debugInfoEl = document.getElementById("debugInfo");

function renderList() {
  storage.get("blockedUsers", (res) => {
    const blockedUsers = res.blockedUsers || [];
    listEl.innerHTML = "";

    if (blockedUsers.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "No users blocked yet";
      empty.style.opacity = 0.6;
      listEl.appendChild(empty);
      return;
    }

    blockedUsers.forEach((user) => {
      const li = document.createElement("li");
      li.textContent = user;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => {
        const newList = blockedUsers.filter((u) => u !== user);
        storage.set({ blockedUsers: newList }, renderList);
      });

      li.appendChild(removeBtn);
      listEl.appendChild(li);
    });
  });
}

addBtn.addEventListener("click", () => {
  const username = input.value.trim();
  if (!username) return;

  storage.get("blockedUsers", (res) => {
    const blockedUsers = res.blockedUsers || [];
    if (!blockedUsers.includes(username)) {
      blockedUsers.push(username);
      storage.set({ blockedUsers }, renderList);
    }
  });

  input.value = "";
});

document.addEventListener("DOMContentLoaded", () => {
  renderList();

  // Ask content script for page stats
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: "getStats" },
      (res) => {
        if (chrome.runtime.lastError) return; // No content script maybe
        if (res && typeof res.blockedCount === "number") {
          blockedCountEl.textContent = res.blockedCount;
          debugInfoEl.textContent = (res.debugLines || []).join("\n");
        }
      }
    );
  });

  debugBtn.addEventListener("click", () => {
    debugInfoEl.classList.toggle("hidden");
  });
});