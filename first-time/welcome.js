var modsButton = document.getElementById('openMods');
modsButton.onclick = function() {
    browser.runtime.openOptionsPage()
}

var settingsButton = document.getElementById('openPopup');
settingsButton.onclick = function() {
    browser.browserAction.openPopup();
}