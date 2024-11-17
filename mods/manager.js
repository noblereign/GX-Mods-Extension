let audioContext = new (window.AudioContext || window.webkitAudioContext)();

const MOD_DATABASE_KEY = "GXMusicMods"

const modal = document.getElementById('createModModal')
const openModalButton = document.getElementById('createModButton')

const modList = document.getElementById('modListList')
const modItemTemplate = document.getElementById('modItemTemplate')

const filePicker = document.getElementById('files');
const iconPicker = modal.querySelector('#icon');
const localIconPreview = modal.querySelector('.modIcon');

let proxyPreviouslyAvailable = false;

const preview = document.querySelector(".preview");

const SFXfilePicker = document.getElementById('sfx');
const SFXpreview = document.querySelector(".sfxPreview");
const sfxItemTemplate = document.getElementById('sfxItemTemplate')

const acceptButton = document.getElementById('finish');
const cancelButton = document.getElementById("cancel")
const modNameInput = document.getElementById("modname")
const errMessage = document.getElementById("errorMessage")

const lengthWarning = document.getElementById("lengthDifference")
const lengthWarningSFX = document.getElementById("longSfx")

const storeButton = document.getElementById('goToStore')


const modal_import = document.getElementById('importModModal')
const openImportModalButton = document.getElementById('importModButton')

const acceptButton_import = document.getElementById('finish_import');
const cancelButton_import = document.getElementById("cancel_import")
const errMessage_import = document.getElementById("errorMessage_import")

const zipPicker = document.getElementById('zip');
const zipPreview = document.querySelector(".zipPreview");
const zipItemTemplate = document.getElementById('unzippedMod')

const debugButton = document.getElementById('footerLink')
const modal_debug = document.getElementById('debugModal')
const cancelButton_debug = document.getElementById("cancel_debug")

acceptButton_import.disabled = true
acceptButton.disabled = true

filePicker.addEventListener("change", updateDisplay);
SFXfilePicker.addEventListener("change", updateSFXDisplay);

iconPicker.addEventListener("change", updateIconDisplay);
iconPicker.addEventListener("cancel", updateIconDisplay);

zipPicker.addEventListener("change", tryUnzipFile);

var chosenFiles = []
var chosenFilesDurations = []

var chosenSFX = []
var SFXCategories = new WeakMap()
var sfxSuperLong = false

function secondsToHHMMSS(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);
  
    let timeString = '';
  
    if (hours > 0) {
      timeString += hours + ':';
    }
  
    if (hours > 0 || minutes > 0) {
      timeString += (minutes < 10 && hours > 0 ? '0' : '') + minutes + ':';
    } else {
      timeString += minutes + ':';
    }
  
    timeString += (remainingSeconds < 10 ? '0' : '') + remainingSeconds;
  
    return timeString;
  }

function areAllFilesValid() {
    let valid = true
    for (const file of chosenFiles) {
        if (validFileType(file)) {
            console.log(file,"OK!");
        } else {
            console.log(file,"ummm... Not OK!");
            valid = false
            break
        }
    }

    if (valid) {
        for (const file of chosenSFX) {
            if (validFileType(file)) {
                console.log(file,"OK!");
            } else {
                console.log(file,"ummm... Not OK!");
                valid = false
                break
            }
        }
    }

    return valid
}

function areDurationsOkay() {
    if (chosenFilesDurations.length <= 0) {
        return true
    }
    let maximumTime = Math.max(...chosenFilesDurations)
    let minimumTime = Math.min(...chosenFilesDurations)
    console.log(maximumTime,minimumTime,Math.abs(maximumTime-minimumTime))
    return Math.abs(maximumTime-minimumTime) < 2
}

function isEmptyOrSpaces(str){
    return str === null || str.match(/^ *$/) !== null;
}

function getBase64(file) {
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
}

const modIconList = {}
async function updateModList() {
    console.log("[GXM] Attempting to update mod list in manager");
    try {
        let modData = await localforage.getItem(MOD_DATABASE_KEY);
        if (modData == null) {
            modData = {}
        }
        while (modList.firstChild) {
            modList.removeChild(modList.firstChild);
        }
        if (Object.keys(modData).length <= 0) {
            const para = document.createElement("li");
            para.textContent = "You have no mods installed.";
            para.classList.add("emptyState");
            modList.appendChild(para);
        } else {
            for (const [id, data] of Object.entries(modData)) {
                console.log(`${id}: ${data}`);
                let newModItem = modItemTemplate.content.cloneNode(true);
                console.log(newModItem);
                let actualChild = newModItem.firstElementChild;
                actualChild.id = "Mod_" + id
                let modInfoContainer = newModItem.querySelector(".modInfo")
                modInfoContainer.childNodes[0].nodeValue = data.displayName
                let modSourceContainer = modInfoContainer.querySelector(".sourceSubtitle")
                modSourceContainer.textContent = data.source + (data.version ? `, version ${data.version}` : "")

                if (data.storePage != null) {
                    let storePageButton = newModItem.querySelector(".goToStoreButton")
                    storePageButton.href = data.storePage
                    storePageButton.classList.remove("hidden");
                }

                if (data.icon != null) {
                    let modIcon = newModItem.querySelector(".modIcon")
                    if (!modIconList[id]) {
                        modIconList[id] = URL.createObjectURL(data.icon);
                    }
                    modIcon.src = modIconList[id];
                }

                let chipBag = newModItem.querySelector(".chipBag")
                if (data.layers) {
                    const para = document.createElement("span");
                    para.textContent = "Background music";
                    para.classList.add("chip");
                    chipBag.appendChild(para);
                }
                if (data.browserSounds) {
                    const para = document.createElement("span");
                    para.textContent = "Browser sounds";
                    para.classList.add("chip");
                    chipBag.appendChild(para);
                }
                if (data.keyboardSounds) {
                    const para = document.createElement("span");
                    para.textContent = "Keyboard sounds";
                    para.classList.add("chip");
                    chipBag.appendChild(para);
                }
                if (data.webMods) {
                    const para = document.createElement("span");
                    para.textContent = "Web modding";
                    para.classList.add("chip");
                    chipBag.appendChild(para);
                }
                if (data.theme) {
                    const para = document.createElement("span");
                    para.textContent = "Theme";
                    para.classList.add("chip");
                    chipBag.appendChild(para);
                }

                let deleteButton = newModItem.querySelector(".deleteModButton")
                deleteButton.onclick = function () {
                    if (confirm(`Really delete ${data.displayName}?`)) {
                        deleteMod(id);
                    } 
                };

                modList.appendChild(newModItem);
            }
        }
        modData = null;
    } catch (err) {
        console.log(err);
    }
}

async function deleteMod(modName) {
    let needsRefresh = false
    try {
        let previousData = await localforage.getItem(MOD_DATABASE_KEY);
        if (previousData == null) {
            previousData = {}
        }
        if (previousData[modName]) {
            if (previousData[modName].webMods) {
                needsRefresh = true;
                for (const [webModIndex, webModData] of Object.entries(previousData[modName].webMods)) {
                    await browser.runtime.sendMessage({
                        intent: "webModState",
                        modId: modName,
                        index: webModIndex,
                        state: false
                    })
                }
            }

            delete previousData[modName];

            browser.storage.local.get().then(
                function(result) {
                    if (result.trackName == modName) {
                        try {
                            browser.storage.local.set({
                                trackName: "off",
                            }).then(
                                function(result) {
                                    browser.runtime.sendMessage(`trackchange_off`);
                                },
                                function(error) {
                                    console.log("promise failed");
                                    console.log(error);
                                    alert("Couldn't delete mod due to a disk error. Please try again!")
                                    return false
                                }
                            );
                        } catch (err) {
                            console.log("couldn't auto swap music");
                            console.log(err);
                            alert("Couldn't delete mod due to a disk error. Please try again!")
                            return false
                        }
                    }

                    if (result.keyboardName == modName) {
                        try {
                            browser.storage.local.set({
                                keyboardName: "off",
                            }).then(
                                function(result) {
                                    browser.runtime.sendMessage(`keyboardchange_off`);
                                },
                                function(error) {
                                    console.log("promise failed");
                                    console.log(error);
                                    alert("Couldn't delete mod due to a disk error. Please try again!")
                                    return false
                                }
                            );
                        } catch (err) {
                            console.log("couldn't auto swap keyboard");
                            console.log(err);
                            alert("Couldn't delete mod due to a disk error. Please try again!")
                            return false
                        }
                    }

                    if (result.sfxName == modName) {
                        try {
                            browser.storage.local.set({
                                sfxName: "off",
                            }).then(
                                function(result) {
                                    browser.runtime.sendMessage(`sfxchange_off`);
                                },
                                function(error) {
                                    console.log("promise failed");
                                    console.log(error);
                                    alert("Couldn't delete mod due to a disk error. Please try again!")
                                    return false
                                }
                            );
                        } catch (err) {
                            console.log("couldn't auto swap sfx");
                            console.log(err);
                            alert("Couldn't delete mod due to a disk error. Please try again!")
                            return false
                        }
                    }

                    if (result.themeName == modName) {
                        try {
                            browser.storage.local.set({
                                themeName: "off",
                            }).then(
                                function(result) {
                                    browser.runtime.sendMessage(`themechange_off`);
                                },
                                function(error) {
                                    console.log("promise failed");
                                    console.log(error);
                                    alert("Couldn't delete mod due to a disk error. Please try again!")
                                    return false
                                }
                            );
                        } catch (err) {
                            console.log("couldn't auto swap theme");
                            console.log(err);
                            alert("Couldn't delete mod due to a disk error. Please try again!")
                            return false
                        }
                    }
                },
                function(error) {
                    console.log(`Error while checking if need to swap: ${error}`);
                }
            );

            try {
                localforage.setItem(MOD_DATABASE_KEY, previousData).then(function(value) {
                    URL.revokeObjectURL(modIconList[modName])
                    delete modIconList[modName]
                    console.log("Deleted successfully")
                    updateModList()
                    return true
                }).catch(function(err) {
                    console.log("Write error");
                    console.log(err);
                    alert("Couldn't delete mod due to a disk error. Please try again!")
                    return false
                });
            } catch (err) {
                console.log("Write error");
                console.log(err);
                alert("Couldn't delete mod due to a disk error. Please try again!")
                return false
            }
        } else {
            console.log(modName,"doesn't even exist in the first place...");
            return true
        }
    } catch (err) {
        console.log(err);
        return false
    }
    if (needsRefresh) {
        browser.runtime.sendMessage(`refreshWebModCache`);
    }
}

let lastSetIcon = null
async function verifyAndSaveMod(modId) {
    if (isEmptyOrSpaces(modNameInput.value)) {
        errMessage.textContent = "Mod name cannot be blank";
        errMessage.classList.remove("hidden");
        return false
    }
    if (chosenFiles.length <= 0 && chosenSFX.length <= 0) {
        errMessage.textContent = "Nothing to save!";
        errMessage.classList.remove("hidden");
        return false
    }
    if (!areDurationsOkay()) {
        if (!confirm(`Not all layers are the same length. This will cause music desyncs. Are you still sure you want to create the mod?`)) {
            errMessage.textContent = "Creation cancelled";
            errMessage.classList.remove("hidden");
            return false
        } 
    }
    if (sfxSuperLong) {
        if (!confirm(`Some sound effects are very long. This is obnoxious at best, but browser-crashing at worst. Are you still sure you want to create the mod?`)) {
            errMessage.textContent = "Creation cancelled";
            errMessage.classList.remove("hidden");
            return false
        } 
    }
    if (modId == null) {
        modId = self.crypto.randomUUID()
    }
    let modName = modNameInput.value

    if (areAllFilesValid()) {
        let saveArray = []
        let saveSFX = {}
        let saveKeyboard = {}
        console.log("Passed initial validation, converting");
        for (const file of chosenFiles) {
            let result = null
            try {
                let arrayBuffer = await file.arrayBuffer()
                console.log(file.type)
                console.log(arrayBuffer);
                result = new Blob([arrayBuffer], {type: file.type});
            } catch(error) {
                console.log(error);
            }
            if (result != null) {
                saveArray.push(result)
            } else {
                errMessage.textContent = "Failed to convert music!";
                errMessage.classList.remove("hidden");
                return false
            }
        }

        for (const file of chosenSFX) {
            if (SFXCategories.get(file)) {
                if (SFXCategories.get(file).startsWith("TYPING")) {
                    if (!saveKeyboard[SFXCategories.get(file)]) {
                        saveKeyboard[SFXCategories.get(file)] = []
                    }
                } else {
                    if (!saveSFX[SFXCategories.get(file)]) {
                        saveSFX[SFXCategories.get(file)] = []
                    }
                }
                let result = null
                try {
                    let arrayBuffer = await file.arrayBuffer()
                    console.log(file.type)
                    console.log(arrayBuffer);
                    result = new Blob([arrayBuffer], {type: file.type});
                } catch(error) {
                    console.log(error);
                }
                if (result != null) {
                    if (SFXCategories.get(file).startsWith("TYPING")) {
                        saveKeyboard[SFXCategories.get(file)].push(result)
                    } else {
                        saveSFX[SFXCategories.get(file)].push(result)
                    }
                } else {
                    errMessage.textContent = "Failed to convert sfx!";
                    errMessage.classList.remove("hidden");
                    return false
                }
            } else {
                errMessage.textContent = "Please choose a category for every sound effect.";
                errMessage.classList.remove("hidden");
                return false
            }
        }

        let setIcon = null;
        if (iconPicker.value != "") {
            try {
                setIcon = iconPicker.files[0]
            } catch (error) {
                console.warn(`Couldn't save icon: ${error}`)
            }
        }

        try {
            let previousData = await localforage.getItem(MOD_DATABASE_KEY);
            if (previousData == null) {
                previousData = {}
            }
            if (previousData[modId]) {
                errMessage.textContent = "Mod ID is already in use, please try saving again";
                errMessage.classList.remove("hidden");
                return false
            } else {
                previousData[modId] = {
                    displayName: modName,
                    source: "Local",
                    layers: (saveArray.length > 0 ? saveArray : null),
                    keyboardSounds: ((Object.keys(saveKeyboard).length > 0) ? saveKeyboard : null),
                    browserSounds: ((Object.keys(saveSFX).length > 0) ? saveSFX : null),
                    icon: (setIcon ? setIcon : null)
                }
                try {
                    localforage.setItem(MOD_DATABASE_KEY, previousData).then(function(value) {
                        console.log("Saved successfully")
                        updateModList()
                        modal.classList.add("hidden");
                        return true
                    }).catch(function(err) {
                        console.log(err);
                        errMessage.textContent = "Write error; check console for details!";
                        errMessage.classList.remove("hidden");
                        return false
                    });
                } catch (err) {
                    console.log(err);
                    errMessage.textContent = "Write error; check console for details!";
                    errMessage.classList.remove("hidden");
                    return false
                }
            }
        } catch (err) {
            console.log(err);
            errMessage.textContent = "Read error; check console for details!";
            errMessage.classList.remove("hidden");
            return false
        }
    } else {
        errMessage.textContent = "Invalid files selected.";
        errMessage.classList.remove("hidden");
        return false
    }
}

async function parse(file) {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    const result = await new Promise((resolve, reject) => {
        reader.onload = function(event) {
            console.log("Loaded")
            resolve(reader.result)
        }
    })
    console.log(result)
    return result
}

function updateDisplay() {
    while (preview.firstChild) {
        preview.removeChild(preview.firstChild);
    }

    chosenFiles = []
    chosenFilesDurations = []
    lengthWarning.classList.add("hidden");
    const curFiles = filePicker.files;
    if (curFiles.length === 0) {
        acceptButton.disabled = true
        const para = document.createElement("span");
        para.textContent = "No files currently selected";
        para.classList.add("emptyState");
        preview.appendChild(para);
    } else if (curFiles.length <= 7) {
        const list = document.createElement("ol");
        preview.appendChild(list);

        let valid = true
        let numero = 1
        for (const file of curFiles) {
        const listItem = document.createElement("li");
        const para = document.createElement("p");
        listItem.classList.add("fileItem");
        if (validFileType(file)) {
            const lengthSpan = document.createElement("span");
            lengthSpan.textContent = "checking..."
            lengthSpan.style = "color: rgb(154, 160, 166); text-align: right; float: right;"
            para.textContent = `Layer ${numero} - ${file.name}`;

            parse(file)
            .then(function (arrayBuffer) {
                return audioContext.decodeAudioData(arrayBuffer);
            })
            .then(function (soundBuffer) {
                let timestring = secondsToHHMMSS(soundBuffer.duration)
                lengthSpan.textContent = timestring
                if (chosenFiles.includes(file)) {
                    chosenFilesDurations.push(soundBuffer.length)
                    if (!areDurationsOkay()) {
                        lengthWarning.classList.remove("hidden");
                    }
                }
            })
            .catch(function(err) {
                console.log(err);
                lengthSpan.classList.add("emptyState");
                lengthSpan.textContent = "check error"
            });

            para.appendChild(lengthSpan);
            listItem.appendChild(para);
        } else {
            para.classList.add("invalidItem");
            para.textContent = `${file.name}: Not a valid file type.`;
            listItem.appendChild(para);
            valid = false
        }

        list.appendChild(listItem);
        chosenFiles.push(file)
        numero ++
        }
        acceptButton.disabled = !areAllFilesValid()
    } else {
        acceptButton.disabled = true
        const para = document.createElement("span");
        para.textContent = "Too many files, please select no more than 7";
        para.classList.add("emptyState");
        preview.appendChild(para);
    }
}

function updateSFXDisplay() {
    while (SFXpreview.firstChild) {
        SFXpreview.removeChild(SFXpreview.firstChild);
    }
  
    sfxSuperLong = false
    chosenSFX = []
    SFXCategories = new WeakMap()
    lengthWarningSFX.classList.add("hidden");
    lengthWarningSFX.classList.remove("invalidItem");

    const curFiles = SFXfilePicker.files;
    if (curFiles.length === 0) {
      acceptButton.disabled = true
      const para = document.createElement("span");
      para.textContent = "No files currently selected";
      para.classList.add("emptyState");
      SFXpreview.appendChild(para);
    } else {
      const list = document.createElement("ol");
      SFXpreview.appendChild(list);
  
      let valid = true
      let numero = 1
      for (const file of curFiles) {
        if (validFileType(file)) {
            let newModItem = sfxItemTemplate.content.cloneNode(true);
            console.log(newModItem);
            let actualChild = newModItem.firstElementChild;
            let modInfoContainer = newModItem.querySelector(".sfxName")
            modInfoContainer.childNodes[0].nodeValue = file.name
            let categoryPicker = actualChild.querySelector("#category-picker")
            let rightContainer = newModItem.querySelector(".rightSideContainer")

            const lengthSpan = document.createElement("span");
            lengthSpan.textContent = "..."
            lengthSpan.classList.add("sfxLength");

            parse(file)
            .then(function (arrayBuffer) {
                return audioContext.decodeAudioData(arrayBuffer);
            })
            .then(function (soundBuffer) {
                let timestring = secondsToHHMMSS(soundBuffer.duration)
                lengthSpan.textContent = timestring
                if (chosenSFX.includes(file)) {
                    if (soundBuffer.duration > 10.5) {
                        lengthWarningSFX.classList.remove("hidden");
                    }
                    if (soundBuffer.duration > 20) {
                        lengthSpan.classList.add("invalidItem");
                        lengthWarningSFX.classList.add("invalidItem");
                        sfxSuperLong = true
                    }
                }
            })
            .catch(function(err) {
                console.log(err);
                lengthSpan.textContent = "what"
                lengthSpan.classList.add("invalidItem");
            });

            rightContainer.prepend(lengthSpan);

            categoryPicker.addEventListener("change", function() {
                const selectedOption = categoryPicker.value; // Get the selected value
                console.log("Selected option:", selectedOption);
                SFXCategories.set(file, selectedOption)
            });

            list.appendChild(newModItem);
        } else {
            const listItem = document.createElement("li");
            const para = document.createElement("p");
            listItem.classList.add("fileItem");
            para.classList.add("invalidItem");
            para.textContent = `${file.name}: Not a valid file type.`;
            listItem.appendChild(para);
            valid = false
            list.appendChild(listItem);
        }
  
        SFXCategories.set(file,undefined)
        chosenSFX.push(file)
        numero ++
      }
      acceptButton.disabled = !areAllFilesValid()
    }
}

function updateIconDisplay() {
    if (lastSetIcon) {
        URL.revokeObjectURL(lastSetIcon);
        lastSetIcon = null
    }
    localIconPreview.src = "placeholder.png";
    const curFiles = iconPicker.files;
    if (curFiles.length === 1) {
      for (const file of curFiles) {
        lastSetIcon = URL.createObjectURL(file);
        localIconPreview.src = lastSetIcon;
      }
    }
}

const iconUrls = []
const zipsToSave = []
async function tryUnzipFile() {
    while (zipPreview.firstChild) {
        zipPreview.removeChild(zipPreview.firstChild);
    }
    for (const url of iconUrls) {
        URL.revokeObjectURL(url);
    }
    zipsToSave.length = 0
    iconUrls.length = 0

    const curFiles = zipPicker.files;
    acceptButton_import.disabled = true
    if (curFiles.length === 0) {
        acceptButton_import.disabled = true
        const para = document.createElement("span");
        para.textContent = "No files currently selected";
        para.classList.add("emptyState");
        zipPreview.appendChild(para);
    } else if (curFiles.length == 1) {
        let valid = true
        let numero = 1
        for (const file of curFiles) {
            const para = document.createElement("p");
            if (validZipFile(file)) {
                para.textContent = `${file.name}: Unzipping`;
                zipPreview.appendChild(para);
                const zipFileReader = new zip.BlobReader(file)
                const manifestWriter = new zip.TextWriter();
                const iconWriter = new zip.BlobWriter();
                const zipReader = new zip.ZipReader(zipFileReader);
                const entries = await zipReader.getEntries()
                para.textContent = `${file.name}: Checking for manifest`;
                let manifest = null
                for (const entry of entries) {
                    console.log(entry);
                    if (entry.filename === "manifest.json") {
                        console.log("Found manifest!");
                        manifest = entry
                    } else if (entry.filename.includes("manifest.json")) {
                        if (!manifest) {
                            console.log("Mod is zipped improperly") // maybe it'd be possible to automatically account for this, but im too lazy lollll
                            para.classList.add("invalidItem");
                            para.textContent = `${file.name}: Mod is zipped improperly.\nPlease move the mod to the root of the zip file and try again.\nWhen done correctly, you should immediately see 'manifest.json' without needing to open a folder.`;
                            
                            valid = false
                        }
                    }
                }

                if ((manifest !== null) && valid) {
                    para.textContent = `${file.name}: Found manifest, awaiting data`;
                    const manifestData = await manifest.getData(manifestWriter, {transferStreams: false, useWebWorkers: false})
                    console.log("String to JSON...")
                    let manifestSource = null
                    try {
                        manifestSource = JSON.parse(manifestData)
                    } catch (error) {
                        console.warn(error);
                        para.textContent = `${file.name}: ${error}`;
                        valid = false
                    }
                    
                    if (manifestSource !== null) {
                        console.log("Manifest data:");
                        console.log(manifestSource);
                        let modName = manifestSource.name ? manifestSource.name : file.name
                        para.textContent = `${modName}: Manifest is valid JSON`;
                        if ((manifestSource.mod !== null) && (manifestSource.mod.payload !== null)) {
                            let modPayload = manifestSource.mod.payload

                            let musicArray = modPayload.background_music
                            let keyboardArray = modPayload.keyboard_sounds
                            let browserArray = modPayload.browser_sounds
                            let cssArray = modPayload.page_styles
                            let themeArray = modPayload.theme

                            let iconObject = manifestSource.icons

                            if (musicArray || keyboardArray || browserArray || cssArray || themeArray) {
                                para.textContent = `Found the mod data for ${modName}, generating preview now...`;
                                
                                let newModItem = zipItemTemplate.content.cloneNode(true);
                                console.log(newModItem);
                                let modInfoContainer = newModItem.querySelector(".modInfo")
                                modInfoContainer.childNodes[0].nodeValue = modName
                                let modSourceContainer = modInfoContainer.querySelector(".sourceSubtitle")
                                modSourceContainer.textContent = (manifestSource.version ? `Version ${manifestSource.version}` : "No version information")

                                if (iconObject) {
                                    console.log("Icon data detected.")
                                    let useIcon = Object.values(iconObject)[0];
                                    console.log(useIcon)
                                    var icon = entries.find(obj => {
                                        return obj.filename.toLowerCase() === useIcon.toLowerCase()
                                    })
                                    console.log(icon)
                                    let modIcon = newModItem.querySelector(".modIcon")
                                    if (icon) {
                                        console.log("setting icon")
                                        const iconData = await icon.getData(iconWriter, {transferStreams: false, useWebWorkers: false});
                                        let url = URL.createObjectURL(iconData);
                                        modIcon.src = url;
                                        iconUrls.push(url)
                                        console.log("Icon set!!")
                                    }
                                }

                                let chipBag = newModItem.querySelector(".chipBag")
                                if (musicArray) {
                                    const para = document.createElement("span");
                                    para.textContent = "Background music";
                                    para.classList.add("chip");
                                    chipBag.appendChild(para);
                                }
                                if (browserArray) {
                                    const para = document.createElement("span");
                                    para.textContent = "Browser sounds";
                                    para.classList.add("chip");
                                    chipBag.appendChild(para);
                                }
                                if (keyboardArray) {
                                    const para = document.createElement("span");
                                    para.textContent = "Keyboard sounds";
                                    para.classList.add("chip");
                                    chipBag.appendChild(para);
                                }
                                if (cssArray) {
                                    const para = document.createElement("span");
                                    para.textContent = "Web modding";
                                    para.classList.add("chip");
                                    chipBag.appendChild(para);
                                }
                                if (themeArray) {
                                    const para = document.createElement("span");
                                    para.textContent = "Theme";
                                    para.classList.add("chip");
                                    chipBag.appendChild(para);
                                }

                                zipPreview.appendChild(newModItem);
                                zipsToSave.push(file)
                                para.remove()
                            } else {
                                para.classList.add("invalidItem");
                                para.textContent = `${modName} isn't compatible with GXM.`;
                                
                                valid = false
                            }
                        } else {
                            para.classList.add("invalidItem");
                            para.textContent = `${modName}: Couldn't find mod data.`;
                            
                            valid = false
                        }
                    }
                } else if (valid) {
                    para.classList.add("invalidItem");
                    para.textContent = `${file.name}: Couldn't find manifest; likely not a mod.`;
                    
                    valid = false
                }
                await zipReader.close();
            } else {
                para.classList.add("invalidItem");
                para.textContent = `${file.name}: Not a valid zip file.`;
                zipPreview.appendChild(para);
                valid = false
            }
            numero ++
        }

        acceptButton_import.disabled = !valid
    } else {
        acceptButton_import.disabled = true
        const para = document.createElement("span");
        para.textContent = "Too many files, please select no more than 1";
        para.classList.add("emptyState");
        preview.appendChild(para);
    }
}

async function trySaveZipMod() {
    if (zipsToSave.length <= 0) {
        errMessage.textContent = "Nothing to save!";
        errMessage.classList.remove("hidden");
        return false
    }
    acceptButton_import.textContent = "Importing..."
    for (const file of zipsToSave) {
        if (validZipFile(file)) {
            modId = self.crypto.randomUUID()

            const zipFileReader = new zip.BlobReader(file)
            const manifestWriter = new zip.TextWriter();
            const zipReader = new zip.ZipReader(zipFileReader);
            const entries = await zipReader.getEntries()

            let manifest = null
            for (const entry of entries) {
                console.log(entry);
                if (entry.filename === "manifest.json") {
                    console.log("Found manifest!");
                    manifest = entry
                }
            }

            if (manifest !== null) {
                const manifestData = await manifest.getData(manifestWriter, {transferStreams: false, useWebWorkers: false})
                let manifestSource = null
                try {
                    manifestSource = JSON.parse(manifestData)
                } catch (error) {
                    console.warn(error);
                    para.textContent = `${file.name}: ${error}`;
                }
                
                if (manifestSource !== null) {
                    let modName = manifestSource.name ? manifestSource.name : file.name
                    if ((manifestSource.mod !== null) && (manifestSource.mod.payload !== null)) {
                        let modPayload = manifestSource.mod.payload

                        let musicArray = modPayload.background_music
                        let keyboardArray = modPayload.keyboard_sounds
                        let browserArray = modPayload.browser_sounds
                        let cssArray = modPayload.page_styles
                        let themeArray = modPayload.theme

                        let iconObject = manifestSource.icons
                        let iconData = null;

                        if (musicArray || keyboardArray || browserArray || cssArray || themeArray) {
                            if (iconObject) {
                                let useIcon = Object.values(iconObject)[0];
                                var icon = entries.find(obj => {
                                    return obj.filename.toLowerCase() === useIcon.toLowerCase()
                                })
                                if (icon) {
                                    let blobWriter = new zip.BlobWriter();
                                    iconData = await icon.getData(blobWriter, {transferStreams: false, useWebWorkers: false});
                                }
                            }

                            let downloadedLayers = []
                            if (musicArray != null) {
                                console.log("Unzipping Background Music");
                                for (const fileURL of musicArray) {
                                    if (fileURL.hasOwnProperty('name')) { // This is a new format mod (Multiple songs in one)
                                        let currentDownloadedTrack = {
                                            id: fileURL.id,
                                            name: fileURL.name,
                                            author: fileURL.author,
                                            layers: []
                                        }
                                        for (const actualURL of fileURL.tracks) {
                                            console.log('[GXM] Unzipping',actualURL);
                                            try {
                                                let result = null
                                                var fileObject = entries.find(obj => {
                                                    return obj.filename.toLowerCase() === actualURL.toLowerCase()
                                                })
                                                if (fileObject) {
                                                    let blobWriter = new zip.BlobWriter();
                                                    result = await fileObject.getData(blobWriter, {transferStreams: false, useWebWorkers: false});
                                                }

                                                if (result != null) {
                                                    currentDownloadedTrack.layers.push(result)
                                                } else {
                                                    errMessage_import.classList.remove("hidden");
                                                    errMessage_import.textContent = `${modName}: Couldn't find ${actualURL}`;
                                                    await zipReader.close();
                                                    return false
                                                }
                                            } catch (err) {
                                                console.log("Download error");
                                                console.log(err);
                                                errMessage_import.classList.remove("hidden");
                                                errMessage_import.textContent = `${modName}, ${actualURL}: ${err}`;
                                                await zipReader.close();
                                                return false
                                            }
                                        }
                                        downloadedLayers.push(currentDownloadedTrack)
                                    } else { // Old style mod, just one track
                                        console.log('[GXM] Unzipping', fileURL);
                                        try {
                                            let result = null
                                            var fileObject = entries.find(obj => {
                                                return obj.filename.toLowerCase() === fileURL.toLowerCase()
                                            })
                                            if (fileObject) {
                                                let blobWriter = new zip.BlobWriter();
                                                result = await fileObject.getData(blobWriter, {transferStreams: false, useWebWorkers: false});
                                            }

                                            if (result != null) {
                                                downloadedLayers.push(result)
                                            } else {
                                                errMessage_import.classList.remove("hidden");
                                                errMessage_import.textContent = `${modName}: Couldn't find ${fileURL}`;
                                                await zipReader.close();
                                                return false
                                            }
                                        } catch (err) {
                                            console.log("Download error");
                                            console.log(err);
                                            errMessage_import.classList.remove("hidden");
                                            errMessage_import.textContent = `${modName}, ${fileURL}: ${err}`;
                                            await zipReader.close();
                                            return false
                                        }
                                    }
                                }
                            }

                            let downloadedKeyboardSounds = {}
                            if (keyboardArray != null) {
                                console.log("Unzipping Keyboard Sounds");

                                for (const [soundCategory, soundsArray] of Object.entries(keyboardArray)) {
                                    console.log("fetching",soundCategory)
                                    downloadedKeyboardSounds[soundCategory] = []
                                    for (const fileURL of soundsArray) {
                                        if (fileURL != "") {
                                            console.log('[GXM] Unzipping',fileURL);
                                            try {
                                                let result = null
                                                var fileObject = entries.find(obj => {
                                                    return obj.filename.toLowerCase() === fileURL.toLowerCase()
                                                })
                                                if (fileObject) {
                                                    let blobWriter = new zip.BlobWriter();
                                                    result = await fileObject.getData(blobWriter, {transferStreams: false, useWebWorkers: false});
                                                }
                            
                                                if (result != null) {
                                                    downloadedKeyboardSounds[soundCategory].push(result)
                                                } else {
                                                    errMessage_import.classList.remove("hidden");
                                                    errMessage_import.textContent = `${modName}: Couldn't find ${fileURL}`;
                                                    await zipReader.close();
                                                    return false
                                                }
                                            } catch (err) {
                                                console.log("Download error");
                                                console.log(err);
                                                errMessage_import.classList.remove("hidden");
                                                errMessage_import.textContent = `${modName}, ${fileURL}: ${err}`;
                                                await zipReader.close();
                                                return false
                                            }
                                        }
                                    }
                                }
                            }

                            let downloadedBrowserSounds = {}
                            if (browserArray != null) {
                                console.log("Unzipping Browser Sounds");

                                for (const [soundCategory, soundsArray] of Object.entries(browserArray)) {
                                    console.log("fetching",soundCategory)
                                    downloadedBrowserSounds[soundCategory] = []
                                    for (const fileURL of soundsArray) {
                                        if (fileURL != "") {
                                            console.log('[GXM] Unzipping',fileURL);
                                            
                                            try {
                                                let result = null
                                                var fileObject = entries.find(obj => {
                                                    return obj.filename.toLowerCase() === fileURL.toLowerCase()
                                                })
                                                if (fileObject) {
                                                    let blobWriter = new zip.BlobWriter();
                                                    result = await fileObject.getData(blobWriter, {transferStreams: false, useWebWorkers: false});
                                                }
                            
                                                if (result != null) {
                                                    downloadedBrowserSounds[soundCategory].push(result)
                                                } else {
                                                    errMessage_import.classList.remove("hidden");
                                                    errMessage_import.textContent = `${modName}: Couldn't find ${fileURL}`;
                                                    await zipReader.close();
                                                    return false
                                                }
                                            } catch (err) {
                                                console.log("Download error");
                                                console.log(err);
                                                errMessage_import.classList.remove("hidden");
                                                errMessage_import.textContent = `${modName}, ${fileURL}: ${err}`;
                                                await zipReader.close();
                                                return false
                                            }
                                        }
                                    }
                                }
                            }

                            let downloadedWebMods = {}
                            if (cssArray != null) {
                                console.log("Fetching Web Mods");

                                let modIndex = 0
                                for (const [webMod, webData] of Object.entries(cssArray)) {
                                    console.log("fetching a web mod")

                                    downloadedWebMods[modIndex] = {
                                        matches: webData.matches,
                                        enabled: true,
                                        css: [],
                                    }
                                    for (const fileURL of webData.css) {
                                        if (fileURL != "") {
                                            console.log('[GXM] Unzipping',fileURL);
                                            try {
                                                let css = null
                                                var fileObject = entries.find(obj => {
                                                    return obj.filename.toLowerCase() === fileURL.toLowerCase()
                                                })
                                                if (fileObject) {
                                                    let textWriter = new zip.TextWriter();
                                                    css = await fileObject.getData(textWriter, {transferStreams: false, useWebWorkers: false});
                                                }

                                                if (css != null) {
                                                    // 🐺 https://github.com/opera-gaming/gxmods/blob/main/documentation/Mod_Template/webmodding/opera.css
                                                    // Opera GX uses env() CSS variables which aren't changeable by WebExtensions (as far as I know.)
                                                    // We need to do conversion on download to detect the env variables and change them to regular old
                                                    // CSS variables.
                                                    console.log(`Converting ${fileURL}`)
                                                    let worked = true

                                                    if (worked) {
                                                        const editedCSS = css.replaceAll("env(-", "var(--")
                                                        const editedBlob = new Blob([editedCSS], {
                                                            type: 'text/css'
                                                        });

                                                        downloadedWebMods[modIndex].css.push(editedBlob)
                                                    } else {
                                                        errMessage_import.classList.remove("hidden");
                                                        errMessage_import.textContent = `${modName}: Conversion failed for web mod ${fileURL}`;
                                                        await zipReader.close();
                                                        return false
                                                    }
                                                } else {
                                                    console.log("Got a null result");
                                                    errMessage_import.classList.remove("hidden");
                                                    errMessage_import.textContent = `${modName}: Couldn't find ${fileURL}`;
                                                    await zipReader.close();
                                                    return false
                                                }
                                            } catch (err) {
                                                console.log("Download error");
                                                console.log(err);
                                                errMessage_import.classList.remove("hidden");
                                                errMessage_import.textContent = `${modName}, ${fileURL}: ${err}`;
                                                await zipReader.close();
                                                return false
                                            }
                                        }
                                    }
                                }
                            }

                            let downloadedThemes = {}
                            if (themeArray != null) {
                                downloadedThemes = themeArray // lol
                            }
                            await zipReader.close();

                            try {
                                let previousData = await localforage.getItem(MOD_DATABASE_KEY);
                                if (previousData == null) {
                                    previousData = {}
                                }
                                if (previousData[modId]) {
                                    errMessage_import.textContent = "Mod ID is already in use, please try saving again";
                                    errMessage_import.classList.remove("hidden");
                                    return false
                                } else {
                                    previousData[modId] = {
                                        displayName: modName,
                                        source: "Imported from zip",
                                        layers: ((downloadedLayers.length > 0) ? downloadedLayers : null),
                                        keyboardSounds: ((Object.keys(downloadedKeyboardSounds).length > 0) ? downloadedKeyboardSounds : null),
                                        browserSounds: ((Object.keys(downloadedBrowserSounds).length > 0) ? downloadedBrowserSounds : null),
                                        webMods: ((Object.keys(downloadedWebMods).length > 0) ? downloadedWebMods : null),
                                        theme: ((Object.keys(downloadedThemes).length > 0) ? downloadedThemes : null),
                                        version: (manifestSource.version ? manifestSource.version : "unknown"),
                                        icon: (iconData ? iconData : null)
                                    }
                                    try {
                                        localforage.setItem(MOD_DATABASE_KEY, previousData).then(function(value) {
                                            console.log("Saved successfully")
                                            updateModList()
                                            modal_import.classList.add("hidden");

                                            while (zipPreview.firstChild) {
                                                zipPreview.removeChild(zipPreview.firstChild);
                                            }
                                            for (const url of iconUrls) {
                                                URL.revokeObjectURL(url);
                                            }
                                            zipsToSave.length = 0;
                                            iconUrls.length = 0;
                                            filePicker.value = "";
                                            acceptButton_import.disabled = true
                                            const para = document.createElement("span");
                                            para.textContent = "No files currently selected";
                                            para.classList.add("emptyState");
                                            zipPreview.appendChild(para);

                                            return true
                                        }).catch(function(err) {
                                            console.log(err);
                                            errMessage_import.textContent = "Write error; check console for details!";
                                            errMessage_import.classList.remove("hidden");
                                            return false
                                        });
                                    } catch (err) {
                                        console.log(err);
                                        errMessage_import.textContent = "Write error; check console for details!";
                                        errMessage_import.classList.remove("hidden");
                                        return false
                                    }
                                }
                            } catch (err) {
                                console.log(err);
                                errMessage_import.textContent = "Read error; check console for details!";
                                errMessage_import.classList.remove("hidden");
                                return false
                            }
                        } else {
                            errMessage_import.classList.remove("hidden");
                            errMessage_import.textContent = `${modName} isn't compatible with GXM.`;
                            await zipReader.close();
                            return false
                        }
                    } else {
                        errMessage_import.classList.remove("hidden");
                        errMessage_import.textContent = `${modName}: Couldn't find mod data`;
                        await zipReader.close();
                        return false
                    }
                }
            } else {
                errMessage_import.classList.remove("hidden");
                errMessage_import.textContent = `${file.name}: Couldn't find manifest; likely not a mod.`;
                await zipReader.close();
                return false
            }
            await zipReader.close();
        } else {
            errMessage_import.classList.remove("hidden");
            errMessage_import.textContent = `${file.name}: Not a valid zip file.`;
            return false
        }
    }
}




// https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
const fileTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wave",
  "audio/wav",
  "audio/x-wav",
  "audio/x-pn-wav",
  "audio/ogg",
  "video/ogg",
];

function validFileType(file) {
  return fileTypes.includes(file.type);
}

const zipFileTypes = [
    "application/zip",
    "application/x-zip-compressed",
];

function validZipFile(file) {
    return zipFileTypes.includes(file.type);
}
  
function returnFileSize(number) {
  if (number < 1024) {
    return `${number} bytes`;
  } else if (number >= 1024 && number < 1048576) {
    return `${(number / 1024).toFixed(1)} KB`;
  } else if (number >= 1048576) {
    return `${(number / 1048576).toFixed(1)} MB`;
  }
}

openModalButton.onclick = function() {
    errMessage.classList.add("hidden");
    modal.classList.remove("hidden");
};

cancelButton.onclick = function() {
    modal.classList.add("hidden");
};

acceptButton.onclick = function () {
    acceptButton.disabled = true
    verifyAndSaveMod()
    acceptButton.disabled = false
};

openImportModalButton.onclick = function() {
    errMessage_import.classList.add("hidden");
    modal_import.classList.remove("hidden");
};

cancelButton_import.onclick = function() {
    modal_import.classList.add("hidden");
};

acceptButton_import.onclick = function () {
    acceptButton_import.disabled = true
    errMessage_import.classList.add("hidden");
    trySaveZipMod()
    acceptButton_import.textContent = "Add mod"
};

debugButton.onclick = function() {
    modal_debug.classList.remove("hidden");
    return false;
};
cancelButton_debug.onclick = function() {
    modal_debug.classList.add("hidden");
};


if (document.readyState === "loading") {
    console.log("[GXM Manager] Waiting for DOM Content Load");
    document.addEventListener("DOMContentLoaded", function() {
        updateModList();
    });    
} else {
    console.log("[GXM Manager] DOM content is already loaded!");
    updateModList();
}

browser.storage.local.onChanged.addListener(updateModList);

debugButton.textContent = `GX Mods ${browser.runtime.getManifest().version}`
const debugLoggingBox = document.getElementById('enableSoundLogs');
const exportLogButton = document.getElementById('export_log');
const clearLogButton = document.getElementById('empty_log');

async function initDebugOptions() {
    debugLoggingBox.checked = await browser.runtime.sendMessage('isdebuglogenabled')
    exportLogButton.disabled = !debugLoggingBox.checked
    clearLogButton.disabled = !debugLoggingBox.checked
}

debugLoggingBox.addEventListener("change", function() {
    const selectedOption = debugLoggingBox.checked; // Get the selected value
    browser.runtime.sendMessage('debug_logenabled_' + selectedOption)

    exportLogButton.disabled = !debugLoggingBox.checked
    clearLogButton.disabled = !debugLoggingBox.checked
});

function downloadLog(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
}

exportLogButton.onclick = async function () {
    let includeSensitive = confirm(`Do you want to include tab URLs in this log export?\nPress "OK" for yes or "Cancel" for no.\n\nPick "Cancel" if you aren't sure, as tab URLs may expose sensitive data.`)
    let debugString = await browser.runtime.sendMessage({
        intent: "exportLog",
        redact: !includeSensitive
    })
    downloadLog(`GXM-DebugLog${!includeSensitive ? "-REDACTED" : ""} @${Date.now()}.txt`, debugString)
};

clearLogButton.onclick = function () {
    if (confirm(`Really clear debug logs?`)) {
        browser.runtime.sendMessage('cleardebuglogs')
    } 
};