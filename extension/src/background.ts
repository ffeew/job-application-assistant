/// <reference types="chrome" />

// Each tab gets its own panel, fixed to that tab, so a fill can't land in
// another tab after the user switches. Both calls run inside the click so
// open() still counts as a user gesture.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  void chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: `panel.html?tab=${String(tab.id)}`,
    enabled: true,
  });
  void chrome.sidePanel.open({ tabId: tab.id });
});
