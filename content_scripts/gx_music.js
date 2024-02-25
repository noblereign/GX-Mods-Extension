function sendKeyboardCommand(event) {
  if (!event.repeat) {
    if (!(event.code.startsWith("Arrow"))) {
      if (event.code == "Space") {
        browser.runtime.sendMessage('spacedown');
      } else if (event.code == "Backspace") {
        browser.runtime.sendMessage('bkspdown');
      } else if (event.code == "Enter") {
        browser.runtime.sendMessage('enterdown');
      } else {
        if (event.code == "Control" || event.code == "Shift") {
          browser.runtime.sendMessage('keydown_silent');
        } else {
          browser.runtime.sendMessage('keydown');
        }
      }
    }
  }
}

function sendVisibilityChange(event) {
  browser.runtime.sendMessage('visibility=' + document.hidden);
}

let lastCursor = ""
function sendCursorEvent(event) {
  var cursor = getComputedStyle(event.target).cursor;
  if (lastCursor != "pointer") {
    if (cursor == "pointer") {
      browser.runtime.sendMessage('mousehover');
    }
  }
  lastCursor = cursor
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

(function() {
  window.addEventListener('mousedown',() => {
    browser.runtime.sendMessage('mousedown')
  })
  window.addEventListener('keydown',sendKeyboardCommand,{
    capture: true,
    once: false,
    passive: true
  })
  document.addEventListener('mouseover',sendCursorEvent,{
    capture: true,
    once: false,
    passive: true
  })
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
  document.addEventListener("visibilitychange",sendVisibilityChange,{
    capture: true,
    once: false,
    passive: true
  }) 
})();
