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
        if (window.location.href.startsWith('https://store.gx.me/mods/')) {
            initContentScript()
        }
    }
    lastHref = window.location.href
}

addLocationObserver(observerCallback)
observerCallback()

var timeout = 3000; // 3000ms = 3 seconds
async function initContentScript() {
    let installModButton = null;
    async function searchForButton() {
        console.log("[GXM] Searching for button...")
        for (const a of document.querySelectorAll("a")) {
            if (a.textContent.includes("Try on Opera GX Desktop")) {
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

    function fetchRetry(url, options = {}, retries = 3, backoff = 300) {
        const retryCodes = [408, 500, 502, 503, 504, 522, 524];
        return fetch(url, options)
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
                    throw new Error(res);
                }
            })
            .catch(console.error);
    }


    
    // This runs the promise code
    waitForButton(timeout).then(function(){
        installModButton.setAttribute("disabled","")
        installModButton.classList.add("gxm_injected");
        installModButton.textContent = "A moment, please..."
        installModButton.removeAttribute("href")

        let pathArray = window.location.pathname.split('/');
        let modId = pathArray[2]
        console.log("[GXM] Mod ID:",modId)
        if (!modId) {
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