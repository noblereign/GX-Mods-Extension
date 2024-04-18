console.log("[GXM] Injected into GX store!")
let lastHref = ""
function addLocationObserver(callback) {

    // Options for the observer (which mutations to observe)
    const config = { attributes: false, childList: true, subtree: false }

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback)

    // Start observing the target node for configured mutations
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

async function initHomeScript() {
    async function searchForButton() {
        console.log("[GXM] Searching for button...")
        for (const a of document.querySelectorAll(".gxbtn-lg.gxbtn-primary")) {
            if (a.textContent.includes("Opera GX") && !a.classList.contains('gxm_injected')) {
                console.log(a.textContent)
                let installModButton = a
                installModButton.setAttribute("disabled","")
                installModButton.classList.add("gxm_injected");
                installModButton.textContent = "A moment, please..."
                installModButton.removeAttribute("href")

                let foundHeadline = a.parentElement.parentElement.parentElement.querySelector('.headline4')
                if (foundHeadline) {
                    let foundHref = foundHeadline.href
                    if (foundHref) {
                        let pathArray = foundHref.split('/');
                        let arrayPos = pathArray.indexOf('mods') + 1;
                        let modId = pathArray[arrayPos]
                        console.log("[GXM] Mod ID:",modId)
                        if ((!modId) || (modId == "") || (modId.includes("http")) || (modId.includes("gx.me"))) {
                            installModButton.textContent = "Couldn't get mod ID."
                        } else {
                            let apiResponse = fetchRetry(`https://api.gx.me/store/v3/mods/${modId}`)
                            .then(async function(result) {
                                //console.log(result);
                                if (result.data) {
                                    if ((result.data.contentUrl != null) && (result.data.manifestSource != null) && (result.data.manifestSource.mod != null) && (result.data.manifestSource.mod.payload != null) && (result.data.packageVersion != null) && (result.data.modShortId != null)) {
                                        let musicArray = result.data.manifestSource.mod.payload.background_music
                                        let keyboardArray = result.data.manifestSource.mod.payload.keyboard_sounds
                                        let browserArray = result.data.manifestSource.mod.payload.browser_sounds
    
                                        if (musicArray || keyboardArray || browserArray) {
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
                                                if (installData.layers) {
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
    
                                                    let installResult = await browser.runtime.sendMessage({
                                                        intent: "installMod",
                                                        modId: modInternalId,
                                                        modContentUrl: baseURL,
                                                        modLayers: musicArray,
                                                        modKeyboardSounds: keyboardArray,
                                                        modBrowserSounds: browserArray,
                                                        modVersion: modVersion,
                                                        modDisplayName: modName,
                                                        modStorePage: modStorePage
                                                    })
    
                                                    console.log("Install result");
                                                    console.log(installResult);
                                                    if (installResult.succeeded) {
                                                        installModButton.textContent = "Reinstall"
                                                    } else {
                                                        installModButton.textContent = installResult.error ? installResult.error : "Something went wrong."
                                                    }
                                                    installModButton.removeAttribute("disabled")
                                                });
                                                browser.runtime.onMessage.addListener((message) => {
                                                    if (message.targetMod && (message.targetMod == modInternalId)) {
                                                        installModButton.textContent = message.newText ? message.newText : "..."
                                                    }
                                                });
                                            } else {
                                                installModButton.textContent = "Failed to read from disk."
                                            }
                                        } else {
                                            installModButton.textContent = "Mod contains no sounds."
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

async function installMod(message) {
    console.log('[GXM] Installing mod',message.modId);

    let downloadedLayers = []

    if (message.modLayers != null) {
        console.log("Fetching Background Music");
        updateInstallerButtons(message.modId,`Installing music... (0%)`)
        for (const fileURL of message.modLayers) {
            if (fileURL.hasOwnProperty('name')) { // This is a new format mod (Multiple songs in one)
                let currentDownloadedTrack = {
                    id: fileURL.id,
                    name: fileURL.name,
                    author: fileURL.author,
                    layers: []
                }
                for (const actualURL of fileURL.tracks) { // this isn't confusing at all :)
                    let downloadURL = `${message.modContentUrl}/${actualURL}`
                    console.log('[GXM] Downloading',downloadURL);
                    try {
                        let downloadedFile = await fetchRetryBlob(downloadURL)//, {referrer: `https://store.gx.me/mods/${message.modShortId}/${message.modMangledTitle}/`})
                        console.log(downloadedFile);
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
                        updateInstallerButtons(message.modId,`Installing music... (${Math.round(((message.modLayers.indexOf(fileURL) + 1) / clamp(message.modLayers.length,1,Number.MAX_SAFE_INTEGER)) * 100)}%)`)
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
        updateInstallerButtons(message.modId,`...and keyboard sounds... (0%)`)
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
                        console.log(downloadedFile);
                        let result = null
    
                        try {
                            let arrayBuffer = await downloadedFile.arrayBuffer()
                            result = new Blob([arrayBuffer], {type: downloadedFile.type});
                        } catch(error) {
                            console.log(error);
                        }
    
                        if (result != null) {
                            downloadedKeyboardSounds[soundCategory].push(result)
                            updateInstallerButtons(message.modId,`...and keyboard sounds... (${Math.round((currentNumber / maxNumber) * 100)}%)`)
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
        updateInstallerButtons(message.modId,`...and browser sounds. (0%)`)
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
                        console.log(downloadedFile);
                        let result = null
    
                        try {
                            let arrayBuffer = await downloadedFile.arrayBuffer()
                            result = new Blob([arrayBuffer], {type: downloadedFile.type});
                        } catch(error) {
                            console.log(error);
                        }
    
                        if (result != null) {
                            downloadedBrowserSounds[soundCategory].push(result)
                            updateInstallerButtons(message.modId,`...and browser sounds. (${Math.round((currentNumber / maxNumber) * 100)}%)`)
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

    console.log("Fetched everything!");

    if (downloadedLayers.length > 0 || (Object.keys(downloadedKeyboardSounds).length > 0) || (Object.keys(downloadedBrowserSounds).length > 0)) {
        return await browser.runtime.sendMessage({
            intent: "installMod",
            modId: message.modId,
            modContentUrl: message.modContentUrl,
            modLayers: downloadedLayers,
            modKeyboardSounds: downloadedKeyboardSounds,
            modBrowserSounds: downloadedBrowserSounds,
            modVersion: message.modVersion,
            modDisplayName: message.modDisplayName,
            modStorePage: message.modStorePage,
            modMangledTitle: message.modMangledTitle,
            modShortId: message.modShortId,
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
        installModButton.setAttribute("disabled","")
        installModButton.classList.add("gxm_injected");
        installModButton.textContent = "A moment, please..."
        installModButton.removeAttribute("href")

        let pathArray = window.location.pathname.split('/');
        let arrayPos = pathArray.indexOf('mods') + 1;
        let modId = pathArray[arrayPos]
        console.log("[GXM] Mod ID:",modId)
        if ((!modId) || (modId == "") || (modId.includes("http")) || (modId.includes("gx.me"))) {
            installModButton.textContent = "Couldn't get mod ID."
        } else {
            let apiResponse = fetchRetry(`https://api.gx.me/store/v3/mods/${modId}`)
            .then(async function(result) {
                //console.log(result);
                if (result.data) {
                    if ((result.data.contentUrl != null) && (result.data.manifestSource != null) && (result.data.manifestSource.mod != null) && (result.data.manifestSource.mod.payload != null) && (result.data.packageVersion != null) && (result.data.modShortId != null)) {
                        let musicArray = result.data.manifestSource.mod.payload.background_music
                        let keyboardArray = result.data.manifestSource.mod.payload.keyboard_sounds
                        let browserArray = result.data.manifestSource.mod.payload.browser_sounds

                        if (musicArray || keyboardArray || browserArray) {
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
                                if (installData.layers) {
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
                                    if (document.getElementById("gxm-warning") == null) {
                                        installModButton.parentElement.insertAdjacentHTML("beforeend",`
                                        <span class="text-[11px]" id="gxm-warning">
                                            <p class="flex justify-center gap-1 pt-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="15" fill="none" class="text-primary-100"><path fill="currentColor" fill-rule="evenodd" d="M6.92.9c.702-1.2 2.458-1.2 3.16 0l6.673 11.4c.702 1.2-.176 2.7-1.58 2.7H1.827C.423 15-.455 13.5.248 12.3L6.92.9Zm2.107.6a.612.612 0 0 0-1.054 0L1.301 12.9a.6.6 0 0 0 .527.9h13.345a.6.6 0 0 0 .526-.9L9.027 1.5Z" clip-rule="evenodd"></path><path fill="currentColor" d="M7.689 5.573c0-.442.363-.8.811-.8.448 0 .811.358.811.8 0 .442-.363.8-.811.8a.806.806 0 0 1-.811-.8ZM8.189 7.356a.5.5 0 0 0-.5.5v3.917a.5.5 0 0 0 .5.5h.622a.5.5 0 0 0 .5-.5V7.856a.5.5 0 0 0-.5-.5h-.622Z"></path></svg>
                                                <span id="gxm-warning-text">
                                                    <b>Warning:</b> Don't close this tab until installation is complete.
                                                </span>
                                            </p>
                                        </span>
                                        `)
                                    }
                                    const dontCloseWarning = document.getElementById("gxm-warning");
                                    const dontCloseText = document.getElementById("gxm-warning-text");
                                    dontCloseText.innerHTML = "<b>Warning:</b> Don't close this tab until installation is complete."

                                    let installResult = await installMod({
                                        intent: "installMod",
                                        modId: modInternalId,
                                        modContentUrl: baseURL,
                                        modLayers: musicArray,
                                        modKeyboardSounds: keyboardArray,
                                        modBrowserSounds: browserArray,
                                        modVersion: modVersion,
                                        modDisplayName: modName,
                                        modStorePage: modStorePage,
                                        modMangledTitle: result.data.mangledTitle,
                                        modShortId: result.data.modShortId,
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
                                    }
                                });
                            } else {
                                installModButton.textContent = "Failed to read from disk."
                            }
                        } else {
                            installModButton.textContent = "Mod contains no sounds."
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
    })
    .catch(function (err) {
        console.log("Giving up");
        keepRetrying = false
    });
}