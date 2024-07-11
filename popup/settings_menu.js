console.log((window.innerWidth - document.documentElement.offsetWidth));
document.documentElement.style.setProperty('--scrollbar-width', (window.innerWidth - document.documentElement.offsetWidth) + 'px');

const MOD_DATABASE_KEY = "GXMusicMods"

const loadingShimmer = document.querySelector(".loadingOverlay")
const consentForm = document.getElementById("jsDelivr")
const consentOptionalProxy = document.getElementById("proxyPermission")

const enabledBox = document.getElementById('enabled');
const muteAutoBox = document.getElementById('muteAuto');
const muteFocusBox = document.getElementById('muteFocus');
const muteFocusContainer = document.getElementById('muteFocusContainer')

const pageLoadBox = document.getElementById('pageLoad');
const downloadsBox = document.getElementById('download');
var volumeSlider = document.getElementById('volume');
var trackSelector = document.getElementById('track-picker');

let consentedToJSD = false;
let consentedToProxy = false;

const SFXkeyboardBox = document.getElementById('typingOn');
const SFXkeyboardAddressBox = document.getElementById('allowProxy');

const SFXtabBox = document.getElementById('tabsOn');
const SFXswitchesBox = document.getElementById('switchesOn');

const SFXhoversBox = document.getElementById('hoversOn');
const SFXbuttonsBox = document.getElementById('buttonsOn');

const SFXlinksBox = document.getElementById('linksOn');
const SFXaltSwitchesBox = document.getElementById('switchesAlternate');

const SFXupdatesBox = document.getElementById('updatesOn');

var SFXvolumeSlider = document.getElementById('volumeSFX');
var sfxSelector = document.getElementById('sfx-picker');

var KeyboardVolumeSlider = document.getElementById('volumeKeyboard');
var KeyboardSelector = document.getElementById('keyboard-picker');

var ThemeSelector = document.getElementById('theme-picker');
const lightThemeBox = document.getElementById('lightTheme');

const muteShoppingBox = document.getElementById('muteShopping');

const modList = document.getElementById('track-picker')
const sfxModList = document.getElementById('sfx-picker')
const keyboardModList = document.getElementById('keyboard-picker')
const themeModList = document.getElementById('theme-picker')
const webModList = document.getElementById('knownWebMods')

const trackSource = document.getElementById('track-source')
const sfxSource = document.getElementById('sfx-source')
const keyboardSource = document.getElementById('keyboard-source')

const webModItemTemplate = document.getElementById('webModTemplate')

async function getPreferredColorScheme() {
    let browserStorage = await browser.storage.local.get().then(
        async function(result) {
            return (typeof result.lightTheme == "undefined") ? "none" : result.lightTheme;
        },
        function(error) {
            console.warn(`[GXM] Couldn't get color scheme from local storage: ${error}`);
            return "none"
        }
    );

    if (browserStorage == "none") {
        if (window.matchMedia) {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            } else {
                return 'light';
            }
        }
        return 'light';
    } else {
        return browserStorage ? "light" : "dark"
    }
}

const noWebMods = document.getElementById('emptyWebMods')

let moddedOptions = []

async function updateModList() {
    while (moddedOptions.length > 0) {
        let removed = moddedOptions.pop()
        removed.remove()
    }

    try {
        let modData = await localforage.getItem(MOD_DATABASE_KEY);
        if (modData == null) {
            modData = {}
        }
        if (Object.keys(modData).length <= 0) {
            const noModsMessage = document.createElement("option");
            noModsMessage.label = "No mods installed... yet!　";
            noModsMessage.disabled = true;
            modList.appendChild(noModsMessage);

            const noModsMessage2 = document.createElement("option");
            noModsMessage2.label = "No mods installed... yet!　";
            noModsMessage2.disabled = true;
            sfxModList.appendChild(noModsMessage2);

            const noModsMessage3 = document.createElement("option");
            noModsMessage3.label = "No mods installed... yet!　";
            noModsMessage3.disabled = true;
            keyboardModList.appendChild(noModsMessage3);
        } else {
            let backgroundMusicEntries = 0
            let browserSoundEntries = 0
            let keyboardSoundEntries = 0
            let themeEntries = 0
            let webModEntries = 0

            for (const [id, data] of Object.entries(modData)) {
                if (data.layers) {
                    backgroundMusicEntries++
                    if (data.layers[0].hasOwnProperty('name')) { // New style mod with multiple options
                        const modGroup = document.createElement("optgroup");
                        modGroup.label = data.displayName;
                        modList.appendChild(modGroup);

                        for (const songData of data.layers) {
                            const para = document.createElement("option");
                            para.value = id + `/${songData.id}`;
                            para.textContent = songData.name;
                            para.setAttribute("data-author", songData.author);
                            modGroup.appendChild(para);
                        }
                        moddedOptions.push(modGroup)
                    } else {
                        const para = document.createElement("option");
                        para.value = id;
                        para.textContent = data.displayName;
                        modList.appendChild(para);
                        moddedOptions.push(para)
                    }
                }
                if (data.keyboardSounds) {
                    keyboardSoundEntries++
                    const para = document.createElement("option");
                    para.value = id;
                    para.textContent = data.displayName;
                    keyboardModList.appendChild(para);
                    moddedOptions.push(para)
                }
                if (data.browserSounds) {
                    browserSoundEntries++
                    const para = document.createElement("option");
                    para.value = id;
                    para.textContent = data.displayName;
                    sfxModList.appendChild(para);
                    moddedOptions.push(para)
                }
                if (data.webMods) {
                    for (const [webModIndex, webModData] of Object.entries(data.webMods)) {
                        for (const urlPattern of webModData.matches) {
                            let validTab = null;
                            await browser.tabs.query({currentWindow: true, active: true, url: urlPattern}).then((tabs) => {
                                let tab = tabs[0]; // Safe to assume there will only be one result
                                validTab = tab;
                            }, console.warn)

                            if (validTab) {
                                webModEntries++
                                let newModItem = webModItemTemplate.content.cloneNode(true);
                                let modInfoContainer = newModItem.querySelector(".modName")
                                modInfoContainer.textContent = data.displayName
                                let modSource = newModItem.querySelector(".sourceSubtitle")
                                modSource.textContent = urlPattern

                                let checkBox = newModItem.querySelector(".webModCheckbox")
                                checkBox.checked = (typeof webModData.enabled == "undefined") ? true : webModData.enabled;
                                checkBox.addEventListener('change', async (event) => {
                                    try {
                                        let previousData = await localforage.getItem(MOD_DATABASE_KEY);
                                        if (previousData == null) {
                                            previousData = {}
                                        }
                                        
                                        webModData.enabled = !webModData.enabled
                                        previousData[id].webMods[webModIndex].enabled = webModData.enabled 
                                        browser.runtime.sendMessage({
                                            intent: "webModState",
                                            modId: id,
                                            index: webModIndex,
                                            state: webModData.enabled
                                        })

                                        try {
                                            let resultToSendBack = await localforage.setItem(MOD_DATABASE_KEY, previousData).then(function(value) {
                                                console.log("Saved successfully")
                                            }).catch(function(err) {
                                                console.log(err);
                                            });
                                        } catch (err) {
                                            console.log(err);
                                        }
                                    } catch (err) {
                                        console.log(err);
                                    }
                                })
                                
                                webModList.appendChild(newModItem);
                                moddedOptions.push(newModItem)
                            }
                        }
                    }
                }
                if (data.theme) {
                    themeEntries++
                    const para = document.createElement("option");
                    para.value = id;
                    para.textContent = data.displayName;
                    themeModList.appendChild(para);
                    moddedOptions.push(para)
                }
            }

            if (backgroundMusicEntries <= 0) {
                const noModsMessage = document.createElement("option");
                noModsMessage.label = "No mods of this type are installed.";
                noModsMessage.disabled = true;
                modList.appendChild(noModsMessage);
            }
            if (keyboardSoundEntries <= 0) {
                const noModsMessage3 = document.createElement("option");
                noModsMessage3.label = "No mods of this type are installed.";
                noModsMessage3.disabled = true;
                keyboardModList.appendChild(noModsMessage3);
            }
            if (browserSoundEntries <= 0) {
                const noModsMessage2 = document.createElement("option");
                noModsMessage2.label = "No mods of this type are installed.";
                noModsMessage2.disabled = true;
                sfxModList.appendChild(noModsMessage2);
            }
            if (themeEntries <= 0) {
                const noModsMessage4 = document.createElement("option");
                noModsMessage4.label = "No mods of this type are installed.";
                noModsMessage4.disabled = true;
                themeModList.appendChild(noModsMessage4);
            }

            if (webModEntries > 0) {
                noWebMods.remove();
            }

            backgroundMusicEntries = null;
            keyboardSoundEntries = null;
            browserSoundEntries = null;
            themeEntries = null;
            webModEntries = null;
        }
        modData = null;
    } catch (err) {
        console.log(err);
    }
}

function saveOptions() {
    browser.storage.local.set({
        trackName: trackSelector.value,
        enabled: enabledBox.checked,
        autoMute: muteAutoBox.checked,
        unfocusedMute: muteFocusBox.checked,
        pageLoad: pageLoadBox.checked,
        download: downloadsBox.checked,
        volume: volumeSlider.value,

        sfxName: sfxSelector.value,
        sfxTabs: SFXtabBox.checked,
        sfxPage: SFXswitchesBox.checked,
        sfxVolume: SFXvolumeSlider.value,

        sfxHovers: SFXhoversBox.checked,
        sfxButtons: SFXbuttonsBox.checked,
        sfxUpdates: SFXupdatesBox.checked,

        sfxLinks: SFXlinksBox.checked,
        sfxAltSwitch: SFXaltSwitchesBox.checked,

        keyboardName: KeyboardSelector.value,
        sfxKeyboard: SFXkeyboardBox.checked,
        sfxAddressBar: SFXkeyboardAddressBox.checked,
        keyboardVolume: KeyboardVolumeSlider.value,

        themeName: ThemeSelector.value,
        lightTheme: lightThemeBox.checked,

        muteShopping: muteShoppingBox.checked,
        consentedToJSD: consentedToJSD,
        consentedToProxy: consentedToProxy,
    });
}

async function restoreOptions() {
    let platformInfo = await browser.runtime.getPlatformInfo()
    if (platformInfo.os == 'android') {
        muteFocusBox.disabled = true;
        muteFocusContainer.classList.add("disabled");
        muteFocusBox.checked = true; // android must always have this on or else it'll play in other apps :/
    }

    async function setCurrentChoice(result) {
        consentedToJSD = (typeof result.consentedToJSD == "undefined") ? false : result.consentedToJSD;
        consentedToProxy = (typeof result.consentedToProxy == "undefined") ? false : result.consentedToProxy;
        // MUSIC
        trackSelector.value = result.trackName || "off";
        enabledBox.checked = (typeof result.enabled == "undefined") ? true : result.enabled;
        muteAutoBox.checked = (typeof result.autoMute == "undefined") ? true : result.autoMute;
        muteFocusBox.checked = (typeof result.unfocusedMute == "undefined") ? (platformInfo.os == 'android' ? true : false) : result.unfocusedMute;
        pageLoadBox.checked = (typeof result.pageLoad == "undefined") ? false : result.pageLoad;
        downloadsBox.checked = (typeof result.download == "undefined") ? false : result.download;
        volumeSlider.value = result.volume || 50;
        volumePercentage.textContent = volumeSlider.value;

        var selectedItem = trackSelector.selectedOptions[0]
        if (typeof selectedItem !== 'undefined') {
            if (selectedItem.getAttribute("data-author")) {
                trackSource.textContent = selectedItem.getAttribute("data-author")
                trackSource.classList.remove("hidden");
            } else {
                trackSource.classList.add("hidden");
            }
        } else {
            trackSource.classList.add("hidden");
        }
        
        muteShoppingBox.checked = (typeof result.muteShopping == "undefined") ? false : result.muteShopping;
        // SOUND EFFECTS
        sfxSelector.value = result.sfxName || "off";
        SFXkeyboardBox.checked = (typeof result.sfxKeyboard == "undefined") ? false : result.sfxKeyboard;
        SFXkeyboardAddressBox.checked = (typeof result.sfxAddressBar == "undefined") ? false : result.sfxAddressBar;
        SFXtabBox.checked = (typeof result.sfxTabs == "undefined") ? false : result.sfxTabs;
        SFXswitchesBox.checked = (typeof result.sfxPage == "undefined") ? false : result.sfxPage;
        SFXvolumeSlider.value = result.sfxVolume || 50;
        volumeSFXPercentage.textContent = SFXvolumeSlider.value;

        SFXhoversBox.checked = (typeof result.sfxHovers == "undefined") ? false : result.sfxHovers;
        SFXbuttonsBox.checked = (typeof result.sfxButtons == "undefined") ? false : result.sfxButtons;
        SFXupdatesBox.checked = (typeof result.sfxUpdates == "undefined") ? false : result.sfxUpdates;

        SFXlinksBox.checked = (typeof result.sfxLinks == "undefined") ? false : result.sfxLinks;
        SFXaltSwitchesBox.checked = (typeof result.sfxAltSwitch == "undefined") ? false : result.sfxAltSwitch;

        var selectedItem = sfxSelector.selectedOptions[0]
        if (typeof selectedItem !== 'undefined') {
            if (selectedItem.getAttribute("data-author")) {
                sfxSource.textContent = selectedItem.getAttribute("data-author")
                sfxSource.classList.remove("hidden");
            } else {
                sfxSource.classList.add("hidden");
            }
        } else {
            sfxSource.classList.add("hidden");
        }

        KeyboardSelector.value = result.keyboardName || "off";
        KeyboardVolumeSlider.value = result.keyboardVolume || 50;

        volumeKeyboardPercentage.textContent = KeyboardVolumeSlider.value;

        ThemeSelector.value = result.themeName || "off";
        lightThemeBox.checked = result.lightTheme || (await getPreferredColorScheme() === "light") || false;

        var selectedItem = KeyboardSelector.selectedOptions[0]
        if (typeof selectedItem !== 'undefined') {
            if (selectedItem.getAttribute("data-author")) {
                keyboardSource.textContent = selectedItem.getAttribute("data-author")
                keyboardSource.classList.remove("hidden");
            } else {
                keyboardSource.classList.add("hidden");
            }
        } else {
            keyboardSource.classList.add("hidden");
        }

        loadingShimmer.setAttribute("disabled", "");
    }

    function onError(error) {
        console.log(`Error: ${error}`);
    }

    let getting = browser.storage.local.get();
    getting.then(setCurrentChoice, onError);
}
  
document.addEventListener("DOMContentLoaded", async function() {
    await updateModList();
    await restoreOptions();
});

trackSelector.addEventListener("change", function() {
    const selectedOption = trackSelector.value; // Get the selected value
    console.log("Selected option:", selectedOption);
    browser.runtime.sendMessage('trackchange_' + selectedOption)
    var selectedItem = trackSelector.selectedOptions[0]
    if (typeof selectedItem !== 'undefined') {
        if (selectedItem.getAttribute("data-author")) {
            trackSource.textContent = selectedItem.getAttribute("data-author")
            trackSource.classList.remove("hidden");
        } else {
            trackSource.classList.add("hidden");
        }
    } else {
        trackSource.classList.add("hidden");
    }
    saveOptions()
});

sfxSelector.addEventListener("change", function() {
    const selectedOption = sfxSelector.value; // Get the selected value
    console.log("Selected sfx:", selectedOption);
    browser.runtime.sendMessage('sfxchange_' + selectedOption)
    saveOptions()
    var selectedItem = sfxSelector.selectedOptions[0]
    if (typeof selectedItem !== 'undefined') {
        if (selectedItem.getAttribute("data-author")) {
            sfxSource.textContent = selectedItem.getAttribute("data-author")
            sfxSource.classList.remove("hidden");
        } else {
            sfxSource.classList.add("hidden");
        }
    } else {
        sfxSource.classList.add("hidden");
    }
});

KeyboardSelector.addEventListener("change", function() {
    const selectedOption = KeyboardSelector.value; // Get the selected value
    console.log("Selected keyboard:", selectedOption);
    browser.runtime.sendMessage('keyboardchange_' + selectedOption)
    saveOptions()
    var selectedItem = KeyboardSelector.selectedOptions[0]
    if (typeof selectedItem !== 'undefined') {
        if (selectedItem.getAttribute("data-author")) {
            keyboardSource.textContent = selectedItem.getAttribute("data-author")
            keyboardSource.classList.remove("hidden");
        } else {
            keyboardSource.classList.add("hidden");
        }
    } else {
        keyboardSource.classList.add("hidden");
    }
});

ThemeSelector.addEventListener("change", function() {
    const selectedOption = ThemeSelector.value; // Get the selected value
    console.log("Selected theme:", selectedOption);
    browser.runtime.sendMessage('themechange_' + selectedOption)
    saveOptions()
});

var volumePercentage = document.getElementById('volumePercentage');
var volumeSFXPercentage = document.getElementById('volumeSFXPercentage');
var volumeKeyboardPercentage = document.getElementById('volumeKeyboardPercentage');


volumeSlider.addEventListener("input", () => {
    volumePercentage.textContent = volumeSlider.value;
    browser.runtime.sendMessage(`volumeChange=${volumeSlider.value}`)
});

volumeSlider.addEventListener("mouseup", () => {
    console.log("Saving volume");
    volumePercentage.textContent = volumeSlider.value;
    saveOptions()
});

SFXvolumeSlider.addEventListener("input", () => {
    volumeSFXPercentage.textContent = SFXvolumeSlider.value;
    browser.runtime.sendMessage(`SFXvolumeChange=${SFXvolumeSlider.value}`)
});

SFXvolumeSlider.addEventListener("mouseup", () => {
    console.log("Saving sfx volume");
    volumeSFXPercentage.textContent = SFXvolumeSlider.value;
    saveOptions()
});

KeyboardVolumeSlider.addEventListener("input", () => {
    volumeKeyboardPercentage.textContent = KeyboardVolumeSlider.value;
    browser.runtime.sendMessage(`KeyboardvolumeChange=${KeyboardVolumeSlider.value}`)
});

KeyboardVolumeSlider.addEventListener("mouseup", () => {
    console.log("Saving sfx volume");
    volumeKeyboardPercentage.textContent = KeyboardVolumeSlider.value;
    saveOptions()
});
//im too lazy to put these in an array or smth lollll
enabledBox.addEventListener('change', (event) => {
    saveOptions()
})
muteAutoBox.addEventListener('change', (event) => {
    saveOptions()
})
muteFocusBox.addEventListener('change', (event) => {
    saveOptions()
})
pageLoadBox.addEventListener('change', (event) => {
    saveOptions()
})
downloadsBox.addEventListener('change', (event) => {
    saveOptions()
})
SFXtabBox.addEventListener('change', (event) => {
    saveOptions()
})
SFXkeyboardBox.addEventListener('change', (event) => {
    saveOptions()
})
SFXswitchesBox.addEventListener('change', (event) => {
    saveOptions()
})
SFXhoversBox.addEventListener('change', (event) => {
    saveOptions()
})
SFXbuttonsBox.addEventListener('change', (event) => {
    saveOptions()
})
SFXupdatesBox.addEventListener('change', (event) => {
    saveOptions()
})
lightThemeBox.addEventListener('change', (event) => {
    browser.runtime.sendMessage(`schemechange_${lightThemeBox.checked ? "light" : "dark"}`)
    saveOptions()
})
muteShoppingBox.addEventListener('change', (event) => {
    if (muteShoppingBox.checked) {
        if (consentedToJSD) {
            consentedToJSD = true
            saveOptions()
        } else {
            muteShoppingBox.checked = false
            consentForm.setAttribute("enabled", "");
        }
    } else {
        saveOptions()
    }
})

SFXkeyboardAddressBox.addEventListener('change', (event) => {
    if (SFXkeyboardAddressBox.checked) {
        if (consentedToProxy) {
            consentedToProxy = true
            saveOptions()
        } else {
            SFXkeyboardAddressBox.checked = false
            consentOptionalProxy.setAttribute("enabled", "");
        }
    } else {
        saveOptions()
    }
})

SFXlinksBox.addEventListener('change', (event) => {
    saveOptions()
})
SFXaltSwitchesBox.addEventListener('change', (event) => {
    saveOptions()
})

function closePopOut()
{
  return Promise.all(
    [
      browser.runtime.getBrowserInfo(),
      browser.runtime.getPlatformInfo()
    ]
  ).then(
    data =>
    {
      if (data[0].name == 'Firefox' &&
          data[1].os == 'android')
      {
        return browser.tabs.update(
          {active: true}
        );
      }
    }
  ).finally(
    window.close
  );
}

var modsButton = document.getElementById('createModButton');
modsButton.onclick = function() {
    browser.runtime.openOptionsPage()
    closePopOut()
}

const iDontConsent = document.querySelector("#cancel")
const iConsent = document.querySelector("#consent")

iDontConsent.onclick = function() {
    consentForm.removeAttribute("enabled");
}
iConsent.onclick = function() {
    consentForm.removeAttribute("enabled");
    muteShoppingBox.checked = true
    consentedToJSD = true
    saveOptions()
}


const iDontConsent_Proxy = document.querySelector("#cancel_proxy")
const iConsent_Proxy = document.querySelector("#consent_proxy")

const addressBarPermissions = {
    permissions: ["proxy", "search"]
};

iDontConsent_Proxy.onclick = function() {
    consentOptionalProxy.removeAttribute("enabled");
}
iConsent_Proxy.onclick = async function() {
    console.log("Requesting permissions...")
    const response = await browser.permissions.request(addressBarPermissions);
    if (response) {
        console.log("Permissons gotten");
        console.log(response)
        consentOptionalProxy.removeAttribute("enabled");
        SFXkeyboardAddressBox.checked = true
        consentedToProxy = true
        saveOptions()
    }
}


function sendButtonClickedEvent(event) {
    let element = event.target;
    if (element) {
        if (element.matches(`input[type="button"]`) || element.matches(`button`) || element.matches(`a[href]`)) {
            browser.runtime.sendMessage(element.matches(`a[href]`) ? 'linkpress' : 'buttonpress');
        }
    }
}

function sendCheckedEvent(event) {
    let element = event.target;
    if (element) {
        if (element.matches(`input[type="checkbox"]`)) {
            browser.runtime.sendMessage(`checkboxpress${event.target.checked}`);
        } else if (element.matches(`input[type="radio"]`)) {
            browser.runtime.sendMessage(`radiopress`);
        }
    }
}

document.addEventListener("click",sendButtonClickedEvent,{
    capture: true,
    once: false,
    passive: true
})
document.addEventListener("change",sendCheckedEvent,{
    capture: true,
    once: false,
    passive: true
})