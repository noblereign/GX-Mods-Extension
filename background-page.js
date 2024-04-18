console.log('[GXM] Loading background tab...')
const MOD_DATABASE_KEY = "GXMusicMods"

let shoppingListCache = ""
let shoppingMute = false

let audioContext = new (window.AudioContext || window.webkitAudioContext)();

const delay = ms => new Promise(res => setTimeout(res, ms));

async function loadAndDecodeAudio(url) {
    console.log("Fetching",url);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch audio: ' + response.status);
        }

        const data = await response.arrayBuffer();
        return await audioContext.decodeAudioData(data);
    } catch (error) {
        console.error('Error loading or decoding audio:', error);
        return null; // Rethrow the error so it's propagated to the caller
    }
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let lastPlayedType = new WeakMap()
function playSound(bufferArray,gainNode) {    
    if (bufferArray.length > 0) {
        if (!lastPlayedType.get(bufferArray)) {
            lastPlayedType.set(bufferArray, 0)
        }
        if ((Date.now() - lastPlayedType.get(bufferArray)) > 50) {
            let indexToPlay = getRandomInt(0,bufferArray.length-1)
            var source = audioContext.createBufferSource();   // creates a sound source
            source.buffer = bufferArray[indexToPlay];                     // tell the source which sound to play
            source.connect(gainNode);                     // Connect the source to the gain node
            source.start(0);                           // play the source at the deisred time 0=now    
            lastPlayedType.set(bufferArray, Date.now())
        } else {
            console.log("[GXM] blocked a sound playing for the sake of your ears")
        }
    }          
}

let play_browser_upgrade_sound = false
const cachedSettings = {
    enabled: true,
    autoMute: true,
    unfocusedMute: false,
    pageLoad: false,
    download: false,
    volume: 50,

    sfxTabs: false,
    sfxPage: false,
    sfxVolume: 50,

    sfxHovers: false,
    sfxButtons: false,
    sfxUpdates: false,

    sfxKeyboard: false,
    keyboardVolume: 50,

    sfxLinks: false,
    sfxAltSwitch: false,

    muteShopping: false
}

let cTrack = "off"
let cSounds = "off"
let cKeyboard = "off"

let MasterGainNode = audioContext.createGain();
MasterGainNode.gain.value = (cachedSettings.volume/100);
MasterGainNode.connect(audioContext.destination);

let SFXGainNode = audioContext.createGain();
SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
SFXGainNode.connect(audioContext.destination);

let KeyboardGainNode = audioContext.createGain();
KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
KeyboardGainNode.connect(audioContext.destination);

let FAKE_BROWSER_FILESYSTEM = {
    CLICK: [],
    FEATURE_SWITCH_OFF: [],
    FEATURE_SWITCH_ON: [],
    HOVER: [],
    HOVER_UP: [],
    IMPORTANT_CLICK: [],
    LEVEL_UPGRADE: [],
    LIMITER_OFF: [],
    LIMITER_ON: [],
    SWITCH_TOGGLE: [],
    TAB_CLOSE: [],
    TAB_INSERT: [],
    TAB_SLASH: [],
}

let FAKE_KEYBOARD_FILESYSTEM = {
    TYPING_BACKSPACE: [],
    TYPING_ENTER: [],
    TYPING_LETTER: [],
    TYPING_SPACE: [],
}

var decay = 0.03;
var distance = 10;
var muted = false;
var mutedDueToFocus = false;

var lerpedLevel = 0
var level = 0

function lerp(start, end, t){
    return (1-t)*start+t*end
}
const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

var last = Date.now()
function updateLevels() {
    var now = Date.now()
    var delta = (now - last) / 1000
    last = now
    if (lerpedLevel > distance * 5) level = distance * 5;
    var l = (lerpedLevel / distance) + 1;

    MasterGainNode.gain.value = (cachedSettings.volume/100)

    for (var gainNode of gainNodes) {
        gainNode.gain.value = lerp(gainNode.gain.value, ((muted && cachedSettings.autoMute) || !cachedSettings.enabled || (shoppingMute && cachedSettings.muteShopping) || (mutedDueToFocus && cachedSettings.unfocusedMute)) ? 0 : Math.max(Math.min(l,1),0), clamp(delta*5,0,1));
        l--;
    }
    lerpedLevel = lerp(lerpedLevel,level,clamp(delta*20,0,1))
}

setInterval(function() {
    if (level > 0) level -= decay;
    updateLevels()
}, 16.6)

var sounds = [];
var sourceNodes = [];
var gainNodes = [];

/*function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
        let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
        if ((encoded.length % 4) > 0) {
            encoded += '='.repeat(4 - (encoded.length % 4));
        }
        resolve(encoded);
        };
        reader.onerror = error => reject(error);
    });
}*/
// early on i used to use base64 to store the music because i didn't know you could just store blobs lol
// it was a big mistake, you'd get up to like 6 mods and then the whole thing would collapse in on itself
// thank god i figured out blobs, huh?

function fetchRetry(url, options = {}, retries = 3, backoff = 300) {
    const retryCodes = [408, 500, 502, 503, 504, 522, 524];
    return fetch(url, options)
        .then(res => {
            if (res.ok) {
                console.log("Fetch succeeded");
                return res.blob();
            }

            if (retries > 0 && retryCodes.includes(res.status)) {
                setTimeout(() => {
                    return fetchRetry(url, options, retries - 1, backoff * 2);
                }, backoff);
            } else {
                throw new Error(res);
            }
        })
        .catch(console.error);
}

let currentKeyboardSounds = {}
let currentBrowserSounds = {}

function updateInstallerButtons(modId,text) {
    browser.tabs.query({ url: "*://*.store.gx.me/*" }).then(tabs => {
        for (const tab of tabs) {
            browser.tabs
              .sendMessage(tab.id, {
                targetMod: modId,
                newText: text
            })
              .catch(console.warn);
        }
    })
    .catch(console.warn);
}

async function onExtensionMessage(message, sender) {
    //console.log('[GXM] incoming message',message)
    if ((typeof message === 'object') && (message != null)) {
        if (message.intent == "getModState" && message.modId) {
            console.log('[GXM] getting mod state')
            let modData = {}
            try {
                modData = await localforage.getItem(MOD_DATABASE_KEY);
                if (modData == null) {
                    modData = {}
                }
                return Promise.resolve(modData[message.modId] ? modData[message.modId] : {});
            } catch (err) {
                console.log(err);
                return Promise.resolve(false);
            }
        } else if (message.intent == "buttonMessage" && message.modId && message.text) { 
            updateInstallerButtons(message.modId,message.text)
        } else if (message.intent == "installMod" && message.modId && message.modContentUrl && message.modVersion) {
            console.log('[GXM] Installing mod',message.modId);
            let downloadedLayers = message.modLayers
            let downloadedKeyboardSounds = message.modKeyboardSounds
            let downloadedBrowserSounds = message.modBrowserSounds

            if (downloadedLayers.length > 0 || (Object.keys(downloadedKeyboardSounds).length > 0) || (Object.keys(downloadedBrowserSounds).length > 0)) {
                console.log("Attempting save...");
                updateInstallerButtons(message.modId,`Finalizing...`)
                try {
                    let previousData = await localforage.getItem(MOD_DATABASE_KEY);
                    if (previousData == null) {
                        previousData = {}
                    }

                    previousData[message.modId] = {
                        displayName: (message.modDisplayName ? message.modDisplayName : message.modId),
                        source: "Installed from GX.store",
                        layers: ((downloadedLayers.length > 0) ? downloadedLayers : null),
                        keyboardSounds: ((Object.keys(downloadedKeyboardSounds).length > 0) ? downloadedKeyboardSounds : null),
                        browserSounds: ((Object.keys(downloadedBrowserSounds).length > 0) ? downloadedBrowserSounds : null),
                        version: (message.modVersion ? message.modVersion : "unknown"),
                        storePage: (message.modStorePage ? message.modStorePage : null)
                    }

                    try {
                        let resultToSendBack = await localforage.setItem(MOD_DATABASE_KEY, previousData).then(function(value) {
                            console.log("Saved successfully")
                            /*try {
                                browser.runtime.sendMessage({
                                    intent: "updateModLists",
                                    newMod: message.modId
                                })
                            } catch (err) {
                                console.log("couldn't update settings tabs");
                                console.log(err);
                            }*/
                            if (previousData[message.modId].layers) {
                                try {
                                    let toSwapTo = previousData[message.modId].layers[0]
                                    if (toSwapTo.hasOwnProperty('id')) { // this is a new-style mod and has multiple entries
                                        console.log("New format mod, switching to first track");
                                        let toTrack = message.modId + `/${toSwapTo.id}`
                                        browser.storage.local.set({
                                            trackName: toTrack,
                                        });
                                        onExtensionMessage(`trackchange_${toTrack}`);
                                    } else {
                                        console.log("Classic format mod");
                                        browser.storage.local.set({
                                            trackName: message.modId,
                                        });
                                        onExtensionMessage(`trackchange_${message.modId}`);
                                    }
                                } catch (err) {
                                    console.log("couldn't auto swap music");
                                    console.log(err);
                                }
                            }
                            let addedContent = "Nothing! ..wait, what?"

                            if (previousData[message.modId].layers) {
                                if (addedContent == "Nothing! ..wait, what?") {
                                    addedContent = ""
                                }
                                addedContent += "Background Music"
                            }
                            if (previousData[message.modId].keyboardSounds) {
                                if (addedContent == "Nothing! ..wait, what?") {
                                    addedContent = ""
                                }
                                if (addedContent != "") {
                                    addedContent += ", "
                                }
                                addedContent += "Keyboard Sounds"
                            }
                            if (previousData[message.modId].browserSounds) {
                                if (addedContent == "Nothing! ..wait, what?") {
                                    addedContent = ""
                                }
                                if (addedContent != "") {
                                    addedContent += ", "
                                }
                                addedContent += "Browser Sounds"
                            }
                            
                            browser.notifications.create({
                                type: "basic",
                                iconUrl: browser.runtime.getURL("icons/gxm_large_outline.png"),
                                title: "Mod installed!",
                                message: `Added content: ${addedContent}`,
                            });

                            return {
                                succeeded: true
                            }
                        }).catch(function(err) {
                            console.log(err);
                            return {
                                succeeded: false,
                                error: "Failed to write to disk."
                            }
                        });
                        return resultToSendBack
                    } catch (err) {
                        // This code runs if there were any errors.
                        console.log(err);
                        return {
                            succeeded: false,
                            error: "Failed to write to disk."
                        }
                    }

                } catch (err) {
                    // This code runs if there were any errors.
                    console.log(err);
                    return {
                        succeeded: false,
                        error: "Failed to read from disk."
                    }
                }
            } else {
                return {
                    succeeded: false,
                    error: "Transfer failed."
                }
            }
        } else {
            console.log('[GXM] unknown object received');
            console.log(message);
        }
    } else if (message.startsWith('trackchange_')) {
        var newTrack = message.replace("trackchange_","")
        if (newTrack == cTrack) return;
        return loadSounds(newTrack)
    } else if (message.startsWith('sfxchange_')) {
        var newSounds = message.replace("sfxchange_","")
        if (newSounds == cSounds) return;
        return loadBrowserSounds(newSounds)
    } else if (message.startsWith('keyboardchange_')) {
        var newKeyboard = message.replace("keyboardchange_","")
        if (newKeyboard == cKeyboard) return;
        return loadKeyboardSounds(newKeyboard)
    } else if (message.startsWith('mousehover')) {
        if (cachedSettings.sfxHovers) {
            SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
            playSound(currentBrowserSounds.HOVER ? currentBrowserSounds.HOVER : [], SFXGainNode);
        }
    } else if (message.startsWith('mouse')) {
        level += 2.5;
    } else if (message.startsWith('volumeChange=')) {
        var newVolume = message.replace("volumeChange=","")
        cachedSettings.volume = Number(newVolume)
    } else if (message.startsWith('SFXvolumeChange=')) {
        var newVolume = message.replace("SFXvolumeChange=","")
        cachedSettings.sfxVolume = Number(newVolume)
    } else if (message.startsWith('KeyboardvolumeChange=')) {
        var newVolume = message.replace("KeyboardvolumeChange=","")
        cachedSettings.keyboardVolume = Number(newVolume)
    } else if (message.startsWith('spacedown')) { //im so sorry i tried to make this a switch case but it didnt work :'(
        if (cachedSettings.sfxKeyboard) {
            KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
            playSound(currentKeyboardSounds.TYPING_SPACE ? currentKeyboardSounds.TYPING_SPACE : [], KeyboardGainNode);
        }
        level += 1;
    } else if (message.startsWith('bkspdown')) {
        if (cachedSettings.sfxKeyboard) {
            KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
            playSound(currentKeyboardSounds.TYPING_BACKSPACE ? currentKeyboardSounds.TYPING_BACKSPACE : [], KeyboardGainNode);
        }
        level += 1;
    } else if (message.startsWith('enterdown')) {
        if (cachedSettings.sfxKeyboard) {
            KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
            playSound(currentKeyboardSounds.TYPING_ENTER ? currentKeyboardSounds.TYPING_ENTER : [], KeyboardGainNode);
        }
        level += 1;
    } else if (message.startsWith('keydown_silent')) {
        level += 1;
    } else if (message.startsWith('keydown')) {
        if (cachedSettings.sfxKeyboard) {
            KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
            playSound(currentKeyboardSounds.TYPING_LETTER ? currentKeyboardSounds.TYPING_LETTER : [], KeyboardGainNode);
        }
        level += 1;
    } else if (message.startsWith('buttonpress')) {
        if (cachedSettings.sfxButtons) {
            SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
            playSound(currentBrowserSounds.CLICK ? currentBrowserSounds.CLICK : [], SFXGainNode);
        }
    } else if (message.startsWith('linkpress')) {
        if (cachedSettings.sfxLinks) {
            SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
            playSound(currentBrowserSounds.CLICK ? currentBrowserSounds.CLICK : [], SFXGainNode);
        }
    } else if (message.startsWith('checkboxpress')) {
        if (cachedSettings.sfxPage) {
            SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
            if (cachedSettings.sfxAltSwitch) {
                if (message.endsWith('true')) {
                    playSound(currentBrowserSounds.FEATURE_SWITCH_ON ? currentBrowserSounds.FEATURE_SWITCH_ON : [], SFXGainNode);
                } else {
                    playSound(currentBrowserSounds.FEATURE_SWITCH_OFF ? currentBrowserSounds.FEATURE_SWITCH_OFF : [], SFXGainNode);
                }
            } else {
                playSound(currentBrowserSounds.SWITCH_TOGGLE ? currentBrowserSounds.SWITCH_TOGGLE : [], SFXGainNode);
            }
        }
    } else if (message.startsWith('radiopress')) {
        if (cachedSettings.sfxPage) {
            SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
            playSound(currentBrowserSounds.SWITCH_TOGGLE ? currentBrowserSounds.SWITCH_TOGGLE : [], SFXGainNode);
        }
    } else if (message.startsWith('visibility=')) {
        setTimeout(function(){
            browser.tabs
            .executeScript({
                code: "document.hidden"
            })
            .then(results => {
                let isHidden = results[0];
                mutedDueToFocus = isHidden
            })
            .catch(function(err) {
                console.warn("Something went wrong while checking focus!")
                console.warn(err)
                //console.warn("Falling back to sent visibility...")
               // var isHidden = message.replace("visibility=","")
               // mutedDueToFocus = (isHidden == "true")
            })
        },100);
    } else {
        console.log("[GXM] weird message received:",message)     
    }
    updateLevels()
    return false
}

browser.runtime.onMessage.addListener(onExtensionMessage);

async function checkTabAudible() {
    var tabs = await browser.tabs.query({audible: true})
    muted = tabs.length
}
browser.tabs.onUpdated.addListener(checkTabAudible)

browser.tabs.onCreated.addListener((tab) => {
    //console.log('[GXM] new tab',tab.id);
    if (cachedSettings.sfxTabs) {
        SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
        playSound(currentBrowserSounds.TAB_INSERT ? currentBrowserSounds.TAB_INSERT : [], SFXGainNode);
    }
    level += 10;
    updateLevels()
})
browser.tabs.onRemoved.addListener((tab, removeInfo) => {
    if (!removeInfo.isWindowClosing) {
        if (cachedSettings.sfxTabs) {
            SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
            playSound(currentBrowserSounds.TAB_CLOSE ? currentBrowserSounds.TAB_CLOSE : [], SFXGainNode);
        }
    }
})

if (typeof browser.windows !== "undefined") {
    browser.windows.onRemoved.addListener((windowId) => {
        if (cachedSettings.sfxTabs) {
            SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
            playSound(currentBrowserSounds.TAB_CLOSE ? currentBrowserSounds.TAB_CLOSE : [], SFXGainNode);
        }
    });

    browser.windows.onFocusChanged.addListener((windowId) => {
        mutedDueToFocus = (windowId == browser.windows.WINDOW_ID_NONE)
    }); 
}


browser.runtime.onInstalled.addListener((details) => {
    if (details.reason == "browser_update" || details.reason == "chrome_update" || details.reason == "update") {
        console.log("Queued browser update sound");
        play_browser_upgrade_sound = true;
    } else if (details.reason == "install") {
        browser.tabs.create({ url: "/first-time/welcome.html" })
    }
});

function pageLoadEvent(details) {
    //console.log(`[GXM] page loaded: ${details.url}`);
    if (cachedSettings.muteShopping && (shoppingListCache == "")) {
        initShoppingMutes()
    }
    if (cachedSettings.pageLoad) {
        level += 10;
        updateLevels()
    }
}
  
browser.webNavigation.onCompleted.addListener(pageLoadEvent);

function handleChanged(delta) {
    if (delta.state && delta.state.current === "complete") {
         //console.log(`[GXM] download ${delta.id} has completed.`);
         if (cachedSettings.download) {
            level += 15;
            updateLevels()
        }
    }
}
  
browser.downloads.onChanged.addListener(handleChanged);

checkTabAudible();
setTimeout(checkTabAudible,10000);

/* setInterval(async function() {
    var tabs = await browser.tabs.query({currentWindow: true})
    browser.tabs
    .executeScript({
        code: "document.hidden"
    })
    .then(results => {
        console.log(results[0])
    })
    .catch(console.error);
    console.log("Checked for focused tab")
}, 200) */

async function parse(file) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    const result = await new Promise((resolve, reject) => {
        reader.onload = function(event) {
            console.log("Loaded")
            resolve(reader.result)
        }
    })
    //console.log(result)
    return result
}

function isIterable(obj) {
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

async function loadSounds(track) {
    cTrack = track
    console.log("Attempting to load BGM",cTrack)

    sourceNodes.forEach(sourceNode => sourceNode.stop());



    sourceNodes.forEach(sourceNode => sourceNode.disconnect());
    gainNodes.forEach(gainNode => gainNode.disconnect());
    MasterGainNode.disconnect()
    
    await delay(500);

    // audioContext.close()
    // audioContext = null
    MasterGainNode = null

    //audioContext = new (window.AudioContext || window.webkitAudioContext)();

    MasterGainNode = audioContext.createGain();
    MasterGainNode.gain.value = (cachedSettings.volume/100);
    MasterGainNode.connect(audioContext.destination);

    sounds = null
    sourceNodes = null
    gainNodes = null
    promises = null

    sounds = []
    sourceNodes = []
    gainNodes = []
    promises = []

    if (track == 'off') return console.log("[GXM] Music is off");

    
    let modData = {}
    try {
        modData = await localforage.getItem(MOD_DATABASE_KEY);
        if (modData == null) {
            modData = {}
        }
    } catch (err) {
        console.log(err);
    }

    //thank you new style mods very cool
    const trackData = track.split("/");
    const trackName = trackData[0]
    const subTrack = trackData[1]

    if (modData[trackName]) {
        console.log("[GXM] Loading modded track")
        let layerData = modData[trackName].layers
        if (isIterable(layerData)) {
            if ((layerData[0].hasOwnProperty('name'))) { // new format mod, try and find subtrack
                console.log(`New format mod, trying to find subtrack ${subTrack}`);
                var foundLayers = layerData.find(obj => {
                    return obj.id === subTrack
                })
                if (foundLayers) {
                    layerData = foundLayers.layers
                } else {
                    console.log("THE SUBTRACK DOESNT EXIST??? emptying layerdata to prevent the entire extension from combusting");
                    layerData = []
                    // MY BADDDDD this is really confusing to work with 😭
                    browser.notifications.create({
                        type: "basic",
                        iconUrl: browser.runtime.getURL("icons/gxm_large_outline.png"),
                        title: "Failed to load track...",
                        message: `Couldn't find the music in the mod... this is likely a bug with new mod format, please report this on GXM's GitHub issues with the name of the mod used`,
                    });
                }
            }
        } else {
            console.log(`Layerdata not iterable, assuming classic format mod`);
        }
        console.log(layerData)
        for (const blob of layerData){
            console.log("Loading mod layer");
            //console.log(blob)
            //console.log(blob.type)

            console.log("parsing")
            let arrayBuffer = await parse(blob)
            console.log("buffering")
            const soundBuffer = await audioContext.decodeAudioData(arrayBuffer);
            if (soundBuffer) {
                const sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = soundBuffer;
                sourceNode.loop = true;
                
                const gainNode = audioContext.createGain();
                gainNode.gain.value = 0.0; // Adjust the volume as needed
                
                sourceNode.connect(gainNode);
                gainNode.connect(MasterGainNode);
                
                sounds.push(soundBuffer);
                sourceNodes.push(sourceNode);
                gainNodes.push(gainNode);
            } else {
                console.log("Layer doesn't exist lol");
            }
        }
    } else {
        console.log("[GXM] Loading built-in track")
        for (let i = 1; i < 7; i++) {
            const url = `./music/${trackName}_${i}.mp3`;
            console.log("Loading layer " + i);
            const soundBuffer = await loadAndDecodeAudio(url);
            if (soundBuffer) {
                const sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = soundBuffer;
                sourceNode.loop = true;
                
                const gainNode = audioContext.createGain();
                gainNode.gain.value = 0.0; // Adjust the volume as needed
                
                sourceNode.connect(gainNode);
                gainNode.connect(MasterGainNode);
                
                //const sound = new Audio(url);
                sounds.push(soundBuffer);
                sourceNodes.push(sourceNode);
                gainNodes.push(gainNode);
            } else {
                console.log("Layer " + i + " doesn't exist lol");
            }
        }
    }

    console.log("[GXM] All BGM sounds loaded.")

    modData = null;
    const startTime = audioContext.currentTime + 0.1; // Delay the start if needed

    browser.storage.local.get("trackName").then(
        function(result) {
            console.log("[GXM] Queueing music")
            if (result.trackName == cTrack || typeof result.trackName == "undefined") {
                sourceNodes.forEach((sourceNode, index) => {
                    sourceNode.start(startTime);
                });
                console.log("[GXM] Music queued")
            } else {
                console.log("[GXM] Cancelled queue since saved track is different (" + result.trackName + ")")
                console.log(result.trackName);
                console.log(cTrack);
            }
        },
        function(error) {
            console.log(`Error while enabling the track! ${error}`);
        }
    );      
    return true
}

async function loadKeyboardSounds(track) {
    cKeyboard = track
    console.log("Attempting to load Keyboard",cKeyboard)

    KeyboardGainNode.disconnect()
    
    await delay(500);

    for (const [category, soundArray] of Object.entries(currentKeyboardSounds)) {
        currentKeyboardSounds[category] = null
    }

    KeyboardGainNode = null
    KeyboardGainNode = audioContext.createGain();
    KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
    KeyboardGainNode.connect(audioContext.destination);

    currentKeyboardSounds = {}

    if (track == 'off') return console.log("[GXM] Keyboard sounds are off");

    let modData = {}
    try {
        modData = await localforage.getItem(MOD_DATABASE_KEY);
        if (modData == null) {
            modData = {}
        }
    } catch (err) {
        console.log(err);
    }

    if (modData[track]) {
        console.log("[GXM] Loading modded keyboard sounds")
        let layerData = modData[track].keyboardSounds

        if (layerData) {
            for (const [soundCategory, soundsArray] of Object.entries(layerData)) {
                console.log("parsing",soundCategory)
                currentKeyboardSounds[soundCategory] = []
                for (const blob of soundsArray) {
                    //console.log(blob)
                    //console.log(blob.type)
                    let arrayBuffer = await parse(blob)
                    const soundBuffer = await audioContext.decodeAudioData(arrayBuffer);

                    if (soundBuffer) {
                        currentKeyboardSounds[soundCategory].push(soundBuffer)
                    } else {
                        console.log("Can't load it lol");
                    }
                }
            }
        }
    } else {
        console.log("[GXM] Loading built-in keyboard sounds")

        for (const [soundCategory, soundsArray] of Object.entries(FAKE_KEYBOARD_FILESYSTEM)) {
            console.log("parsing",soundCategory)
            currentKeyboardSounds[soundCategory] = []
            for (let i = 1; i < 7; i++) {
                const url = `./keyboard/${track}/${soundCategory}/${i}.wav`;
                console.log("Parsing " + i);
                const soundBuffer = await loadAndDecodeAudio(url);
                if (soundBuffer) {
                    currentKeyboardSounds[soundCategory].push(soundBuffer)
                } else {
                    console.log(url,"doesn't exist lol");
                }
            }
        }
    }

    console.log("[GXM] All keyboard sounds loaded.")

    modData = null;
    return true
}



async function loadBrowserSounds(track) {
    cSounds = track
    console.log("Attempting to load SFX",cSounds)
    SFXGainNode.disconnect()
    
    await delay(500);

    for (const [category, soundArray] of Object.entries(currentBrowserSounds)) {
        currentBrowserSounds[category] = null
    }

    SFXGainNode = null
    SFXGainNode = audioContext.createGain();
    SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
    SFXGainNode.connect(audioContext.destination);

    currentBrowserSounds = {}

    if (track == 'off') return console.log("[GXM] Browser sounds are off");

    let modData = {}
    try {
        modData = await localforage.getItem(MOD_DATABASE_KEY);
        if (modData == null) {
            modData = {}
        }
    } catch (err) {
        console.log(err);
    }

    if (modData[track]) {
        console.log("[GXM] Loading modded browser sounds")
        let layerData = modData[track].browserSounds

        if (layerData) {
            for (const [soundCategory, soundsArray] of Object.entries(layerData)) {
                console.log("parsing",soundCategory)
                currentBrowserSounds[soundCategory] = []
                for (const blob of soundsArray) {
                    //console.log(blob)
                    //console.log(blob.type)
                    let arrayBuffer = await parse(blob)
                    const soundBuffer = await audioContext.decodeAudioData(arrayBuffer);

                    if (soundBuffer) {
                        currentBrowserSounds[soundCategory].push(soundBuffer)
                    } else {
                        console.log("Can't load it lol");
                    }
                }
            }
        }
    } else {
        console.log("[GXM] Loading built-in browser sounds")

        for (const [soundCategory, soundsArray] of Object.entries(FAKE_BROWSER_FILESYSTEM)) {
            console.log("parsing",soundCategory)
            currentBrowserSounds[soundCategory] = []
            for (let i = 1; i < 7; i++) {
                const url = `./sfx/${track}/${soundCategory}/${i}.wav`;
                console.log("Parsing " + i);
                const soundBuffer = await loadAndDecodeAudio(url);
                if (soundBuffer) {
                    currentBrowserSounds[soundCategory].push(soundBuffer)
                } else {
                    console.log(url,"doesn't exist lol");
                }
            }
        }
    }

    console.log("[GXM] All browser sounds loaded.")

    if (cachedSettings.sfxUpdates && play_browser_upgrade_sound) {
        console.warn("[GXM] Browser was updated!");
        SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
        playSound(currentBrowserSounds.LEVEL_UPGRADE ? currentBrowserSounds.LEVEL_UPGRADE : [], SFXGainNode);
        play_browser_upgrade_sound = false;
    }

    modData = null;
    return true
}





browser.storage.local.get().then(
    async function(result) {
        let platformInfo = await browser.runtime.getPlatformInfo()
        cachedSettings.enabled = (typeof result.enabled == "undefined") ? true : result.enabled;
        cachedSettings.autoMute = (typeof result.autoMute == "undefined") ? true : result.autoMute;
        cachedSettings.unfocusedMute = (typeof result.unfocusedMute == "undefined") ? (platformInfo.os == 'android' ? true : false) : result.unfocusedMute;
        cachedSettings.pageLoad = (typeof result.pageLoad == "undefined") ? false : result.pageLoad;
        cachedSettings.download = (typeof result.download == "undefined") ? false : result.download;
        cachedSettings.volume = (typeof result.volume == "undefined") ? 50 : result.volume;

        cachedSettings.sfxTabs = (typeof result.sfxTabs == "undefined") ? false : result.sfxTabs;
        cachedSettings.sfxPage = (typeof result.sfxPage == "undefined") ? false : result.sfxPage;
        cachedSettings.sfxVolume = (typeof result.sfxVolume == "undefined") ? 50 : result.sfxVolume;

        cachedSettings.sfxHovers = (typeof result.sfxHovers == "undefined") ? false : result.sfxHovers;
        cachedSettings.sfxButtons = (typeof result.sfxButtons == "undefined") ? false : result.sfxButtons;
        cachedSettings.sfxUpdates = (typeof result.sfxUpdates == "undefined") ? false : result.sfxUpdates;

        cachedSettings.sfxKeyboard = (typeof result.sfxKeyboard == "undefined") ? false : result.sfxKeyboard;
        cachedSettings.keyboardVolume = (typeof result.keyboardVolume == "undefined") ? 50 : result.keyboardVolume;

        cachedSettings.muteShopping = (typeof result.muteShopping == "undefined") ? false : result.muteShopping;
        
        cachedSettings.sfxLinks = (typeof result.sfxLinks == "undefined") ? false : result.sfxLinks;
        cachedSettings.sfxAltSwitch = (typeof result.sfxAltSwitch == "undefined") ? false : result.sfxAltSwitch;

        if (result.consentedToJSD && result.shoppingMute) {
            initShoppingMutes()
        }
        
        loadSounds(result.trackName || 'off')
        loadKeyboardSounds(result.keyboardName || 'off')
        loadBrowserSounds(result.sfxName || 'off')
    },
    function(error) {
        console.log(`Error while enabling the initial track! ${error}`);
    }
);

function updateSettings(changes) {
    const changedItems = Object.keys(changes);

    for (const item of changedItems) {
        if (cachedSettings.hasOwnProperty(item)) {
            cachedSettings[item] = changes[item].newValue;
        }
    }
}

browser.storage.local.onChanged.addListener(updateSettings);

console.log("[GXM] updating the shop websites list")

function fetchRetryText(url, options = {}, retries = 3, backoff = 300) {
    const retryCodes = [408, 500, 502, 503, 504, 522, 524];
    return fetch(url, options)
        .then(res => {
            if (res.ok) {
                console.log("Fetch succeeded");
                return res.text();
            }

            if (retries > 0 && retryCodes.includes(res.status)) {
                setTimeout(() => {
                    return fetchRetryText(url, options, retries - 1, backoff * 2);
                }, backoff);
            } else {
                throw new Error(res);
            }
        })
        .catch(console.error);
}

async function shouldShoppingMute(info) {
    try {
        //console.log(typeof(info))
        //console.log(info)
        let tabId = (typeof(info) == "number" ? info : info.tabId)
        let tabInfo = await browser.tabs.get(tabId);
        if (tabInfo.active) {
            let allowedToCheck = false
            if (typeof browser.windows !== "undefined") {
                let currentWindow = await browser.windows.getCurrent();
                if (tabInfo.windowId == currentWindow.id) {
                    allowedToCheck = true
                }
            } else { // probably on mobile, just allow it
                allowedToCheck = true
            }
            if (allowedToCheck) {
                let currentURL = new URL(tabInfo.url)
                //console.log(currentURL)
                if (currentURL.host && (currentURL.host != "")) {
                    var regEx = new RegExp(`^${currentURL.host.replace(".","\.")}$`,"gm");
                    var regEx2 = new RegExp(`^${currentURL.host.replace("www.","").replace(".","\.")}$`,"gm");
                    let tryMatch1 = (shoppingListCache.match(regEx))
                    let tryMatch2 = (shoppingListCache.match(regEx2))
                    //console.log(tryMatch1,tryMatch2,regEx,regEx2)
                    shoppingMute = (tryMatch1 != null || tryMatch2 != null)
                } else {
                    shoppingMute = false
                }
            }
        }
    } catch (error) {
        console.error(error);
    }
}

function initShoppingMutes() {
    if (shoppingListCache == "") {
        shoppingListCache = "currentlyFetchingPleaseWait!"
        fetchRetryText("https://cdn.jsdelivr.net/gh/corbindavenport/shop-list/list.txt").then(function(value) {
            shoppingListCache = value
            console.log("[GXM] shop sites list updated!!")

            browser.tabs.onUpdated.addListener(function(tabId, changeInfo) {
                if (changeInfo.url) {
                    shouldShoppingMute(tabId)
                }
            });
            browser.tabs.onActivated.addListener(function(tab) {
                shouldShoppingMute(tab)
            });
        }).catch(function(err) {
            console.warn("Something went wrong while fetching the shopping list!")
            console.warn(err)
            shoppingListCache = ""
        })
    }
}


browser.runtime.onSuspend.addListener(function () {
    console.log("[GXM] oghh,, goodbye world")
    sourceNodes.forEach(sourceNode => sourceNode.stop());
    sourceNodes.forEach(sourceNode => sourceNode.disconnect());
    gainNodes.forEach(gainNode => gainNode.disconnect());
    MasterGainNode.disconnect()
    MasterGainNode = null
    KeyboardGainNode.disconnect()
    KeyboardGainNode = null
    SFXGainNode.disconnect()
    SFXGainNode = null
    audioContext.close()
    sounds = null
    sourceNodes = null
    gainNodes = null
    promises = null
    console.log("[GXM] see u later")
})

browser.runtime.onSuspendCanceled.addListener(function () {
    console.log("[GXM] oh we're going to live")
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    MasterGainNode = audioContext.createGain();
    MasterGainNode.gain.value = (cachedSettings.volume/100);
    MasterGainNode.connect(audioContext.destination);

    SFXGainNode = audioContext.createGain();
    SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
    SFXGainNode.connect(audioContext.destination);

    KeyboardGainNode = audioContext.createGain();
    KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
    KeyboardGainNode.connect(audioContext.destination);
    
    loadSounds(result.trackName || 'off')

    console.log("[GXM] we back")
})
