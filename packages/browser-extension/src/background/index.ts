import { getDeviceUserId } from "../services/deviceId";

chrome.runtime.onInstalled.addListener(() => {
  void getDeviceUserId();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_DEVICE_USER_ID") {
    void getDeviceUserId().then((deviceUserId) => {
      sendResponse({ deviceUserId });
    });
    return true;
  }

  if (message.type === "TOGGLE_ANALYZER") {
    if (!sender.tab?.id) {
      sendResponse({ success: false });
      return false;
    }

    void chrome.tabs.sendMessage(sender.tab.id, {
      type: "TOGGLE_ANALYZER"
    }).then(() => {
      sendResponse({ success: true });
    });

    return true;
  }

  return false;
});
