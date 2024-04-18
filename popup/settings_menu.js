console.log((window.innerWidth - document.documentElement.offsetWidth));
document.documentElement.style.setProperty('--scrollbar-width', (window.innerWidth - document.documentElement.offsetWidth) + 'px');

const MOD_DATABASE_KEY = "GXMusicMods"

const loadingShimmer = document.querySelector(".loadingOverlay")
const consentForm = document.querySelector(".consentOverlay")

const enabledBox = document.getElementById('enabled');
const muteAutoBox = document.getElementById('muteAuto');
const muteFocusBox = document.getElementById('muteFocus');
const muteFocusContainer = document.getElementById('muteFocusContainer')

const pageLoadBox = document.getElementById('pageLoad');
const downloadsBox = document.getElementById('download');
var volumeSlider = document.getElementById('volume');
var trackSelector = document.getElementById('track-picker');

let consentedToJSD = false;


const SFXkeyboardBox = document.getElementById('typingOn');
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

const muteShoppingBox = document.getElementById('muteShopping');

const modList = document.getElementById('track-picker')
const sfxModList = document.getElementById('sfx-picker')
const keyboardModList = document.getElementById('keyboard-picker')

const trackSource = document.getElementById('track-source')
const sfxSource = document.getElementById('sfx-source')
const keyboardSource = document.getElementById('keyboard-source')

let moddedOptions = []

async function updateModList() {
    //while (modList.firstChild) {
    //    modList.removeChild(modList.firstChild);
    //}
    //while (sfxModList.firstChild) {
    //    sfxModList.removeChild(sfxModList.firstChild);
    //}
    //while (keyboardModList.firstChild) {
    //    keyboardModList.removeChild(keyboardModList.firstChild);
    //}
    
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
            //modList.setAttribute("disabled", "");
            //sfxModList.setAttribute("disabled", "");
            //keyboardModList.setAttribute("disabled", "");

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
            backgroundMusicEntries = null;
            keyboardSoundEntries = null;
            browserSoundEntries = null;
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
        keyboardVolume: KeyboardVolumeSlider.value,

        muteShopping: muteShoppingBox.checked,
        consentedToJSD: consentedToJSD
    });
}

async function restoreOptions() {
    let platformInfo = await browser.runtime.getPlatformInfo()
    if (platformInfo.os == 'android') {
        muteFocusBox.disabled = true;
        muteFocusContainer.classList.add("disabled");
        muteFocusBox.checked = true; // android must always have this on or else it'll play in other apps :/
    }

    function setCurrentChoice(result) {
        consentedToJSD = (typeof result.consentedToJSD == "undefined") ? false : result.consentedToJSD;
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
            trackSource.classList.add("hidden");
        }

        KeyboardSelector.value = result.keyboardName || "off";
        KeyboardVolumeSlider.value = result.keyboardVolume || 50;

        volumeKeyboardPercentage.textContent = KeyboardVolumeSlider.value;

        var selectedItem = KeyboardSelector.selectedOptions[0]
        if (typeof selectedItem !== 'undefined') {
            if (selectedItem.getAttribute("data-author")) {
                keyboardSource.textContent = selectedItem.getAttribute("data-author")
                keyboardSource.classList.remove("hidden");
            } else {
                keyboardSource.classList.add("hidden");
            }
        } else {
            trackSource.classList.add("hidden");
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
        trackSource.classList.add("hidden");
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
        trackSource.classList.add("hidden");
    }
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