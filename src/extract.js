var fs = require("fs");
//var fstream = require('fstream');
tar = require('tar'),
    zlib = require('zlib');

/**
 * The function responsible for reading PTO files.
 * @param input The path to the PTO file to read.
 */
module.exports = function extract(input) {
    var fullbuffer = Buffer.from(fs.readFileSync(input));
    var fullstring = fullbuffer.toString('hex'); /*(() => {
        let part = Array.from(fullbuffer).map((v) => {
            return v.toString(16).padStart(2,"")
        })
        return part.join("").toLowerCase()
    })();*/
    var trimmed = fullstring;
    var HEAD_data = {};
    if (!fullstring.includes("0101c4")) throw new Error("[extract/extract] No separators found! This is not a PTO file!")
    // Trim to start of HEAD
    trimmed = fullstring.substring(fullstring.indexOf(/0101c4/) + 7);
    while (!trimmed.startsWith("0101c4")) {
        let x = headparse(trimmed, HEAD_data)
        trimmed = x[0] || trimmed;
        HEAD_data = x[1] || HEAD_data;
    }
    trimmed = trimmed.substr(7)
    // Begin parsing CODE section
    var CODE_inpoint = fullstring.length - trimmed.length;
    //if (manifest.codelength) {
    //  var CODE_length = manifest.codelength // number of bytes
    //} else {
        var CODE_length = trimmed.indexOf("0101c4") / 2; // number of array elements, as each is two chars long
    //}
    var CODE_data = fullbuffer.filter((v,i,a) => {return CODE_inpoint < i < (CODE_inpoint + CODE_length)});
    trimmed = trimmed.substr((CODE_length * 2) + 7);
    // Begin parsing ARCH section
    var ARCH_inpoint = fullstring.length - trimmed.length;
    //if (manifest.archlength) {
    //  var ARCH_length = manifest.archlength // number of bytes
    //} else {
        var ARCH_length = trimmed.indexOf("0101c4") / 2; // number of array elements, as each is two chars long
    //}
    if (ARCH_length > 0) console.warn("[extract/extract: WARN] Archives are not optimized. These may be big and everything is currently stored in memory.");
    var ARCH_data = fullbuffer.filter((v,i,a) => {return ARCH_inpoint < i < (ARCH_inpoint + ARCH_length)});
    trimmed = trimmed.substr((ARCH_length * 2) + 7);
    // Begin returning the data
    return { HEAD_data, CODE_data, ARCH_data }
}

/**
 * This function parses the header in its current state,
 * returning the updated manifest object and a new trim 
 * in an array.
 * @param {string} trimmed The existing trimmed state.
 * @param {object} manifest The existing manifest object.
 */
function headparse(trimmed,manifest) {
    //console.debug(trimmed);
    if (trimmed.startsWith("01fe")) { // Name
        trimmed = trimmed.substr(4);
        let trimpoint = trimmed.indexOf("ff");
        manifest.name = htoa(trimmed.substr(0,trimpoint+1));
        trimmed = trimmed.substr(trimpoint + 2);
    } else if (trimmed.startsWith("02fe")) { // Description
        trimmed = trimmed.substr(4);
        let trimpoint = trimmed.indexOf("ff");
        manifest.description = htoa(trimmed.substr(0,trimpoint+1));
        trimmed = trimmed.substr(trimpoint + 2);
    } else if (trimmed.startsWith("03fe")) { // UUID
        trimmed = trimmed.substr(4);
        manifest.uuid = trimmed.substr(0,32);
        manifest.uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
        trimmed = trimmed.substr(34); //UUID has a set length and should still be followed by FF
    } else if (trimmed.startsWith("04fe")) {
        trimmed = trimmed.substr(4);
        let trimpoint = trimmed.indexOf("ff");
        let x = trimmed.substr(0,trimpoint+1);
        if (x == "00") manifest.type = "application";
        else if (x == "01") manifest.type = "image";
        else if (x == "02") manifest.type = "audio";
        else if (x == "03") manifest.type = "video";
        else if (x == "10") manifest.type = "appdata";
        else {
            if (!(Array.from(process.argv).includes("--ignore-invalid") || Array.from(process.argv).includes("-i"))) console.warn("[extract/headparse: WARN] Invalid data type! Embedding directly as shown, as this may be intended behavior.");
            manifest.type = x;
        }
        trimmed = trimmed.substr(trimpoint + 2);
    } else if (trimmed.startsWith("0400fe")) {
        trimmed = trimmed.substr(7);
        let trimpoint = trimmed.indexOf("ff");
        let x = trimmed.substr(0,trimpoint+1);
        if (x == "00") manifest.apptype = "html";
        else {
            if (!(Array.from(process.argv).includes("--ignore-invalid") || Array.from(process.argv).includes("-i"))) console.warn("[extract/headparse: WARN] Invalid app type! Embedding directly as shown, as this may be intended behavior.");
            manifest.apptype = x;
        }
        trimmed = trimmed.substr(trimpoint + 2);
    }
    else {
        let key = trimmed.substr(0,trimmed.indexOf("fe")+1)
        if (!(Array.from(process.argv).includes("--ignore-invalid") || Array.from(process.argv).includes("-i"))) console.warn("[extract/headparse: WARN] Invalid field ("+key+")! Using the default settings, as this may be intended behavior.");
        trimmed = trimmed.substr(key.length + 3);
        let value = trimmed.substr(0,trimmed.indexOf("ff"))
        let trimpoint = trimmed.indexOf("ff");
        let x = trimmed.substr(0,trimpoint+1);
        manifest[key] = value
        trimmed = trimmed.substr(trimpoint + 2);
    }
    // console.debug(trimmed)
    // process.exit(1);
    return [trimmed, manifest];
}

/**
 * Converts *hex* to ASCII text.
 * @param {string} hex The base-16 string or byte array to convert.
 */
function htoa(hex) {
    var hxstr = "";
    /*if (hex instanceof Array) {
        hex.map((v) => {hxstr += v.toString(16).padStart(2,"0")})
    }
    else*/ if (typeof hex == "string") {
        hxstr = hex
    } else return ""
    var bytes = hxstr.match(/../g);
    var result = "";
    bytes.map((v) => {
        result = result + String.fromCharCode(parseInt(v, 16));
    })
    return result;
}