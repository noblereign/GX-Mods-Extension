let audioContext = new (window.AudioContext || window.webkitAudioContext)();

const MOD_DATABASE_KEY = "GXMusicMods"

const modal = document.getElementById('createModModal')
const openModalButton = document.getElementById('createModButton')

const modList = document.getElementById('modListList')
const modItemTemplate = document.getElementById('modItemTemplate')

const filePicker = document.getElementById('files');
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

filePicker.addEventListener("change", updateDisplay);
SFXfilePicker.addEventListener("change", updateSFXDisplay);

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

/*const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
});*/

async function updateModList() {
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
    try {
        let previousData = await localforage.getItem(MOD_DATABASE_KEY);
        if (previousData == null) {
            previousData = {}
        }
        if (previousData[modName]) {
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
                                    try {
                                        localforage.setItem(MOD_DATABASE_KEY, previousData).then(function(value) {
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
                    } else {
                        try {
                            localforage.setItem(MOD_DATABASE_KEY, previousData).then(function(value) {
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
                    }
                },
                function(error) {
                    console.log(`Error while checking if need to swap: ${error}`);
                }
            );
        } else {
            console.log(modName,"doesn't even exist in the first place...");
            return true
        }
    } catch (err) {
        console.log(err);
        return false
    }
}

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

        try {
            let previousData = await localforage.getItem(MOD_DATABASE_KEY);
            if (previousData == null) {
                previousData = {}
            }
            if (previousData[modId]) {
                errMessage.textContent = "Mod name is already in use.";
                errMessage.classList.remove("hidden");
                return false
            } else {
                previousData[modId] = {
                    displayName: modName,
                    source: "Local",
                    layers: (saveArray.length > 0 ? saveArray : null),
                    keyboardSounds: ((Object.keys(saveKeyboard).length > 0) ? saveKeyboard : null),
                    browserSounds: ((Object.keys(saveSFX).length > 0) ? saveSFX : null),
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
                    // This code runs if there were any errors.
                    console.log(err);
                    errMessage.textContent = "Write error; check console for details!";
                    errMessage.classList.remove("hidden");
                    return false
                }
            }
        } catch (err) {
            // This code runs if there were any errors.
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



// https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
const fileTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wave",
  "audio/wav",
  "audio/x-wav",
  "audio/x-pn-wav"
];

function validFileType(file) {
  return fileTypes.includes(file.type);
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

document.addEventListener("DOMContentLoaded", function() {
    updateModList();
});

browser.storage.local.onChanged.addListener(updateModList);
/*
browser.runtime.onMessage.addListener(async (message, sender) => {
    if ((typeof message === 'object') && (message != null)) {
        if (message.intent == "updateModLists") {
            console.log('[GXM] updating mod list')
            updateModList();
        }
    }
});*/