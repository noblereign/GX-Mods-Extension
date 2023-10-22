console.log((window.innerWidth - document.documentElement.offsetWidth));
document.documentElement.style.setProperty('--scrollbar-width', (window.innerWidth - document.documentElement.offsetWidth) + 'px');

const MOD_DATABASE_KEY = "GXMusicMods"

const loadingShimmer = document.querySelector(".loadingOverlay")

const enabledBox = document.getElementById('enabled');
const muteAutoBox = document.getElementById('muteAuto');
const pageLoadBox = document.getElementById('pageLoad');
const downloadsBox = document.getElementById('download');
var volumeSlider = document.getElementById('volume');
var trackSelector = document.getElementById('track-picker');


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

const modList = document.getElementById('modListList')
const sfxModList = document.getElementById('SFXmodListList')
const keyboardModList = document.getElementById('KeyboardmodListList')


async function updateModList() {
    while (modList.firstChild) {
        modList.removeChild(modList.firstChild);
    }
    while (sfxModList.firstChild) {
        sfxModList.removeChild(sfxModList.firstChild);
    }
    while (keyboardModList.firstChild) {
        keyboardModList.removeChild(keyboardModList.firstChild);
    }
    
    try {
        let modData = await localforage.getItem(MOD_DATABASE_KEY);
        if (modData == null) {
            modData = {}
        }
        if (Object.keys(modData).length <= 0) {
            modList.setAttribute("disabled", "");
            sfxModList.setAttribute("disabled", "");
            keyboardModList.setAttribute("disabled", "");
        } else {
            let backgroundMusicEntries = 0
            let browserSoundEntries = 0
            let keyboardSoundEntries = 0

            for (const [id, data] of Object.entries(modData)) {
                if (data.layers) {
                    backgroundMusicEntries++
                    const para = document.createElement("option");
                    para.value = id;
                    para.textContent = data.displayName;
                    modList.appendChild(para);
                }
                if (data.keyboardSounds) {
                    keyboardSoundEntries++
                    const para = document.createElement("option");
                    para.value = id;
                    para.textContent = data.displayName;
                    keyboardModList.appendChild(para);
                }
                if (data.browserSounds) {
                    browserSoundEntries++
                    const para = document.createElement("option");
                    para.value = id;
                    para.textContent = data.displayName;
                    sfxModList.appendChild(para);
                }
            }

            if (backgroundMusicEntries > 0) {
                modList.removeAttribute("disabled");
            }
            if (keyboardSoundEntries > 0) {
                keyboardModList.removeAttribute("disabled");
            }
            if (browserSoundEntries > 0) {
                sfxModList.removeAttribute("disabled");
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

        muteShopping: muteShoppingBox.checked
    });
}

function restoreOptions() {
    function setCurrentChoice(result) {
        // MUSIC
        trackSelector.value = result.trackName || "off";
        enabledBox.checked = (typeof result.enabled == "undefined") ? true : result.enabled;
        muteAutoBox.checked = (typeof result.autoMute == "undefined") ? true : result.autoMute;
        pageLoadBox.checked = (typeof result.pageLoad == "undefined") ? false : result.pageLoad;
        downloadsBox.checked = (typeof result.download == "undefined") ? false : result.download;
        volumeSlider.value = result.volume || 50;
        volumePercentage.innerHTML = volumeSlider.value;

        muteShoppingBox.checked = (typeof result.muteShopping == "undefined") ? false : result.muteShopping;
        // SOUND EFFECTS
        sfxSelector.value = result.sfxName || "off";
        SFXkeyboardBox.checked = (typeof result.sfxKeyboard == "undefined") ? false : result.sfxKeyboard;
        SFXtabBox.checked = (typeof result.sfxTabs == "undefined") ? false : result.sfxTabs;
        SFXswitchesBox.checked = (typeof result.sfxPage == "undefined") ? false : result.sfxPage;
        SFXvolumeSlider.value = result.sfxVolume || 50;
        volumeSFXPercentage.innerHTML = SFXvolumeSlider.value;

        SFXhoversBox.checked = (typeof result.sfxHovers == "undefined") ? false : result.sfxHovers;
        SFXbuttonsBox.checked = (typeof result.sfxButtons == "undefined") ? false : result.sfxButtons;
        SFXupdatesBox.checked = (typeof result.sfxUpdates == "undefined") ? false : result.sfxUpdates;

        SFXlinksBox.checked = (typeof result.sfxLinks == "undefined") ? false : result.sfxLinks;
        SFXaltSwitchesBox.checked = (typeof result.sfxAltSwitch == "undefined") ? false : result.sfxAltSwitch;


        KeyboardSelector.value = result.keyboardName || "off";
        KeyboardVolumeSlider.value = result.keyboardVolume || 50;


        volumeKeyboardPercentage.innerHTML = KeyboardVolumeSlider.value;

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
    restoreOptions();
});

trackSelector.addEventListener("change", function() {
    const selectedOption = trackSelector.value; // Get the selected value
    console.log("Selected option:", selectedOption);
    browser.runtime.sendMessage('trackchange_' + selectedOption)
    saveOptions()
});

sfxSelector.addEventListener("change", function() {
    const selectedOption = sfxSelector.value; // Get the selected value
    console.log("Selected sfx:", selectedOption);
    browser.runtime.sendMessage('sfxchange_' + selectedOption)
    saveOptions()
});

KeyboardSelector.addEventListener("change", function() {
    const selectedOption = KeyboardSelector.value; // Get the selected value
    console.log("Selected keyboard:", selectedOption);
    browser.runtime.sendMessage('keyboardchange_' + selectedOption)
    saveOptions()
});

var volumePercentage = document.getElementById('volumePercentage');
var volumeSFXPercentage = document.getElementById('volumeSFXPercentage');
var volumeKeyboardPercentage = document.getElementById('volumeKeyboardPercentage');


volumeSlider.addEventListener("input", () => {
    volumePercentage.innerHTML = volumeSlider.value;
    browser.runtime.sendMessage(`volumeChange=${volumeSlider.value}`)
});

volumeSlider.addEventListener("mouseup", () => {
    console.log("Saving volume");
    volumePercentage.innerHTML = volumeSlider.value;
    saveOptions()
});

SFXvolumeSlider.addEventListener("input", () => {
    volumeSFXPercentage.innerHTML = SFXvolumeSlider.value;
    browser.runtime.sendMessage(`SFXvolumeChange=${SFXvolumeSlider.value}`)
});

SFXvolumeSlider.addEventListener("mouseup", () => {
    console.log("Saving sfx volume");
    volumeSFXPercentage.innerHTML = SFXvolumeSlider.value;
    saveOptions()
});

KeyboardVolumeSlider.addEventListener("input", () => {
    volumeKeyboardPercentage.innerHTML = KeyboardVolumeSlider.value;
    browser.runtime.sendMessage(`KeyboardvolumeChange=${KeyboardVolumeSlider.value}`)
});

KeyboardVolumeSlider.addEventListener("mouseup", () => {
    console.log("Saving sfx volume");
    volumeKeyboardPercentage.innerHTML = KeyboardVolumeSlider.value;
    saveOptions()
});
//im too lazy to put these in an array or smth lollll
enabledBox.addEventListener('change', (event) => {
    saveOptions()
})
muteAutoBox.addEventListener('change', (event) => {
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
    saveOptions()
})
SFXlinksBox.addEventListener('change', (event) => {
    saveOptions()
})
SFXaltSwitchesBox.addEventListener('change', (event) => {
    saveOptions()
})


var modsButton = document.getElementById('createModButton');
modsButton.onclick = function() {
    browser.runtime.openOptionsPage()
}