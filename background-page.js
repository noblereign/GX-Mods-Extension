console.log('[GXM] Loading background tab...')
const MOD_DATABASE_KEY = "GXMusicMods"

let shoppingListCache = ""
let shoppingMute = false

let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let debugLogging = [] // only used if the user enables the debug option
let loggingEnabled = false
const LOGGING_MAX_LENGTH = 128

const delay = ms => new Promise(res => setTimeout(res, ms));

// to anyone reading this code:
// Sorry </3

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

let addressBarPermissions = {
    permissions: ["proxy"]
};
browser.runtime.getPlatformInfo().then(function(platformInfo) {
    if (platformInfo.os != 'android') {
        addressBarPermissions.permissions.push("search")
    }
})

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let lastPlayedType = new WeakMap()
function playSound(bufferArray,gainNode) {    
    if (!cachedSettings.globalMute) {
        if (bufferArray.length > 0) {
            if (!lastPlayedType.get(bufferArray)) {
                lastPlayedType.set(bufferArray, 0)
            }
            if ((Date.now() - lastPlayedType.get(bufferArray)) > 50) {
                let indexToPlay = getRandomInt(0,bufferArray.length-1)
                var source = audioContext.createBufferSource();
                source.buffer = bufferArray[indexToPlay];
                source.connect(gainNode);
                source.start(0);  
                lastPlayedType.set(bufferArray, Date.now())
            } else {
                console.log("[GXM] blocked a sound playing for the sake of your ears")
            }
        }
    }      
}

function addToLog(message, sensitive) {
    if (loggingEnabled) {
        debugLogging.push({
            time: new Date(),
            message: message,
            sensitive: sensitive
        })
        if (debugLogging.length > LOGGING_MAX_LENGTH) {
            debugLogging.shift();
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
    sfxAddressBar: false,
    keyboardVolume: 50,

    sfxLinks: false,
    sfxAltSwitch: false,

    lightTheme: false,

    muteShopping: false,

    globalMute: false,
    globalMutePersist: false
}

let searchEngines = [] // Cached later

let cTrack = "off"
let cSounds = "off"
let cKeyboard = "off"
let cTheme = "off"

let generatedThemeData = {}

function compareThemes(theme1, theme2) {
    // Step 1: Check if both inputs are objects. If not, return false.
    if (typeof theme1 !== 'object') {
        console.log("First param was not an object");
      return false;
    }
  
    if (typeof theme2 !== 'object') {
        console.log("Second param was not an object");
      return false;
    }
  
    // Step 2: Get filtered keys for both objects using the getFilteredKeys helper function.

    let checkColors1 = theme1.colors || {}
    let checkColors2 = theme2.colors || {}

    let checkProps1 = theme1.properties || {}
    let checkProps2 = theme2.properties || {}



    const filteredColors1 = getFilteredKeys(checkColors1);
    const filteredColors2 = getFilteredKeys(checkColors2);

    const filteredProps1 = getFilteredKeys(checkProps1);
    const filteredProps2 = getFilteredKeys(checkProps2);
  

    // Step 3: Check if the filtered key arrays have the same length using the hasSameLength helper function. If not, return false.
    if (!hasSameLength(filteredColors1, filteredColors2)) {
        console.log("The lengths of the colors were not the same");
        return false;
    }

    if (!hasSameLength(filteredProps1, filteredProps2)) {
        console.log("The lengths of the properties were not the same");
        return false;
    }
  
    // Step 4: Iterate through the filtered keys of the first object and check if the same key
    //         exists in the second object and if their values are equal using the every method. If not, return false.
    console.log("Color iteration");

    let isEqual = true
    filteredColors1.forEach((key) => {
        if (filteredColors2.includes(key)) {
            if (checkColors1[key] === checkColors2[key]) {
                console.log(`${key} OK!`)
            } else {
                console.warn(`${key} was not the same in both colors!`)
                isEqual = false
            }
        } else {
            console.warn(`${key} was not included in colors!`)
            isEqual = false
        }
    });

    filteredProps1.forEach((key) => {
        if (filteredProps2.includes(key)) {
            if (checkProps1[key] === checkProps2[key]) {
                console.log(`${key} OK!`)
            } else {
                console.warn(`${key} was not the same in both properties!`)
                isEqual = false
            }
        } else {
            console.warn(`${key} was not included in properties!`)
            isEqual = false
        }
    });

    return isEqual
}

// Helper function to filter out keys with null or undefined values.
function getFilteredKeys(obj) {
    return Object.keys(obj).filter(key => obj[key] !== null && obj[key] !== undefined);
}

// Helper function to check if two arrays have the same length.
function hasSameLength(arr1, arr2) {
    return arr1.length === arr2.length;
}

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
        gainNode.gain.value = lerp(gainNode.gain.value, ((muted && cachedSettings.autoMute) || !cachedSettings.enabled || (shoppingMute && cachedSettings.muteShopping) || (mutedDueToFocus && cachedSettings.unfocusedMute) || cachedSettings.globalMute) ? 0 : Math.max(Math.min(l,1),0), clamp(delta*5,0,1));
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
let currentFirefoxProvidedTheme = {}

async function setFirefoxProvidedTheme(themeData) {
    if (themeData) {
        currentFirefoxProvidedTheme = themeData
    } else {
        await browser.theme.getCurrent().then(function(currentTheme) {
            currentFirefoxProvidedTheme = currentTheme
        })
        .catch(function(err) {
            console.warn(`[GXM] Failed to get theme! ${err}`)
            currentFirefoxProvidedTheme = {}
        });
    }
}
setFirefoxProvidedTheme()

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

let webModMatchCache = {} // store all match strings in here, so we won't bother checking for web mods if the url has no way of having any

async function refreshWebModCache(clear) {
    let modData = {}
    try {
        modData = await localforage.getItem(MOD_DATABASE_KEY);
        if (modData == null) {
            modData = {}
        }
    } catch (err) {
        console.log(err);
    }
    if (clear) {
        for (var member in webModMatchCache) delete webModMatchCache[member];
        webModMatchCache = {}
    }
    for (const [id, data] of Object.entries(modData)) {
        if (data.webMods) {
            for (const [webModIndex, webModData] of Object.entries(data.webMods)) {
                for (const urlPattern of webModData.matches) {
                    if (!(urlPattern in webModMatchCache)) {
                        webModMatchCache[urlPattern] = {}
                    }
                    if (!(id in webModMatchCache[urlPattern])) {
                        webModMatchCache[urlPattern][id] = []
                    }
                    webModMatchCache[urlPattern][id].push(webModIndex)
                }
            }
        }
    }
    modData = null;
}

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    return [ h, s, l ];
}

function hexToHSL(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);

    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max == min){
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        
        h /= 6;
    }

    h = Math.round(h*360);
    s = Math.round(s*100);
    l = Math.round(l*100);

    return { h, s, l };
}

function hexToRGB(hex) {
    var m = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    return {
        r: parseInt(m[1], 16),
        g: parseInt(m[2], 16),
        b: parseInt(m[3], 16)
    };
}

let componentToHex = (val) => {
    const a = Number(val).toString(16);
    //        ^^^^^^^^^^^
    return a.length === 1 ? "0" + a : a;
}
let rgbtohex = (rgb) => {
    return '#' + rgb
      .match(/\d+/g)
      .map(componentToHex)
      .join('');
}

function hslToHex(hsl) {
    let h = hsl.h
    let s = hsl.s
    let l = hsl.l
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function rgbaToRgb(rgba) {
    // Use a regular expression to extract the r, g, b, and a values
    const regex = /^rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*(\d*(?:\.\d+)?)?\)$/;
    const result = regex.exec(rgba);
    
    if (result) {
      const r = result[1];
      const g = result[2];
      const b = result[3];
      
      // Return the RGB string
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      throw new Error('Invalid RGBA format');
    }
}
function hslaToHsl(hsla) {
    // Use a regular expression to extract the h, s, l, and a values
    const regex = /^hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,?\s*(\d*(?:\.\d+)?)?\)$/;
    const result = regex.exec(hsla);
    
    if (result) {
      const h = result[1];
      const s = result[2];
      const l = result[3];
      
      // Return the HSL string
      return `hsl(${h}, ${s}%, ${l}%)`;
    } else {
      throw new Error('Invalid HSLA format');
    }
}

const toHSLObject = (hslStr) => {
    const [hue, saturation, lightness] = hslStr.match(/\d+/g).map(Number);
    return {h: hue,s: saturation,l: lightness };
};


var keywords_color_regex = /^[a-z]*$/;
var hex_color_regex = /^#[0-9a-f]{3}([0-9a-f]{3})?$/;
var hexa_color_regex = /#[a-f\d]{3}(?:[a-f\d]?|(?:[a-f\d]{3}(?:[a-f\d]{2})?)?)\b/;
var rgb_color_regex = /^rgb\(\s*(0|[1-9]\d?|1\d\d?|2[0-4]\d|25[0-5])%?\s*,\s*(0|[1-9]\d?|1\d\d?|2[0-4]\d|25[0-5])%?\s*,\s*(0|[1-9]\d?|1\d\d?|2[0-4]\d|25[0-5])%?\s*\)$/;
var rgba_color_regex = /^rgba\(\s*(0|[1-9]\d?|1\d\d?|2[0-4]\d|25[0-5])%?\s*,\s*(0|[1-9]\d?|1\d\d?|2[0-4]\d|25[0-5])%?\s*,\s*(0|[1-9]\d?|1\d\d?|2[0-4]\d|25[0-5])%?\s*,\s*((0.[1-9]+)|[01])\s*\)$/;
var hsl_color_regex = /^hsl[(]\s*0*(?:[12]?\d{1,2}|3(?:[0-5]\d|60))\s*(?:\s*,\s*0*(?:\d\d?(?:\.\d+)?\s*%|\.\d+\s*%|100(?:\.0*)?\s*%)){2}\s*[)]$/;
var hsla_color_regex = /^hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*(\d*(?:\.\d+)?)\)$/;

const detectColorFormat = (color) => {
    if (hex_color_regex.test(color)) {
        return 'HEX';
    } else if (hexa_color_regex.test(color)) {
        return 'HEXA';
    } else if (rgba_color_regex.test(color)) {
        return 'RGBA';
    } else if (hsla_color_regex.test(color)) {
        return 'HSLA';
    } else if (rgb_color_regex.test(color)) {
        return 'RGB';
    } else if (hsl_color_regex.test(color)) {
        return 'HSL';
    } else {
        return 'Unknown';
    }
};

function hexCoercion(colorString) {
    let useString = colorString
    //console.log(`${useString} is ${detectColorFormat(useString)}`);
    
    if (detectColorFormat(useString) == "RGBA") {
    //    console.log(`converting ${useString} to RGB`)
        useString = rgbaToRgb(useString)
    } else if (detectColorFormat(useString) == "HSLA") {
    //    console.log(`converting ${useString} to HSL`)
        useString = hslaToHsl(useString)
    } else if (detectColorFormat(useString) == "HEXA") {
    //    console.log(`converting ${useString} to HEX`)
        useString = useString.substring(0, 7)
    }

    //console.log(`${useString} has become ${detectColorFormat(useString)}`);

    if (detectColorFormat(useString) == "RGB") {
        //console.log(`converting ${useString} to HEX`)
        useString = rgbtohex(useString)
    } else if (detectColorFormat(useString) == "HSL") {
        //console.log(`converting ${useString} to HEX`)
        useString = hslToHex(toHSLObject(useString))
    }

    //console.log(`finally, ${useString} is now ${detectColorFormat(useString)}`);
    return useString
}

function pickTextColorBasedOnBgColorAdvanced(bgColor, lightColor, darkColor) {
    var color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
    var r = parseInt(color.substring(0, 2), 16); // hexToR
    var g = parseInt(color.substring(2, 4), 16); // hexToG
    var b = parseInt(color.substring(4, 6), 16); // hexToB
    var uicolors = [r / 255, g / 255, b / 255];
    var c = uicolors.map((col) => {
      if (col <= 0.03928) {
        return col / 12.92;
      }
      return Math.pow((col + 0.055) / 1.055, 2.4);
    });
    var L = (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2]);
    return (L > 0.179) ? darkColor : lightColor;
}

var colourIsLight = function (r, g, b) {
  
  // Counting the perceptive luminance
  // human eye favors green color... 
  var a = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  console.log(a);
  return (a < 0.5);
}

function getAccentCSS(accentColor, backgroundColor) {
    accentColor = hexCoercion(accentColor)
    backgroundColor = hexCoercion(backgroundColor)

    const accentRGB = hexToRGB(accentColor)
    const accentHSL = hexToHSL(accentColor)

    const backgroundRGB = hexToRGB(backgroundColor)
    const backgroundHSL = hexToHSL(backgroundColor)

    const contrastColor = colourIsLight(accentRGB.r, accentRGB.g, accentRGB.b, 1) ? "0" : "100" //pickTextColorBasedOnBgColorAdvanced(accentColor, "0", "100")

    const accentVars = `
        :root { 
            --opera-gx-accent-color: ${accentColor} !important;
            --opera-gx-background-color: ${backgroundColor} !important;

            --opera-gx-accent-color-r: ${accentRGB.r} !important;
            --opera-gx-accent-color-g: ${accentRGB.g} !important;
            --opera-gx-accent-color-b: ${accentRGB.b} !important;
            --opera-gx-accent-color-h: ${accentHSL.h} !important;
            --opera-gx-accent-color-s: ${accentHSL.s} !important;
            --opera-gx-accent-color-l: ${accentHSL.l} !important;

            --opera-gx-background-color-r: ${backgroundRGB.r} !important;
            --opera-gx-background-color-g: ${backgroundRGB.g} !important;
            --opera-gx-background-color-b: ${backgroundRGB.b} !important;
            --opera-gx-background-color-h: ${backgroundHSL.h} !important;
            --opera-gx-background-color-s: ${backgroundHSL.s} !important;
            --opera-gx-background-color-l: ${backgroundHSL.l} !important;

            --gx-accent-l-8: ${accentHSL.h}deg ${accentHSL.h}% 4.4% !important;
            --gx-accent-l-16: ${accentHSL.h}deg ${accentHSL.h}% 8.8% !important;
            --gx-accent-l-24: ${accentHSL.h}deg ${accentHSL.h}% 13.2% !important;
            --gx-accent-l-30: ${accentHSL.h}deg ${accentHSL.h}% 16.5% !important;
            --gx-accent-l-60: ${accentHSL.h}deg ${accentHSL.h}% 33% !important;
            --gx-accent-l-80: ${accentHSL.h}deg ${accentHSL.h}% 44% !important;
            --gx-accent-l-100: ${accentHSL.h}deg ${accentHSL.h}% 55% !important;
            --gx-accent-l-120: ${accentHSL.h}deg ${accentHSL.h}% 66% !important;
            --gx-accent-l-140: ${accentHSL.h}deg ${accentHSL.h}% 77% !important;
            --gx-accent-l-160: ${accentHSL.h}deg ${accentHSL.h}% 88% !important;
            --gx-no-00: ${backgroundHSL.h}deg ${backgroundHSL.s}% 0% !important;
            --gx-no-04: ${backgroundHSL.h}deg ${backgroundHSL.s}% 4% !important;
            --gx-no-08: ${backgroundHSL.h}deg ${backgroundHSL.s}% 8% !important;
            --gx-no-12: ${backgroundHSL.h}deg ${backgroundHSL.s}% 12% !important;
            --gx-no-16: ${backgroundHSL.h}deg ${backgroundHSL.s}% 16% !important;
            --gx-no-20: ${backgroundHSL.h}deg ${backgroundHSL.s}% 20% !important;
            --gx-no-24: ${backgroundHSL.h}deg ${backgroundHSL.s}% 24% !important;
            --gx-no-32: ${backgroundHSL.h}deg ${backgroundHSL.s}% 32% !important;
            --gx-no-40: ${backgroundHSL.h}deg ${backgroundHSL.s}% 40% !important;
            --gx-no-59: ${backgroundHSL.h}deg ${backgroundHSL.s}% 59% !important;
            --gx-no-77: ${backgroundHSL.h}deg ${backgroundHSL.s}% 77% !important;
            --gx-no-80: ${backgroundHSL.h}deg ${backgroundHSL.s}% 80% !important;
            --gx-no-88: ${backgroundHSL.h}deg ${backgroundHSL.s}% 88% !important;
            --gx-no-90: ${backgroundHSL.h}deg ${backgroundHSL.s}% 90% !important;
            --gx-no-92: ${backgroundHSL.h}deg ${backgroundHSL.s}% 92% !important;
            --gx-no-96: ${backgroundHSL.h}deg ${backgroundHSL.s}% 96% !important;
            --gx-no-98: ${backgroundHSL.h}deg ${backgroundHSL.s}% 98% !important;
            --gx-no-100: ${backgroundHSL.h}deg ${backgroundHSL.s}% 100% !important;

            --gx-accent-100-contrast: 0deg 0% ${contrastColor}% !important;
        }
    `;

    return accentVars
}

function injectAccents(accentColor, backgroundColor, tab) {
    let code = getAccentCSS(accentColor, backgroundColor)
    browser.tabs.insertCSS(
        tab.id,
        {
            cssOrigin: "user",
            code: accentVars,
            runAt: "document_start"
        }
    )
}

function removeAccents(accentColor, backgroundColor, tab) {
    let code = getAccentCSS(accentColor, backgroundColor)
    browser.tabs.removeCSS(
        tab.id,
        {
            cssOrigin: "user",
            code: accentVars,
        }
    )
}

async function updateAccentsForAllTabs(newThemeData) {
    let themeData = newThemeData
    if (!themeData) {
        console.log("getting current theme for accents")
        themeData = await browser.theme.getCurrent().then(function(currentTheme) {
            return currentTheme
        })
        .catch(function(err) {
            console.warn(`[GXM] Failed to get theme! ${err}`)
            return {}
        });
    }

    let accentColor = themeData.colors?.icons_attention ?? '#fa1e4e';
    let backgroundColor = themeData.colors?.toolbar ?? (getPreferredColorScheme() == "dark" ? '#121019' : '#f4f2f7');

    console.log("Sending accent colors!")
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
        if (!tab.id) continue;
        browser.tabs.sendMessage(tab.id, {
            accentColor: accentColor,
            backgroundColor: backgroundColor
        }).catch(function(err) {
            console.log(`${tab.id} no wanna: ${err}`);
        })
    }
    console.log("Done!")
}

async function updateWebModsForAllTabs(modId, webModIndex, enabled) {
    let modData = {}
    if (Object.keys(modData).length === 0) {
        try {
            modData = await localforage.getItem(MOD_DATABASE_KEY);
            if (modData == null) {
                modData = {}
            }
        } catch (err) {
            console.log(err);
            return false
        }
    }

    

    let modInfo = modData[modId]
    if (modInfo) {
        if (modInfo.webMods) {
            let webModData = modInfo.webMods[webModIndex]
            if (webModData) {
                for (const urlPattern of webModData.matches) {
                    browser.tabs.query({url: urlPattern}).then(async (tabs) => {
                        for (const tab of tabs) {
                            if (!tab.id) continue;
                            if (enabled) {
                                for (const cssBlob of webModData.css) {
                                    cssBlob.text().then((blobText) => {
                                        browser.tabs.insertCSS(
                                            tab.id,
                                            {
                                                cssOrigin: "user",
                                                code: blobText,
                                                runAt: "document_start"
                                            }
                                        )
                                    }, console.warn)
                                } 
                            } else {
                                for (const cssBlob of webModData.css) {
                                    cssBlob.text().then((blobText) => {
                                        browser.tabs.removeCSS(
                                            tab.id,
                                            {
                                                cssOrigin: "user",
                                                code: blobText,
                                            }
                                        )
                                    }, console.warn)
                                } 
                            }
                        }
                    })
                }
            } else {
                console.log(`[GXM] Can't update web mods for ${modId} because it had no web mod for index ${webModIndex}`)
            }  
        } else {
            console.log(`[GXM] Can't update web mods for ${modId} because it has no web mods`)
        }
    } else {
        console.log(`[GXM] Can't update web mods for ${modId} because it doesn't exist`)
    }
    return true
}


function generateThemeColors(accentHSL, secondaryHSL, type) {
    accentHSL = hexCoercion(accentHSL)
    secondaryHSL = hexCoercion(secondaryHSL)

    accentHSL = hexToHSL(accentHSL)
    secondaryHSL = hexToHSL(secondaryHSL) 

    // committing color crimes 😭

    const accentColor = hslToHex(accentHSL)
    const backgroundColor = hslToHex(secondaryHSL)

    let colorString = `hsl(${accentHSL.h}deg ${accentHSL.h}% 55%)`
    browser.browserAction.setBadgeBackgroundColor({ color: colorString });

    if (type === "dark") {
        return {
            icons: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 76.86}),
            icons_attention: accentColor,

            frame: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 3.7}),
            frame_inactive: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 5.1}),

            tab_line: accentColor,
            tab_loading: accentColor,
            tab_loading_inactive: accentColor,
            tab_selected: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 8.04}),
            tab_text: "#ffffff",
            tab_background_text: "#CCCCCC",

            toolbar: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 8.04}),
            toolbar_text: "#b3b3b3",
            toolbar_field: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 8.04}),
            toolbar_field_text: "#ffffff",
            toolbar_top_separator: accentColor,
            toolbar_bottom_separator: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 8.04}),
            toolbar_field_border: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 8.04}),
            toolbar_field_focus: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 16.08}),
            toolbar_field_border_focus: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 16.08}),
            toolbar_field_highlight: accentColor,
            toolbar_field_highlight_text: "#000000",
            toolbar_field_text_focus: "#e5e5e6",
            
            bookmark_text: "#d3d3d3",

            button_background_hover: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 21.96}),
            button_background_active: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 16.47}),
            
            ntp_background: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 8.04}),
            ntp_text: "#e5e5e6",
            ntp_card_background: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 14.31}),

            popup: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 12}),
            popup_text: "#e5e5e6",
            popup_border: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 33}),
            popup_highlight: accentColor,
            popup_highlight_text: "#000000",

            sidebar: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 8.04}),
            sidebar_text: "#d3d8db",
            sidebar_border: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 8.04}),
            sidebar_highlight: accentColor,
            sidebar_highlight_text: "#eaeaea"
        }
    } else {
        return {
            icons: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 24}),
            icons_attention: accentColor,

            frame: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 91.96}),
            frame_inactive: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 90}),

            tab_line: hslToHex({h: accentHSL.h, s: accentHSL.s, l: 45.88}),
            tab_loading: hslToHex({h: accentHSL.h, s: accentHSL.s, l: 54.9}),
            tab_loading_inactive: hslToHex({h: accentHSL.h, s: accentHSL.s, l: 54.9}),
            tab_selected: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 95.88}),
            tab_text: "#3a334f",
            tab_background_text: "#333333",

            toolbar: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 95.88}),
            toolbar_text: "#000000",
            toolbar_field: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 95.88}),
            toolbar_field_text: "#3a334f", // is this correct? or hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 25.49})?
            toolbar_top_separator: hslToHex({h: accentHSL.h, s: accentHSL.s, l: 48}),
            toolbar_bottom_separator: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 88.04}),
            toolbar_field_border: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 95.88}),
            toolbar_field_focus: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 98.04}),
            toolbar_field_border_focus: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 98.04}),
            toolbar_field_highlight: accentColor,
            toolbar_field_highlight_text: "#ffffff",
            toolbar_field_text_focus: "#3a334f", // is this correct? or hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 25.49})?

            bookmark_text: "#3a334f", // is this correct? or hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 25.49})?

            button_background_hover: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 84.9}),
            button_background_active: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 90}),
            
            ntp_background: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 92.94}),
            ntp_text: "#3a334f", // ditto
            ntp_card_background: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 87.45}),

            popup: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 98.04}),
            popup_text: "#3a334f",
            popup_border: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 80}),
            popup_highlight: hslToHex({h: accentHSL.h, s: accentHSL.s, l: 84}),
            popup_highlight_text: "#0a0a0a",

            sidebar: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 95.88}),
            sidebar_text: "#3a334f",
            sidebar_border: hslToHex({h: secondaryHSL.h, s: secondaryHSL.s, l: 95.88}),
            sidebar_highlight: hslToHex({h: accentHSL.h, s: accentHSL.s, l: 84}),
            sidebar_highlight_text: "#0a0a0a"
        }
    }
}

function isEmpty(obj) {
    for (const prop in obj) {
        if (Object.hasOwn(obj, prop)) {
        return false;
        }
    }

    return true;
}

function isEmptyObject(value) {
    if (value == null) {
      // null or undefined
      return false;
    }
  
    if (typeof value !== 'object') {
      // boolean, number, string, function, etc.
      return false;
    }
  
    const proto = Object.getPrototypeOf(value);
  
    // consider `Object.create(null)`, commonly used as a safe map
    // before `Map` support, an empty object as well as `{}`
    if (proto !== null && proto !== Object.prototype) {
      return false;
    }
  
    return isEmpty(value);
}

let lastTyped = 0
let currentTabFocused = true
let currentWindowId = 0
let currentTabId = 0
let lastUnfocused = 0

browser.tabs.query({ currentWindow: true, active: true }).then(function(tabs){
    if (tabs && tabs[0]) {
        currentTabId = tabs[0].id
    }
})

function sendSoundPlayLogEvent(type, event, currentTab) {
    let tabId = currentTab ? (currentTab.id ? currentTab.id.toString() : (currentTab.tabId ? currentTab.tabId.toString() : "(could not find ID)")) : "(No tab object)"
    let windowId = currentTab ? (currentTab.id ? currentTab.windowId.toString() : (currentTab.frameId ? ("frame " + currentTab.frameId.toString()) : "(could not find ID)")) : "(No tab object)"
    let tabFocused = currentTab ? currentTab.active : false

    let tabUrl = currentTab ? currentTab.url : "(No tab object)"

    addToLog(`${type} played via '${event}' event, from tab ${tabId} in window ${windowId}. Focused: ${tabFocused}`, `URL: ${tabUrl}`)
}

async function onExtensionMessage(message, sender) {
    if ((typeof message === 'object') && (message != null)) {
        if (message.intent == "getModState" && message.modId) {
            console.log('[GXM] getting mod state')
            let modData = {}
            try {
                modData = await localforage.getItem(MOD_DATABASE_KEY);
                if (modData == null) {
                    modData = {}
                }
                return modData[message.modId] ? modData[message.modId] : {}
            } catch (err) {
                console.log(err);
                return false
            }
            modData = null;
        } else if (message.intent == "tryWebMods") {
            console.log('[GXM] applying web mods if available')
            if (sender.tab) {
                let currentTab = sender.tab
                let modData = {}
                
                let useTheme = currentFirefoxProvidedTheme
                if (cTheme !== 'off') {
                    if (isEmptyObject(generatedThemeData)) {
                        let modTheme = modData[modId].theme[getPreferredColorScheme()]
                        let accent = modTheme.gx_accent
                        let background = modTheme.gx_secondary_base

                        let accent_string = `hsl(${accent.h}, ${accent.s}%, ${accent.l}%)`
                        let background_string = `hsl(${background.h}, ${background.s}%, ${background.l}%)`
                        console.log("Generating theme...")
                        let colorData = generateThemeColors(accent_string, background_string, getPreferredColorScheme())
                        const themeData = {
                            colors: colorData,
                            properties: {
                                color_scheme: getPreferredColorScheme()
                            }
                        }
                        generatedThemeData = themeData
                    }
                    useTheme = generatedThemeData
                }
                
                let accentColor = useTheme.colors?.icons_attention ?? '#fa1e4e';
                let backgroundColor = useTheme.colors?.toolbar ?? (getPreferredColorScheme() == "dark" ? '#121019' : '#f4f2f7');
                
                //injectAccents(accentColor, backgroundColor, currentTab)
                browser.tabs.sendMessage(currentTab.id, {
                    accentColor: accentColor,
                    backgroundColor: backgroundColor
                })
            

                for (const [urlPattern, validModData] of Object.entries(webModMatchCache)) {
                    let applied = false
                    let allowedMods = []
                    if (!applied) {
                        browser.tabs.query({url: urlPattern}).then(async (tabs) => {
                            isAble = tabs.find((x) => x.id === currentTab.id) !== undefined;
                            if (isAble) {
                                if (!applied) {
                                    applied = true
                                    allowedMods = validModData

                                    if (Object.keys(modData).length === 0) {
                                        try {
                                            modData = await localforage.getItem(MOD_DATABASE_KEY);
                                            if (modData == null) {
                                                modData = {}
                                            }
                                        } catch (err) {
                                            console.log(err);
                                            return false
                                        }
                                    }

                                    for (const [id, data] of Object.entries(modData)) {
                                        if (data.webMods) {
                                            if (allowedMods[id]) {
                                                for (const [webModIndex, webModData] of Object.entries(data.webMods)) {
                                                    if (allowedMods[id].includes(webModIndex)) {
                                                        if (webModData.enabled) {
                                                            console.log("Inserting CSS...")
                                                            for (const cssBlob of webModData.css) {
                                                                cssBlob.text().then((blobText) => {
                                                                    browser.tabs.insertCSS(
                                                                        currentTab.id,
                                                                        {
                                                                            cssOrigin: "user",
                                                                            code: blobText,
                                                                            runAt: "document_start"
                                                                        }
                                                                    )
                                                                }, console.warn)
                                                            } 
                                                        }
                                                    }
                                                }    
                                            }
                                        }
                                    }
                                }
                            }
                        }, console.warn)
                    }
                }
            }
            return true
        } else if (message.intent == "refreshWebModCache") {
            console.log('[GXM] refreshing web mod cache')
            refreshWebModCache(true)
            return true
        } else if (message.intent == "webModState" && message.modId && message.index && (message.state !== undefined)) {
            console.log('[GXM] Updating web mod toggle state')
            return updateWebModsForAllTabs(message.modId, message.index, message.state)
        } else if (message.intent == "buttonMessage" && message.modId && message.text) { 
            updateInstallerButtons(message.modId,message.text)
            return true;
        } else if (message.intent == "installMod" && message.modId && message.modContentUrl && message.modVersion) {
            console.log('[GXM] Installing mod',message.modId);
            let downloadedLayers = message.modLayers
            let downloadedKeyboardSounds = message.modKeyboardSounds
            let downloadedBrowserSounds = message.modBrowserSounds
            let downloadedWebMods = message.modPageStyles
            let downloadedTheme = message.modTheme
            let downloadedIcon = message.modIcon

            if (downloadedLayers.length > 0 || (Object.keys(downloadedKeyboardSounds).length > 0) || (Object.keys(downloadedBrowserSounds).length > 0) || (Object.keys(downloadedWebMods).length > 0) || (Object.keys(downloadedTheme).length > 0)) {
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
                        webMods: ((Object.keys(downloadedWebMods).length > 0) ? downloadedWebMods : null),
                        theme: ((Object.keys(downloadedTheme).length > 0) ? downloadedTheme : null),
                        version: (message.modVersion ? message.modVersion : "unknown"),
                        storePage: (message.modStorePage ? message.modStorePage : null),
                        icon: (downloadedIcon ? downloadedIcon : null)
                    }

                    try {
                        let resultToSendBack = await localforage.setItem(MOD_DATABASE_KEY, previousData).then(function(value) {
                            console.log("Saved successfully")
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
                            if (previousData[message.modId].theme) {
                                if (addedContent == "Nothing! ..wait, what?") {
                                    addedContent = ""
                                }
                                if (addedContent != "") {
                                    addedContent += ", "
                                }
                                addedContent += "Browser Theme"
                            }
                            if (previousData[message.modId].webMods) {
                                if (addedContent == "Nothing! ..wait, what?") {
                                    addedContent = ""
                                }
                                if (addedContent != "") {
                                    addedContent += ", "
                                }
                                addedContent += "Web Mods"

                                for (const [webModIndex, webModData] of Object.entries(previousData[message.modId].webMods)) {
                                    for (const urlPattern of webModData.matches) {
                                        if (!(urlPattern in webModMatchCache)) {
                                            webModMatchCache[urlPattern] = {}
                                        }
                                        if (!(message.modId in webModMatchCache[urlPattern])) {
                                            webModMatchCache[urlPattern][message.modId] = []
                                        }
                                        webModMatchCache[urlPattern][message.modId].push(webModIndex)
                                    }

                                    updateWebModsForAllTabs(message.modId, webModIndex, webModData.enabled)
                                }
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
                        console.log(err);
                        return {
                            succeeded: false,
                            error: "Failed to write to disk."
                        }
                    }
                } catch (err) {
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
        } else if (message.intent == "exportLog" && message.redact !== null && message.redact !== undefined) {
            let browserInfo = await browser.runtime.getBrowserInfo()
            let newLogString = `GX Mods ${browser.runtime.getManifest().version}\n${browserInfo.vendor} ${browserInfo.name} ${browserInfo.version} (Build ${browserInfo.buildID})\nLog usage: ${debugLogging.length}/${LOGGING_MAX_LENGTH} events\n\n`
            debugLogging.forEach(function(data, index) {
                newLogString += `[${data.time.toUTCString()}] // ${data.message}. ${!message.redact ? data.sensitive : ""}${index < debugLogging.length-1 ? "\n" : ""}`
            });
            return newLogString
        } else {
            console.log('[GXM] unknown object received');
            console.log(message);
        }
        return false;
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
    } else if (message.startsWith('themechange_')) {
        var newTheme = message.replace("themechange_","")
        if (newTheme == cTheme) return;
        return loadTheme(newTheme)
    } else if (message.startsWith('schemechange_')) {
        var newScheme = message.replace("schemechange_","")
        if (newScheme == "dark" || newScheme == "light") {
            cachedSettings.lightTheme = (newScheme == "light")
            return loadTheme(cTheme)
        } else {
            return false
        }
    } else if (message.startsWith('debug_logenabled_')) {
        loggingEnabled = message.endsWith('true')
        console.warn(`Log enabled changed: ${loggingEnabled}`)
        return true
    } else if (message.startsWith('isdebuglogenabled')) {
        return loggingEnabled
    } else if (message.startsWith('cleardebuglogs')) {
        debugLogging.length = 0
        console.warn("Debug logs have been cleared")
        return true
    } else if (message.startsWith('mousehover')) {
        if (cachedSettings.sfxHovers) {
            SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
            playSound(currentBrowserSounds.HOVER ? currentBrowserSounds.HOVER : [], SFXGainNode);
        }
        return true
    } else if (message.startsWith('mouse')) {
        level += 2.5;
    } else if (message.startsWith('volumeChange=')) {
        var newVolume = message.replace("volumeChange=","")
        cachedSettings.volume = Number(newVolume)
        return true
    } else if (message.startsWith('SFXvolumeChange=')) {
        var newVolume = message.replace("SFXvolumeChange=","")
        cachedSettings.sfxVolume = Number(newVolume)
        return true
    } else if (message.startsWith('KeyboardvolumeChange=')) {
        var newVolume = message.replace("KeyboardvolumeChange=","")
        cachedSettings.keyboardVolume = Number(newVolume)
        return true
    } else if (message.startsWith('spacedown')) {
        if (cachedSettings.sfxKeyboard) {
            KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
            playSound(currentKeyboardSounds.TYPING_SPACE ? currentKeyboardSounds.TYPING_SPACE : [], KeyboardGainNode);
            sendSoundPlayLogEvent("TYPING_SPACE","spacedown",sender.tab)
        }
        level += 1;
        lastTyped = Date.now();
    } else if (message.startsWith('bkspdown')) {
        if (cachedSettings.sfxKeyboard) {
            KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
            playSound(currentKeyboardSounds.TYPING_BACKSPACE ? currentKeyboardSounds.TYPING_BACKSPACE : [], KeyboardGainNode);
            sendSoundPlayLogEvent("TYPING_BACKSPACE","bkspdown",sender.tab)
        }
        level += 1;
        lastTyped = Date.now();
    } else if (message.startsWith('enterdown')) {
        if (cachedSettings.sfxKeyboard) {
            KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
            playSound(currentKeyboardSounds.TYPING_ENTER ? currentKeyboardSounds.TYPING_ENTER : [], KeyboardGainNode);
            sendSoundPlayLogEvent("TYPING_ENTER","enterdown",sender.tab)
        }
        level += 1;
        lastTyped = Date.now();
    } else if (message.startsWith('keydown_silent')) {
        level += 1;
        lastTyped = Date.now();
    } else if (message.startsWith('keydown')) {
        if (cachedSettings.sfxKeyboard) {
            KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
            playSound(currentKeyboardSounds.TYPING_LETTER ? currentKeyboardSounds.TYPING_LETTER : [], KeyboardGainNode);
            sendSoundPlayLogEvent("TYPING_LETTER","keydown",sender.tab)
        }
        level += 1;
        lastTyped = Date.now();
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
            })
        },100);
    } else if (message.startsWith('focus=')) {
        if (sender.tab) {
            let currentTab = sender.tab
            if (currentTab.windowId == currentWindowId) {
                if (currentTab.active) {
                    var newFocus = message.replace("focus=","")
                    currentTabFocused = newFocus == "true"
                    currentTabId = currentTab.id
                    if (newFocus != "true") {
                        lastUnfocused = Date.now()
                    }
                }
            }
        }
    } else {
        console.log("[GXM] weird message received:",message)     
    }
    updateLevels()
    return false
}

browser.runtime.onMessage.addListener(onExtensionMessage);

let navigatedYet = true
async function checkTabAudible(tabId, changeInfo, tabInfo) {
    if (tabId) {
        if ((!currentTabFocused) && (currentTabId == tabId) && (changeInfo.status) && (changeInfo.status === "loading")) {
            if (!navigatedYet) {
                if (cachedSettings.sfxKeyboard && cachedSettings.sfxAddressBar && cachedSettings.consentedToProxy) {
                    navigatedYet = true
                    KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
                    playSound(currentKeyboardSounds.TYPING_ENTER ? currentKeyboardSounds.TYPING_ENTER : [], KeyboardGainNode);
                    sendSoundPlayLogEvent("TYPING_ENTER","checkTabAudible",sender.tab)
                    level += 1;
                    playSoundsTimer = Date.now();
                }
            }
        }
    }

    var tabs = await browser.tabs.query({audible: true, muted: false})
    muted = tabs.length
}
browser.tabs.onUpdated.addListener(checkTabAudible)

function tabAdded() {
    if (cachedSettings.sfxTabs) {
        SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
        playSound(currentBrowserSounds.TAB_INSERT ? currentBrowserSounds.TAB_INSERT : [], SFXGainNode);
    }
    level += 10;
    updateLevels()

    browser.tabs.query({ currentWindow: true, active: true }).then(function(tabs){
        if (tabs && tabs[0] && tabs[0].url.includes("about:")) {
            currentTabFocused = false
            currentTabId = tabs[0].id
            lastUnfocused = Date.now()
        }
    })
}

browser.tabs.onCreated.addListener(tabAdded)
browser.tabs.onAttached.addListener(tabAdded)

browser.tabs.onRemoved.addListener((tab, removeInfo) => {
    if (!removeInfo.isWindowClosing) {
        if (cachedSettings.sfxTabs) {
            SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
            playSound(currentBrowserSounds.TAB_CLOSE ? currentBrowserSounds.TAB_CLOSE : [], SFXGainNode);
        }
    }

    browser.tabs.query({ currentWindow: true, active: true }).then(function(tabs){
        if (tabs && tabs[0] && tabs[0].url.includes("about:")) {
            currentTabFocused = false
            currentTabId = tabs[0].id
            lastUnfocused = Date.now()
        }
    })
    checkTabAudible()
})

function handleActivated(activeInfo) {
    if (activeInfo.windowId == currentWindowId) {
        browser.tabs.query({ currentWindow: true, active: true }).then(function(tabs){
            if (tabs && tabs[0] && tabs[0].url.includes("about:")) {
                currentTabFocused = false
                currentTabId = tabs[0].id
            }
        })
    }
}
  
browser.tabs.onActivated.addListener(handleActivated);
  

if (typeof browser.windows !== "undefined") {
    browser.windows.onRemoved.addListener((windowId) => {
        if (cachedSettings.sfxTabs) {
            SFXGainNode.gain.value = (cachedSettings.sfxVolume/100);
            playSound(currentBrowserSounds.TAB_CLOSE ? currentBrowserSounds.TAB_CLOSE : [], SFXGainNode);
        }
        checkTabAudible()
    });

    browser.windows.onFocusChanged.addListener((windowId) => {
        currentWindowId = windowId
        mutedDueToFocus = (windowId == browser.windows.WINDOW_ID_NONE)
    }); 

    browser.windows.getCurrent().then(function(currentWindow) {
        currentWindowId = currentWindow.id
    })
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
         if (cachedSettings.download) {
            level += 15;
            updateLevels()
        }
    }
}
  
browser.downloads.onChanged.addListener(handleChanged);

checkTabAudible();
setTimeout(checkTabAudible,10000);

async function parse(file) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    const result = await new Promise((resolve, reject) => {
        reader.onload = function(event) {
            console.log("Loaded")
            resolve(reader.result)
        }
    })
    return result
}

function isIterable(obj) {
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

    MasterGainNode = null

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

            console.log("parsing")
            let arrayBuffer = await parse(blob)
            console.log("buffering")
            const soundBuffer = await audioContext.decodeAudioData(arrayBuffer);
            if (soundBuffer) {
                const sourceNode = audioContext.createBufferSource();
                sourceNode.buffer = soundBuffer;
                sourceNode.loop = true;
                
                const gainNode = audioContext.createGain();
                gainNode.gain.value = 0.0;
                
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
                gainNode.gain.value = 0.0;
                
                sourceNode.connect(gainNode);
                gainNode.connect(MasterGainNode);

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
    const startTime = audioContext.currentTime + 0.1;

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

    const hasSearchPermission = (cachedSettings.consentedToProxy && cachedSettings.sfxAddressBar && await browser.permissions.contains(addressBarPermissions))
    if (hasSearchPermission) {
        if (addressBarPermissions.permissions.includes("search")) {
            browser.search.get().then(
                function(result) {
                    result.sort(function(a, b) {
                        if (a.isDefault) {
                            return -1
                        } else {
                            return 0
                        }
                    })
                    searchEngines = result
                    console.log("Search engines fetched.")
                    console.log(searchEngines)
                }
            )
        }
    }

    return true
}

async function getPreferredColorScheme() {
    if (cachedSettings.lightTheme !== null) {
        return cachedSettings.lightTheme ? "light" : "dark"
    }

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

function getPreferredColorSchemeFast() {
    if (cachedSettings.lightTheme !== null) {
        return cachedSettings.lightTheme ? "light" : "dark"
    }

    if (window.matchMedia) {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        } else {
            return 'light';
        }
    }
    return 'light';
}

let lastColorScheme = getPreferredColorSchemeFast();

const imageUrlToBase64 = async (url) => {
    console.log("Fetching")
    const data = await fetch(url);
    console.log("Blobbing")
    const blob = await data.blob();
    console.log("Loading")
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            console.log("Loaded base64!")
            const base64data = reader.result;
            resolve(base64data);
        };
        reader.onerror = reject;
    });
};

/**
 * converts a base64 image string to base64 png using the domUrl
 * @param {string} stringToConvert the svg/gif
 * @param {number} [margin=0] the width of the border - the image size will be height+margin by width+margin
 * @param {string} [fill] optionally backgrund canvas fill
 * @return {Promise} a promise to the bas64 png image
 */
var base64ToPng = function (stringToConvert, margin, fill) {
    return new Promise(function(resolve, reject) {
        try {
            // can use the domUrl function from the browser
            var domUrl = window.URL || window.webkitURL || window;
            if (!domUrl) {
                throw new Error("(browser doesnt support this)")
            }
            
            // figure out the height and width from svg text
            var match = stringToConvert.match(/height=\"(\d+)/m);
            var height = match && match[1] ? parseInt(match[1],10) : 256;
            var match = stringToConvert.match(/width=\"(\d+)/m);
            var width = match && match[1] ? parseInt(match[1],10) : 256;
            margin = margin || 0;

            console.log("Creating canvas")
            // create a canvas element to pass through
            var canvas = document.createElement("canvas");
            canvas.width = height+margin*2;
            canvas.height = width+margin*2;
            var ctx = canvas.getContext("2d");

            // create a new image to hold it the converted type
            var img = new Image;
            img.loading = "eager";

            console.log("Creating image and waiting for load")
            // when the image is loaded we can get it as base64 url

            function finish(obj) {
                console.log("Image loaded!")
                // draw it to the canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(obj, margin, margin);
                
                // if it needs some styling, we need a new canvas
                if (fill) {
                    console.log("Filling")
                    var styled = document.createElement("canvas");
                    styled.width = canvas.width;
                    styled.height = canvas.height;
                    var styledCtx = styled.getContext("2d");
                    styledCtx.save();
                    styledCtx.fillStyle = fill;   
                    styledCtx.fillRect(0,0,canvas.width,canvas.height);
                    styledCtx.strokeRect(0,0,canvas.width,canvas.height);
                    styledCtx.restore();
                    styledCtx.drawImage (canvas, 0,0);
                    canvas = styled;
                }
                resolve(canvas.toDataURL());
            }

            // load the image
            console.log("Triggering load")
            img.src = stringToConvert;

            if(img.complete){
                // do the work
                console.log("Already loaded, great!")
                finish(img)
            } else {
                console.log("Waiting for loading to finish")
                img.onload = () => {
                    // do the work
                    finish(img)
                }
            }
            
        } catch (err) {
            reject('failed to convert string to png ' + err);
        }
    });
};

let loadedBefore = false
var base64regex = /^data:[\w\/\+]+;base64,[a-zA-Z0-9\/+=]+/;
var isGifRegex = /^data:image\/gif;base64,[A-Za-z0-9+/]+={0,2}$/;
var isSVGRegex = /^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+={0,2}$/;
var needsConversionBase64Regex = /^data:image\/(svg\+xml|gif);base64,[A-Za-z0-9+/]+={0,2}$/;

async function loadFirefoxTheme() {
    console.log("Loading Firefox Theme")
    console.log(currentFirefoxProvidedTheme)
    let gifCompatibilityWarning = false
    let svgCompatibilityWarning = false
    if (currentFirefoxProvidedTheme.images) { // the fact that i have to do any of this is so annoying
        if (currentFirefoxProvidedTheme.images.theme_frame) {
            let isBase64 = currentFirefoxProvidedTheme.images.theme_frame.startsWith("data:")
            if (!isBase64) {
                console.log("Converting theme frame to base64");
                const base64 = await imageUrlToBase64(currentFirefoxProvidedTheme.images.theme_frame).catch((err) => {
                    console.warn(`CONVERSION FAILED: ${err}`);
                    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; // transparent pixel
                });
                currentFirefoxProvidedTheme.images.theme_frame = base64
            }

            if (needsConversionBase64Regex.test(currentFirefoxProvidedTheme.images.theme_frame)) { // even though firefox supports SVG/GIF in the theme it doesn't allow it to be used in theme.update for whatever reason
                console.log("Non-compatible base64 detected, converting theme frame to PNG")
                if (isGifRegex.test(currentFirefoxProvidedTheme.images.theme_frame)) {
                    gifCompatibilityWarning = true
                } else if (isSVGRegex.test(currentFirefoxProvidedTheme.images.theme_frame)) {
                    svgCompatibilityWarning = true
                }

                let png64 = await base64ToPng(currentFirefoxProvidedTheme.images.theme_frame)
                currentFirefoxProvidedTheme.images.theme_frame = png64
                console.log("Conversion complete")
            }
        }
        if (currentFirefoxProvidedTheme.images.header_url) { // this is undocumented ???
            let isBase64 = currentFirefoxProvidedTheme.images.header_url.startsWith("data:") //base64regex.test(currentFirefoxProvidedTheme.images.header_url)
            if (!isBase64) {
                console.log("Converting header url to base64")
                const base64 = await imageUrlToBase64(currentFirefoxProvidedTheme.images.header_url).catch((err) => {
                    console.warn(`CONVERSION FAILED: ${err}`);
                    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; // transparent pixel
                });
                currentFirefoxProvidedTheme.images.header_url = base64
            }

            if (needsConversionBase64Regex.test(currentFirefoxProvidedTheme.images.header_url)) { // even though firefox supports SVG/GIF in the theme it doesn't allow it to be used in theme.update for whatever reason
                console.log("Non-compatible base64 detected, converting header url to PNG")
                if (isGifRegex.test(currentFirefoxProvidedTheme.images.header_url)) {
                    gifCompatibilityWarning = true
                } else if (isSVGRegex.test(currentFirefoxProvidedTheme.images.header_url)) {
                    svgCompatibilityWarning = true
                }

                let png64 = await base64ToPng(currentFirefoxProvidedTheme.images.header_url)
                currentFirefoxProvidedTheme.images.header_url = png64
                console.log("Conversion complete")
            }
        }
        if (currentFirefoxProvidedTheme.images.additional_backgrounds) {
            let newArray = []
            for (const url of currentFirefoxProvidedTheme.images.additional_backgrounds) {
                let isBase64 = url.startsWith("data:")
                if (!isBase64 || !needsConversionBase64Regex.test(url)) {
                    let base64 = url
                    if (!isBase64) {
                        console.log(`Converting ${url} to base64`)
                        base64 = await imageUrlToBase64(url).catch((err) => {
                            console.warn(`CONVERSION FAILED: ${err}`);
                            return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; // transparent pixel
                        });
                    }
                    
                    if (needsConversionBase64Regex.test(base64)) { // even though firefox supports SVG/GIF in the theme it doesn't allow it to be used in theme.update for whatever reason
                        console.log("Non-compatible base64 detected, converting to PNG")
                        if (isGifRegex.test(base64)) {
                            gifCompatibilityWarning = true
                        } else if (isSVGRegex.test(base64)) {
                            svgCompatibilityWarning = true
                        }

                        let png64 = await base64ToPng(base64)
                        base64 = png64
                        console.log("Conversion complete")
                    }
                    newArray.push(base64)
                } else {
                    newArray.push(url)
                }
            }
            currentFirefoxProvidedTheme.images.additional_backgrounds = newArray
        }
    }

    if (gifCompatibilityWarning) {
        browser.notifications.create({
            type: "basic",
            iconUrl: browser.runtime.getURL("icons/gxm_large_outline.png"),
            title: "Theme can't be fully restored",
            message: `A GIF was detected in your Firefox theme. You may need to re-apply the theme from the Firefox settings if the theme is missing animation.`,
        });
    } else if (svgCompatibilityWarning) {
        browser.notifications.create({
            type: "basic",
            iconUrl: browser.runtime.getURL("icons/gxm_large_outline.png"),
            title: "Theme may look incorrect",
            message: `An SVG was detected in your Firefox theme. You may need to re-apply the theme from the Firefox settings if the theme looks incorrect.`,
        });
    } // i try my best but you can only go so far when you're only allowed PNGs and JPGs in the api for some reason
    await browser.theme.update(currentFirefoxProvidedTheme);
    return true
}


async function loadTheme(modId) {
    cTheme = modId
    if (modId == 'off') {
        if (loadedBefore) {
            if (Object.keys(currentFirefoxProvidedTheme).length > 0) {
                loadFirefoxTheme()
            } else {
                browser.theme.reset(); // FIREFOX PLEASE FIX THIS FUNCTION ALREADY 😭
            }
        }
        return console.log("[GXM] Theme is off");
    }
    loadedBefore = true
    let modData = {}
    try {
        modData = await localforage.getItem(MOD_DATABASE_KEY);
        if (modData == null) {
            modData = {}
        }
    } catch (err) {
        console.log(err);
    }

    let preferredColorScheme = await getPreferredColorScheme()
    if (modData[modId]) {
        if (modData[modId].theme) {
            console.log(`User prefers ${preferredColorScheme} mode`)
            let modTheme = modData[modId].theme[preferredColorScheme]
            let accent = modTheme.gx_accent
            let background = modTheme.gx_secondary_base

            let accent_string = `hsl(${accent.h}, ${accent.s}%, ${accent.l}%)`
            let background_string = `hsl(${background.h}, ${background.s}%, ${background.l}%)`
            console.log("Generating theme...")
            let colorData = generateThemeColors(accent_string, background_string, preferredColorScheme)
            const themeData = {
                colors: colorData,
                properties: {
                    color_scheme: preferredColorScheme
                }
            }
            generatedThemeData = themeData
            console.log("Updating")
            browser.theme.update(themeData)
            updateAccentsForAllTabs(themeData)
        } else {
            console.warn(`[GXM] Mod ${modId} has no theme data!`)
        }
    } else {
        console.warn(`[GXM] Mod ${modId} does not exist!`)
    }

    console.log("[GXM] Theme loaded.")
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
        cachedSettings.sfxAddressBar = (typeof result.sfxAddressBar == "undefined") ? false : result.sfxAddressBar;
        cachedSettings.keyboardVolume = (typeof result.keyboardVolume == "undefined") ? 50 : result.keyboardVolume;

        cachedSettings.lightTheme = (typeof result.lightTheme == "undefined") ? ((await getPreferredColorScheme() === "light") || false) : result.lightTheme;
        lastColorScheme = (cachedSettings.lightTheme ? "light" : "dark")

        cachedSettings.muteShopping = (typeof result.muteShopping == "undefined") ? false : result.muteShopping;
        
        cachedSettings.sfxLinks = (typeof result.sfxLinks == "undefined") ? false : result.sfxLinks;
        cachedSettings.sfxAltSwitch = (typeof result.sfxAltSwitch == "undefined") ? false : result.sfxAltSwitch;

        cachedSettings.consentedToJSD = (typeof result.consentedToJSD == "undefined") ? false : result.consentedToJSD;
        cachedSettings.consentedToProxy = (typeof result.consentedToProxy == "undefined") ? false : result.consentedToProxy;

        cachedSettings.globalMutePersist = (typeof result.globalMutePersist == "undefined") ? false : result.globalMutePersist;
        cachedSettings.globalMute = (typeof result.globalMute == "undefined" || (!cachedSettings.globalMutePersist)) ? false : result.globalMute;

        if (result.consentedToJSD && result.shoppingMute) {
            initShoppingMutes()
        }

        if (result.consentedToProxy && result.sfxAddressBar) {
            initAddressBarListener()
        }

        if ((result.globalMute !== cachedSettings.globalMute) && !cachedSettings.globalMutePersist) {
            browser.storage.local.set({
                globalMute: false
            });
        }

        loadSounds(result.trackName || 'off')
        loadKeyboardSounds(result.keyboardName || 'off')
        loadBrowserSounds(result.sfxName || 'off')
        loadTheme(result.themeName || 'off')

        browser.browserAction.setBadgeText({text: (cachedSettings.globalMute == true ? "off" : "")})
    },
    function(error) {
        console.log(`Error while enabling the initial track! ${error}`);
    }
);

function updateSettings(changes) {
    console.log("Settings were updated, caching changes")
    const changedItems = Object.keys(changes);

    for (const item of changedItems) {
        if (cachedSettings.hasOwnProperty(item)) {
            cachedSettings[item] = changes[item].newValue;

            if (item == "sfxAddressBar" || item == "consentedToProxy") {
                if (changes[item].newValue == true) {
                    initAddressBarListener()
                }
            } else if (item == "globalMute") {
                browser.browserAction.setBadgeText({text: (changes[item].newValue == true ? "off" : "")})
            }
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
                if (currentURL.host && (currentURL.host != "")) {
                    var regEx = new RegExp(`^${currentURL.host.replace(".","\.")}$`,"gm");
                    var regEx2 = new RegExp(`^${currentURL.host.replace("www.","").replace(".","\.")}$`,"gm");
                    let tryMatch1 = (shoppingListCache.match(regEx))
                    let tryMatch2 = (shoppingListCache.match(regEx2))
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

browser.runtime.onSuspend.addListener(async function () {
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
    await loadFirefoxTheme()
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

    sounds = [];
    sourceNodes = [];
    gainNodes = [];
    
    loadSounds(cTrack || 'off')
    loadKeyboardSounds(cKeyboard || 'off')
    loadBrowserSounds(cSounds || 'off')
    loadTheme(cTheme || 'off')

    console.log("[GXM] we back")
})
refreshWebModCache()

const commandFunctions = {
    "background-music": function() {
        browser.storage.local.set({
            enabled: !cachedSettings.enabled
        })
    },
    "keyboard-sounds": function() {
        browser.storage.local.set({
            sfxKeyboard: !cachedSettings.sfxKeyboard
        })
    },
    "bgm-automute": function() {
        browser.storage.local.set({
            autoMute: !cachedSettings.autoMute
        })
    },
    "gxm-mute": function() {
        browser.storage.local.set({
            globalMute: !cachedSettings.globalMute
        })
    },
    "mod-manager": function() {
        browser.runtime.openOptionsPage()
    }
}

browser.commands.onCommand.addListener((command) => {
    if (commandFunctions[command]) {
        console.log(`Running command ${command}`)
        commandFunctions[command]()
        console.log(`${command} executed`)
    } else {
        console.warn(`Unknown command ${command}`)
    }
});

async function handleUpdated(updateInfo) {
    if (updateInfo.theme.colors) {
        let currentTheme = updateInfo.theme
        console.log("The theme was changed...")

        let modData = {}
        let currentAppliedTheme = {}
        try {
            modData = await localforage.getItem(MOD_DATABASE_KEY);
            if (modData == null) {
                modData = {}
            }
        } catch (err) {
            console.log(err);
        }

        if (cTheme == 'off') {
            console.log("Theme changed to off")
        } else if (modData[cTheme]) {
            console.log(`Going to try to generate ${cTheme}`)
            if (modData[cTheme].theme) {
                let preferredColorScheme = getPreferredColorSchemeFast()
                let modTheme = modData[cTheme].theme[preferredColorScheme]
                let accent = modTheme.gx_accent
                let background = modTheme.gx_secondary_base

                let accent_string = `hsl(${accent.h}, ${accent.s}%, ${accent.l}%)`
                let background_string = `hsl(${background.h}, ${background.s}%, ${background.l}%)`
                console.log("Generating")
                let colorData = generateThemeColors(accent_string, background_string, preferredColorScheme)
                const themeData = {
                    colors: colorData,
                    properties: {
                        color_scheme: preferredColorScheme
                    }
                }
                currentAppliedTheme = themeData
                console.log("Generated")
                console.log(currentAppliedTheme)
                console.log("Continuing on...")
            } else {
                console.warn(`[GXM] Mod ${cTheme} has no theme data!`)
            }
        } else {
            console.warn(`[GXM] Mod ${cTheme} does not exist!`)
        }

        console.log("Checking theme similarity")

        let modThemeIsSame = compareThemes(generatedThemeData, currentAppliedTheme)
        console.log(generatedThemeData)
        console.log(currentAppliedTheme)
        console.log(`Mod theme is the same: ${modThemeIsSame}`)
        if (!modThemeIsSame) { // if the last theme is not the same as the current theme then the user likely switched mods
            if (Object.keys(currentAppliedTheme).length > 0) { // if mod theme is on
                console.log("The current GXM theme was changed!")
            } else { // if mod theme is off
                console.log("The GXM theme was disabled")
                generatedThemeData = {}
                if (Object.keys(currentFirefoxProvidedTheme).length > 0) {
                    console.log("Attempting to revert back to firefox theme");
                    loadFirefoxTheme()
                } else {
                    console.log("Resetting theme");
                    browser.theme.reset();
                } // revert to firefox theme
            }
        } else { // if the last theme is the same as the current theme then the user might have switched firefox themes
            console.log("The Firefox theme may have changed...")
            let themeIsSameAsFirefoxTheme = compareThemes(currentTheme, currentFirefoxProvidedTheme)
            let themeIsSameAsGXMThemeImmediate = compareThemes(currentTheme, currentAppliedTheme)
            let themeIsSameAsGXMThemePrevious = compareThemes(currentTheme, generatedThemeData)

            console.log(`Theme is same as: Firefox - ${themeIsSameAsFirefoxTheme} / GXM (Now) - ${themeIsSameAsGXMThemeImmediate} / GXM (On Theme Apply) - ${themeIsSameAsGXMThemePrevious}`);
            console.log(currentFirefoxProvidedTheme);
            console.log(currentAppliedTheme);
            console.log(generatedThemeData);
            
            if (!(themeIsSameAsFirefoxTheme || themeIsSameAsGXMThemeImmediate || themeIsSameAsGXMThemePrevious)) { // yep, they did
                console.log("It did change! Saving changes...")
                setFirefoxProvidedTheme(updateInfo.theme); // save this new theme
                if (cTheme !== 'off') {
                    loadTheme(cTheme) // revert back to GXM theme
                    if (lastColorScheme === (getPreferredColorSchemeFast())) {
                        browser.notifications.create({
                            type: "basic",
                            iconUrl: browser.runtime.getURL("icons/gxm_large_outline.png"),
                            title: "Did you mean to change themes?",
                            message: `A mod is currently overriding your Firefox theme. To use your Firefox theme, open the GXM settings panel and set your theme to "Firefox".`,
                        });
                    } else {
                        console.log("This was likely a dark/light preference change)")
                    }
                }
            } else { // It didn't change (triggers when dark/light is switched)
                console.log("It didn't change (likely dark/light preference change)")
            }
        }
    } else {
      console.log(`Theme was removed`);
      //generatedThemeData = {}
      //setFirefoxProvidedTheme()
    }
    lastColorScheme = getPreferredColorSchemeFast()
    updateAccentsForAllTabs()
    console.log("Theme update complete")
}
  
browser.theme.onUpdated.addListener(handleUpdated);

let lastLength = 0
let lastMove = ""
let lastURL = null
let lastSubdomain = null
let playSoundsTimer = null

let blacklistedSubdomains = [ // best-effort attempt to make possible "tracking" subdomains not trigger address bar sounds
    "version",
    "update",
    "check",
    "analytic",
    "data",
    "stat",
    "metric",
    "insight",
    "report",
    "tracking",
    "monitor",
    "logs",
    "dashboard",
    "event",
    "performance",
    "usage",
    "app",
    "seo",
    "click",
    "visit",
    "conversion",
    "heatmap",
    "realtime",
    "session",
    "behavior",
    "visitor",
    "engagement",
    "audience",
    "improving",
    "traffic",
    "activity",
    "analysis"
]

const TIMER_LENGTH = 500

function shouldPlayAddressBarSound(requestInfo) {
    let fromBrowser = ((requestInfo.originUrl === undefined) && (requestInfo.documentUrl === undefined) && (requestInfo.type === "xmlhttprequest" || requestInfo.type === "main_frame") && (requestInfo.method === "GET"))
    
    if (cachedSettings.sfxKeyboard && cachedSettings.sfxAddressBar) {
        if (((Date.now() - lastTyped) > 100) && ((Date.now() - lastUnfocused) > 85)) {
            let match = false
            let hostMatch = false
            let hasNavigated = false

            let urlData = new URL(requestInfo.url)
            let hostname = urlData.hostname.toLowerCase()

            for (const engine of searchEngines) {
                let fromCorrectHost = hostname.includes(engine.name.toLowerCase().split(" ")[0])
                if (fromCorrectHost) {
                    hostMatch = true;
                    let hasSearchQuery = urlData.search || requestInfo.url.includes("?q=") || requestInfo.url.includes("&q=") || requestInfo.url.includes("?query=") || requestInfo.url.includes("&query=") || requestInfo.url.includes("?s=") || requestInfo.url.includes("&s=") || requestInfo.url.includes("?search=") || requestInfo.url.includes("&search=")
                    if (hasSearchQuery) {
                        let subdomain = "null"
                        let split = urlData.hostname.toLowerCase().split('.')
                        if (split.length >= 3) {
                            subdomain = split[0].replace(/^\/\/|^.*?:(\/\/)?/, '');
                        } else {
                            subdomain = "www"
                        }

                        let blacklisted = false
                        for (const str of blacklistedSubdomains) {
                            if (subdomain.includes(str)) {
                                blacklisted = true;
                                break
                            }
                        }

                        if (!blacklisted) {
                            if (lastURL) {
                                if (playSoundsTimer) {
                                    if ((Date.now() - playSoundsTimer) > TIMER_LENGTH) {
                                        lastLength = 0;
                                        lastURL = null;
                                        lastSubdomain = null;
                                        playSoundsTimer = null;
                                        console.log("Timer reset")
                                        //console.log(requestInfo)
                                    }
                                }
                            }
                            
                            if (requestInfo.type === "main_frame") {
                                if (!playSoundsTimer) {
                                    hasNavigated = true
                                    console.log("Navigated (main_frame)")
                                }
                            } else if (lastURL) {
                                if ((lastURL.pathname == urlData.pathname) && (lastSubdomain == subdomain)) {
                                    match = true
                                    console.log("Matched with last URL")
                                } else if (!playSoundsTimer) { // Subdomain or path changed, it's likely the user has navigated to the website
                                    hasNavigated = true
                                    console.log("Navigated (not matching)")
                                    //console.log(requestInfo)
                                }
                            } else if (fromBrowser) {
                                lastURL = urlData
                                lastSubdomain = subdomain
                                match = true
                                console.log("Matched with no last URL")
                                //console.log(requestInfo)
                            }
                            break
                        }
                    }
                }
            }
            
            if (match) {
                if (fromBrowser) {
                    browser.windows.getCurrent().then(function(window) {
                        if (window.focused) {
                            if (!currentTabFocused) {
                                KeyboardGainNode.gain.value = (cachedSettings.keyboardVolume/100);
                                if (lastLength < requestInfo.url.length) {
                                    playSound(currentKeyboardSounds.TYPING_LETTER ? currentKeyboardSounds.TYPING_LETTER : [], KeyboardGainNode);
                                    lastMove = "TYPE"
                                    sendSoundPlayLogEvent("TYPING_LETTER","addressBar",requestInfo)
                                } else if (lastLength > requestInfo.url.length) {
                                    playSound(currentKeyboardSounds.TYPING_BACKSPACE ? currentKeyboardSounds.TYPING_BACKSPACE : [], KeyboardGainNode);
                                    lastMove = "BKSP"
                                    sendSoundPlayLogEvent("TYPING_BACKSPACE","addressBar",requestInfo)
                                } else {
                                    playSound(lastMove == "TYPE" ? (currentKeyboardSounds.TYPING_SPACE ? currentKeyboardSounds.TYPING_SPACE : []) : (currentKeyboardSounds.TYPING_BACKSPACE ? currentKeyboardSounds.TYPING_BACKSPACE : []), KeyboardGainNode);
                                    sendSoundPlayLogEvent("TYPING_SPACE","addressBar",requestInfo)
                                }
                                level += 1;
                                lastLength = requestInfo.url.length
                                navigatedYet = false
                            } else {
                                lastLength = 0;
                                lastURL = null;
                                lastSubdomain = null;
                                playSoundsTimer = null;
                                console.log("Reset due to unfocused")
                            }
                        }
                    })
                }
            } else if (hasNavigated && fromBrowser) {
                browser.windows.getCurrent().then(function(window) {
                    if (window.focused) {
                        if (!currentTabFocused) {
                            navigatedYet = true
                        } else {
                            lastLength = 0;
                            lastURL = null;
                            lastSubdomain = null;
                            playSoundsTimer = null;
                            navigatedYet = true
                            console.log("Reset due to unfocused, no match")
                        }
                    }
                })
            } else if (hostMatch) {
                if ((Date.now() - playSoundsTimer) <= TIMER_LENGTH) {
                    playSoundsTimer = Date.now();
                    navigatedYet = true
                    console.log("Timer expanded")
                }
            }
        }
    }
    return false
}

function handleProxyRequest(requestInfo) { // never actually proxies anything, only used for sounds
    shouldPlayAddressBarSound(requestInfo)
    return { type: "direct" };
}

let lastAbleToInit = true
function initAddressBarListener() {
    console.log("initing address bar listener")
    browser.permissions.contains(addressBarPermissions).then(function(hasSearchPermission) {
        if (hasSearchPermission) {
            console.log("search permissions detected")

            function tryProxyListener() {
                console.log("TRYING PROXY LISTENER!");
                console.log(cachedSettings.consentedToProxy);
                console.log(cachedSettings.sfxAddressBar);

                if (cachedSettings.consentedToProxy && cachedSettings.sfxAddressBar) {
                    console.log("adding proxy listener")
                    browser.proxy.onRequest.addListener(handleProxyRequest, {
                        urls: ["*://*/*"],
                    }); 
                } else {
                    console.log("removing listener, no longer enabled")
                    browser.proxy.onRequest.removeListener(handleProxyRequest)

                    lastLength = 0;
                    lastURL = null;
                    lastSubdomain = null;
                    playSoundsTimer = null;
                    navigatedYet = true
                }
            }

            if (searchEngines === undefined || searchEngines.length == 0) {
                if (addressBarPermissions.permissions.includes("search")) {
                    browser.search.get().then(
                        function(result) {
                            result.sort(function(a, b) {
                                if (a.isDefault) {
                                    return -1
                                } else {
                                    return 0
                                }
                            })
                            searchEngines = result
                            console.log("Search engines fetched.")
                            tryProxyListener()
                        }
                    )
                }
            } else {
                tryProxyListener()
            }
        } else {
            console.log("lost permissions, removing consent and detect address bar")
            lastAbleToInit = false
            if (cachedSettings.consentedToProxy) {
                browser.storage.local.set({
                    sfxAddressBar: false,
                    consentedToProxy: false
                });
                
                lastLength = 0;
                lastURL = null;
                lastSubdomain = null;
                playSoundsTimer = null;
                navigatedYet = true
            }
        }
    })
}

async function permissionsAdded(addedPermissions) {
    if (addedPermissions.permissions.includes("search") || addedPermissions.permissions.includes("proxy")) {
        browser.permissions.contains(addressBarPermissions).then(function(hasSearchPermission) {
            if (hasSearchPermission) {
                console.log("Force setting to true, as we weren't able to init before. Workaround for popup appearing behind settings menu")
                browser.storage.local.set({
                    sfxAddressBar: true,
                    consentedToProxy: true
                });
            }
        })
    }
}

browser.permissions.onAdded.addListener(permissionsAdded);
browser.permissions.onRemoved.addListener(initAddressBarListener);