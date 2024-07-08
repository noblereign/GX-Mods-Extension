console.log("[GXM] Injected into GX store!")
let lastHref = ""
function addLocationObserver(callback) {
    const config = { attributes: false, childList: true, subtree: false }
    const observer = new MutationObserver(callback)
    observer.observe(document.body, config)
}

function observerCallback() {
    if (window.location.href != lastHref) {
        let pathArray = window.location.href.split('/');
        let arrayPos = pathArray.indexOf('mods') + 1;
        let modId = pathArray[arrayPos]
        if ((!modId) || (modId == "") || (modId.includes("http")) || (modId.includes("gx.me"))) {
            if (!window.location.href.includes('/mods/')) {
                console.log("[GXM] Injecting into home page...")
                initHomeScript()
            }
        } else {
            console.log("[GXM] Injecting into mod page...")
            console.log("[GXM] Detected ID:",modId)
            initContentScript()
        }
    }
    lastHref = window.location.href
}

addLocationObserver(observerCallback)
observerCallback()

var timeout = 3000; // 3000ms = 3 seconds

function fetchRetry(url, options = {}, retries = 3, backoff = 300) {
    const retryCodes = [408, 500, 502, 503, 504, 522, 524];
    return content.fetch(url, options)
        .then(res => {
            if (res.ok) {
                console.log("Fetch succeeded");
                return res.json();
            }

            if (retries > 0 && retryCodes.includes(res.status)) {
                setTimeout(() => {
                    return fetchRetry(url, options, retries - 1, backoff * 2);
                }, backoff);
            } else {
                console.log(res)
                throw new Error("Failed to fetch file");
            }
        })
        .catch(console.error);
}

function fetchRetryBlob(url, options = {}, retries = 3, backoff = 300) {
    const retryCodes = [408, 500, 502, 503, 504, 522, 524];
    return content.fetch(url, options)
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
                console.log(res)
                throw new Error("Failed to fetch file");
            }
        })
        .catch(console.error);
}

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

function handleModButton(installModButton, modId) {
    installModButton.setAttribute("disabled","")
    installModButton.classList.add("gxm_injected");
    installModButton.textContent = "A moment, please..."
    installModButton.removeAttribute("href")

    console.log("[GXM] Mod ID:",modId)
    if ((!modId) || (modId == "") || (modId.includes("http")) || (modId.includes("gx.me"))) {
        installModButton.textContent = "Couldn't get mod ID."
    } else {
        let apiResponse = fetchRetry(`https://api.gx.me/store/v3/mods/${modId}`)
        .then(async function(result) {
            if (result.data) {
                let modPayload = result.data.manifestSource.mod.payload
                if ((result.data.contentUrl != null) && (result.data.manifestSource != null) && (result.data.manifestSource.mod != null) && (modPayload != null) && (result.data.packageVersion != null) && (result.data.modShortId != null)) {
                    let musicArray = modPayload.background_music
                    let keyboardArray = modPayload.keyboard_sounds
                    let browserArray = modPayload.browser_sounds
                    let cssArray = modPayload.page_styles
                    let themeArray = modPayload.theme

                    if (musicArray || keyboardArray || browserArray || cssArray || themeArray) {
                        /*https://play.gxc.gg/mods/922a6edc-98e4-432e-8096-5892210dd9b0/e3a14659-05e5-4bb7-878c-38249f58968b/2f4daefd-0f05-4fb5-8893-ca8f64b785ee/contents/music/layer1.wav*/
                        let modInternalId = result.data.mangledTitle + "-" + result.data.crxId
                        let modStorePage = `https://store.gx.me/mods/${result.data.modShortId}/${result.data.mangledTitle}/`
                        let modVersion = result.data.packageVersion
                        let modName = result.data.title
                        let baseURL = result.data.contentUrl
                        installModButton.textContent = "Almost there..."
                        let installData = await browser.runtime.sendMessage({
                            intent: "getModState",
                            modId: modInternalId,
                        })
                        console.log("Got install data")
                        if ((installData != false) && (installData != null)) {
                            //console.log(installData)
                            if (installData.layers || installData.keyboardSounds || installData.browserSounds || installData.webMods || installData.theme) {
                                if (installData.version) {
                                    if (installData.version != modVersion) {
                                        installModButton.textContent = "Update"
                                    } else {
                                        installModButton.textContent = "Reinstall"
                                    }
                                } else {
                                    installModButton.textContent = "Replace local version"
                                }
                            } else {
                                installModButton.textContent = "Install with GXM"
                            }
                            installModButton.removeAttribute("disabled")
                            installModButton.addEventListener("click", async (event) => {
                                console.log("[GXM] Initiating install")
                                installModButton.setAttribute("disabled","")
                                installModButton.textContent = "Installing..."

                                //insert "don't close the tab" warning
                                if (installModButton.parentElement.querySelector(".gxm-warning") == null) {
                                    installModButton.parentElement.insertAdjacentHTML("beforeend",`
                                    <span class="text-[11px] gxm-warning">
                                        <p class="flex justify-center gap-1 pt-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="15" fill="none" class="text-primary-100"><path fill="currentColor" fill-rule="evenodd" d="M6.92.9c.702-1.2 2.458-1.2 3.16 0l6.673 11.4c.702 1.2-.176 2.7-1.58 2.7H1.827C.423 15-.455 13.5.248 12.3L6.92.9Zm2.107.6a.612.612 0 0 0-1.054 0L1.301 12.9a.6.6 0 0 0 .527.9h13.345a.6.6 0 0 0 .526-.9L9.027 1.5Z" clip-rule="evenodd"></path><path fill="currentColor" d="M7.689 5.573c0-.442.363-.8.811-.8.448 0 .811.358.811.8 0 .442-.363.8-.811.8a.806.806 0 0 1-.811-.8ZM8.189 7.356a.5.5 0 0 0-.5.5v3.917a.5.5 0 0 0 .5.5h.622a.5.5 0 0 0 .5-.5V7.856a.5.5 0 0 0-.5-.5h-.622Z"></path></svg>
                                            <span class="gxm-warning-text">
                                                <b>Warning:</b> Don't close this tab until installation is complete.
                                            </span>
                                        </p>
                                    </span>
                                    `)
                                }
                                const dontCloseWarning = installModButton.parentElement.querySelector(".gxm-warning");
                                const dontCloseText = dontCloseWarning.querySelector(".gxm-warning-text");
                                dontCloseText.innerHTML = "<b>Warning:</b> Don't close this tab until installation is complete."

                                let installResult = await installMod({
                                    intent: "installMod",
                                    modId: modInternalId,
                                    modContentUrl: baseURL,
                                    modLayers: musicArray,
                                    modKeyboardSounds: keyboardArray,
                                    modBrowserSounds: browserArray,
                                    modCSS: cssArray,
                                    modTheme: themeArray,
                                    modVersion: modVersion,
                                    modDisplayName: modName,
                                    modStorePage: modStorePage,
                                    modMangledTitle: result.data.mangledTitle,
                                    modShortId: result.data.modShortId,
                                    modIcons: result.data.icons
                                })

                                console.log("Install result");
                                console.log(installResult);
                                if (installResult.succeeded) {
                                    dontCloseWarning.remove()
                                    installModButton.textContent = "Reinstall"
                                } else {
                                    dontCloseText.innerHTML = `If the issue persists, you may want to <a class="text-neutral-77 transition-colors hover:text-neutral-100" href="https://github.com/noblereign/GX-Mods-Extension/issues/new/choose">report it to us</a>.`
                                    installModButton.textContent = installResult.error ? installResult.error : "Something went wrong."
                                }
                                installModButton.removeAttribute("disabled")
                            });
                            browser.runtime.onMessage.addListener((message) => {
                                if (message.targetMod && (message.targetMod == modInternalId)) {
                                    installModButton.textContent = message.newText ? message.newText : "..."
                                    return true
                                }
                                return false
                            });
                        } else {
                            installModButton.textContent = "Failed to read from disk."
                        }
                    } else {
                        installModButton.textContent = "Incompatible with GXM"
                    }
                } else {
                    installModButton.textContent = "Can't verify this mod."
                }
            } else {
                installModButton.textContent = "GX.store returned empty value."
            }
        })
        .catch(function (error) {
            console.log(`Something happened: ${error}`);
            installModButton.textContent = "Failed to get API response."
        });
    }
}


async function initHomeScript() {
    async function searchForButton() {
        console.log("[GXM] Searching for button...")
        for (const a of document.querySelectorAll(".gxbtn-lg.gxbtn-primary")) {
            if (a.textContent.includes("Opera GX") && !a.classList.contains('gxm_injected')) {
                let installModButton = a
                let foundHeadline = a.parentElement.parentElement.parentElement.querySelector('.headline4')
                if (foundHeadline) {
                    let foundHref = foundHeadline.href
                    if (foundHref) {
                        let pathArray = foundHref.split('/');
                        let arrayPos = pathArray.indexOf('mods') + 1;
                        let modId = pathArray[arrayPos]
                        handleModButton(installModButton, modId)
                    } else {
                        installModButton.textContent = "Couldn't get mod ID."
                    }
                } else {
                    installModButton.textContent = "Couldn't get mod ID."
                }
            }
        }
    }
    let timesDone = 0
    
    var intervalId = setInterval(function() {
        searchForButton()
        timesDone++
        if (timesDone >= 12) {
            clearInterval(intervalId);
        }
    }, 500);

}

function updateInstallerButtons(modId,text) {
    browser.runtime.sendMessage({
        intent: "buttonMessage",
        modId: modId,
        text: text
    })
}

const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

//const findEnvVars = /(env\()[^)]*(\))/;

async function installMod(message) {
    console.log('[GXM] Installing mod',message.modId);

    let downloadedLayers = []
    if (message.modLayers != null) {
        console.log("Fetching Background Music");
        updateInstallerButtons(message.modId,`Music... (0%)`)
        for (const fileURL of message.modLayers) {
            if (fileURL.hasOwnProperty('name')) { // This is a new format mod (Multiple songs in one)
                let currentDownloadedTrack = {
                    id: fileURL.id,
                    name: fileURL.name,
                    author: fileURL.author,
                    layers: []
                }
                for (const actualURL of fileURL.tracks) {
                    let downloadURL = `${message.modContentUrl}/${actualURL}`
                    console.log('[GXM] Downloading',downloadURL);
                    try {
                        let downloadedFile = await fetchRetryBlob(downloadURL)
                        let result = null
    
                        try {
                            let arrayBuffer = await downloadedFile.arrayBuffer()
                            result = new Blob([arrayBuffer], {type: downloadedFile.type});
                        } catch(error) {
                            console.log(error);
                        }
    
                        if (result != null) {
                            currentDownloadedTrack.layers.push(result)
                            updateInstallerButtons(message.modId,`Installing track ${Math.round(message.modLayers.indexOf(fileURL) + 1)}/${message.modLayers.length}... (${Math.round(((message.modLayers.indexOf(actualURL) + 1) / clamp(fileURL.tracks.length,1,Number.MAX_SAFE_INTEGER)) * 100)}%)`)
                        } else {
                            return {
                                succeeded: false,
                                error: `Failed to encode track ${Math.round(message.modLayers.indexOf(fileURL) + 1)}.`
                            }
                        }
                    } catch (err) {
                        console.log("Download error");
                        console.log(err);
                        return {
                            succeeded: false,
                            error: `Failed to download track ${Math.round(message.modLayers.indexOf(fileURL) + 1)}.`
                        }
                    }
                }
                downloadedLayers.push(currentDownloadedTrack)
            } else { // Old style mod, just one track
                let downloadURL = `${message.modContentUrl}/${fileURL}`
                console.log('[GXM] Downloading',downloadURL);
                try {
                    let downloadedFile = await fetchRetryBlob(downloadURL)
                    console.log(downloadedFile);
                    let result = null

                    try {
                        let arrayBuffer = await downloadedFile.arrayBuffer()
                        result = new Blob([arrayBuffer], {type: downloadedFile.type});
                    } catch(error) {
                        console.log(error);
                    }

                    if (result != null) {
                        downloadedLayers.push(result)
                        updateInstallerButtons(message.modId,`Music... (${Math.round(((message.modLayers.indexOf(fileURL) + 1) / clamp(message.modLayers.length,1,Number.MAX_SAFE_INTEGER)) * 100)}%)`)
                    } else {
                        return {
                            succeeded: false,
                            error: "Failed to encode."
                        }
                    }
                } catch (err) {
                    console.log("Download error");
                    console.log(err);
                    return {
                        succeeded: false,
                        error: "Failed to download."
                    }
                }
            }
        }
    }

    let downloadedKeyboardSounds = {}
    if (message.modKeyboardSounds != null) {
        console.log("Fetching Keyboard Sounds");
        updateInstallerButtons(message.modId,`Keyboard sounds... (0%)`)
        let currentNumber = 0;
        let maxNumber = 0;
        for (const [soundCategory, soundsArray] of Object.entries(message.modKeyboardSounds)) {
            for (const fileURL of soundsArray) {
                maxNumber++
            }
        }

        for (const [soundCategory, soundsArray] of Object.entries(message.modKeyboardSounds)) {
            console.log("fetching",soundCategory)
            downloadedKeyboardSounds[soundCategory] = []
            for (const fileURL of soundsArray) {
                let downloadURL = `${message.modContentUrl}/${fileURL}`
                if (fileURL != "") {
                    console.log('[GXM] Downloading',downloadURL);
                    currentNumber++
                    try {
                        let downloadedFile = await fetchRetryBlob(downloadURL)
                        let result = null
    
                        try {
                            let arrayBuffer = await downloadedFile.arrayBuffer()
                            result = new Blob([arrayBuffer], {type: downloadedFile.type});
                        } catch(error) {
                            console.log(error);
                        }
    
                        if (result != null) {
                            downloadedKeyboardSounds[soundCategory].push(result)
                            updateInstallerButtons(message.modId,`Keyboard sounds... (${Math.round((currentNumber / maxNumber) * 100)}%)`)
                        } else {
                            return {
                                succeeded: false,
                                error: "Failed to encode."
                            }
                        }
                    } catch (err) {
                        console.log("Download error");
                        console.log(err);
                        return {
                            succeeded: false,
                            error: "Failed to download."
                        }
                    }
                }
            }
        }
    }

    let downloadedBrowserSounds = {}
    if (message.modBrowserSounds != null) {
        console.log("Fetching Browser Sounds");
        updateInstallerButtons(message.modId,`Browser sounds... (0%)`)
        let currentNumber = 0;
        let maxNumber = 0;
        for (const [soundCategory, soundsArray] of Object.entries(message.modBrowserSounds)) {
            for (const fileURL of soundsArray) {
                maxNumber++
            }
        }

        for (const [soundCategory, soundsArray] of Object.entries(message.modBrowserSounds)) {
            console.log("fetching",soundCategory)
            downloadedBrowserSounds[soundCategory] = []
            for (const fileURL of soundsArray) {
                let downloadURL = `${message.modContentUrl}/${fileURL}`
                if (fileURL != "") {
                    console.log('[GXM] Downloading',downloadURL);
                    currentNumber++
                    
                    try {
                        let downloadedFile = await fetchRetryBlob(downloadURL)
                        let result = null
    
                        try {
                            let arrayBuffer = await downloadedFile.arrayBuffer()
                            result = new Blob([arrayBuffer], {type: downloadedFile.type});
                        } catch(error) {
                            console.log(error);
                        }
    
                        if (result != null) {
                            downloadedBrowserSounds[soundCategory].push(result)
                            updateInstallerButtons(message.modId,`Browser sounds... (${Math.round((currentNumber / maxNumber) * 100)}%)`)
                        } else {
                            return {
                                succeeded: false,
                                error: "Failed to encode."
                            }
                        }
                    } catch (err) {
                        console.log("Download error");
                        console.log(err);
                        return {
                            succeeded: false,
                            error: "Failed to download."
                        }
                    }
                }
            }
        }
    }

    let downloadedWebMods = {}
    if (message.modCSS != null) {
        console.log("Fetching Web Mods");
        updateInstallerButtons(message.modId,`Web mods... (0%)`)
        let currentNumber = 0;
        let maxNumber = 0;
        for (const [webMod, webData] of Object.entries(message.modCSS)) {
            let cssFiles = webData.css
            if (cssFiles != null) { // ay man, you never know
                for (const fileURL of cssFiles) {
                    maxNumber++
                }
            }
        }

        let modIndex = 0
        for (const [webMod, webData] of Object.entries(message.modCSS)) {
            console.log("fetching a web mod")
            modIndex++
            downloadedWebMods[modIndex] = {
                matches: webData.matches,
                enabled: true,
                css: [],
            }
            for (const fileURL of webData.css) {
                let downloadURL = `${message.modContentUrl}/${fileURL}`
                if (fileURL != "") {
                    console.log('[GXM] Downloading',downloadURL);
                    currentNumber++
                    try {
                        let downloadedFile = await fetchRetryText(downloadURL)
                        let css = downloadedFile

                        if (css != null) {
                            // 🐺 https://github.com/opera-gaming/gxmods/blob/main/documentation/Mod_Template/webmodding/opera.css
                            // Opera GX uses env() CSS variables which aren't changeable by WebExtensions (as far as I know.)
                            // We need to do conversion on download to detect the env variables and change them to regular old
                            // CSS variables.
                            console.log(`Converting ${downloadURL}`)
                            let worked = true

                            if (worked) {
                                //const matches = findEnvVars.exec(css);
                                const editedCSS = css.replaceAll("env(-", "var(--")
                                const editedBlob = new Blob([editedCSS], {
                                    type: 'text/css' // or whatever your Content-Type is
                                });

                                downloadedWebMods[modIndex].css.push(editedBlob)
                                updateInstallerButtons(message.modId,`Web mods... (${Math.round((currentNumber / maxNumber) * 100)}%)`)
                            } else {
                                return {
                                    succeeded: false,
                                    error: "Failed to convert CSS."
                                }
                            }
                        } else {
                            console.log("Got a null result");
                            return {
                                succeeded: false,
                                error: "Failed to download."
                            }
                        }
                    } catch (err) {
                        console.log("Download error");
                        console.log(err);
                        return {
                            succeeded: false,
                            error: "Failed to download."
                        }
                    }
                }
            }
        }
    }

    let downloadedThemes = {}
    if (message.modTheme != null) {
        downloadedThemes = message.modTheme // lol
    }

    let downloadedIcon = null
    if (message.modIcons != null) {
        updateInstallerButtons(message.modId,`Icon...`)
        let useIcon = Object.values(message.modIcons)[0]; // naively download the first icon we can find for now. it seems like most mods only supply "512", which is good enough for us.
        if (useIcon) {
            let downloadURL = useIcon.iconUrl
            if (downloadURL) {
                try {
                    downloadedIcon = await fetchRetryBlob(downloadURL)
                } catch (error) {
                    console.warn(`Failed to download icon: ${error}`)
                }
            }
        }
    }

    console.log("Fetched everything!");

    if (downloadedLayers.length > 0 || (Object.keys(downloadedKeyboardSounds).length > 0) || (Object.keys(downloadedBrowserSounds).length > 0) || (Object.keys(downloadedWebMods).length > 0) || (Object.keys(downloadedThemes).length > 0)) {
        return await browser.runtime.sendMessage({
            intent: "installMod",
            modId: message.modId,
            modContentUrl: message.modContentUrl,
            modLayers: downloadedLayers,
            modKeyboardSounds: downloadedKeyboardSounds,
            modBrowserSounds: downloadedBrowserSounds,
            modPageStyles: downloadedWebMods,
            modTheme: downloadedThemes,
            modVersion: message.modVersion,
            modDisplayName: message.modDisplayName,
            modStorePage: message.modStorePage,
            modMangledTitle: message.modMangledTitle,
            modShortId: message.modShortId,
            modIcon: downloadedIcon
        })
    } else {
        return {
            succeeded: false,
            error: "Conversion failed."
        }
    }
}

async function initContentScript() {
    let installModButton = null;
    async function searchForButton() {
        console.log("[GXM] Searching for button...")
        for (const a of document.querySelectorAll(".gxbtn-lg.gxbtn-primary")) {
            if (a.textContent.includes("Opera GX")) {
                console.log(a.textContent)
                installModButton = a
                return true
            }
        }
        return false
    }
    let keepRetrying = true
    await searchForButton()
    if (!installModButton) {
        var intervalId = setInterval(function() {
            searchForButton()
            if (installModButton || !keepRetrying) {
                clearInterval(intervalId);
            }
        }, 500);
    }

    function waitForButton(timeout) {
        var start = Date.now();
        return new Promise(waitForFoo); 
    
        // waitForFoo makes the decision whether the condition is met
        // or not met or the timeout has been exceeded which means
        // this promise will be rejected
        function waitForFoo(resolve, reject) {
            if (installModButton)
                resolve(installModButton);
            else if (timeout && (Date.now() - start) >= timeout)
                reject(new Error("couldn't find button in time :/"));
            else
                setTimeout(waitForFoo.bind(this, resolve, reject), 30);
        }
    }
    
    // This runs the promise code
    waitForButton(timeout).then(function(){
        let pathArray = window.location.pathname.split('/');
        let arrayPos = pathArray.indexOf('mods') + 1;
        let modId = pathArray[arrayPos]
        handleModButton(installModButton, modId)
    })
    .catch(function (err) {
        console.log("Giving up");
        keepRetrying = false
    });
}