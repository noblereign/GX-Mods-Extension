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


var colourIsLight = function (r, g, b) {
    // Counting the perceptive luminance
    // human eye favors green color... 
    var a = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    console.log(a);
    return (a < 0.5);
}

function injectAccents(accentColor, backgroundColor) {
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

    const previousAccents = document.getElementById("gxm_accents");
    if (previousAccents) {
        previousAccents.remove()
    }

    var customStyles = document.createElement('style'); 
    customStyles.setAttribute("id", "gxm_accents");
    customStyles.appendChild(document.createTextNode(accentVars));
    document.documentElement.insertBefore(customStyles, null); 
}

browser.runtime.onMessage.addListener((message) => {
    if (message.accentColor && message.backgroundColor) { // accent color update
        console.log("Accent color updated, changing now!")
        injectAccents(message.accentColor, message.backgroundColor)
        return true
    }
    return false
});