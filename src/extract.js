var fs = require("fs"),
    os = require("os"),
    path = require("path"),
    fstream = require('fstream'),
    tar = require('tar-fs'),
    zlib = require('zlib');

/**
 * The function responsible for reading PTO files.
 * @param input The path to the PTO file to read.
 */
module.exports = stream_extract;
function extract(input) {
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
    /*else {
        let key = trimmed.substr(0,trimmed.indexOf("fe")+1)
        if (!(Array.from(process.argv).includes("--ignore-invalid") || Array.from(process.argv).includes("-i"))) console.warn("[extract/headparse: WARN] Invalid field ("+key+")! Using the default settings, as this may be intended behavior.");
        trimmed = trimmed.substr(key.length + 3);
        let value = trimmed.substr(0,trimmed.indexOf("ff"))
        let trimpoint = trimmed.indexOf("ff");
        if (trimpoint < 0) {
            trimmed = "";
            return [trimmed, manifest]
        }
        let x = trimmed.substr(0,trimpoint+1);
        manifest[key] = value
        console.debug(trimmed, trimpoint);
        trimmed = trimmed.substr(trimpoint + 2);
    }*/ //for some reason, the program never exits if this is on.
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

// usestreams functions
function stream_extract(filename) {
    var END_DATA = {};
    var file = fs.createReadStream(filename);
    var found = false;
    var HEAD_string = "";
    var HEAD_data = {};
    file.setEncoding("hex");
    return new Promise((resolve, reject) => {
    file.once("readable", () => {
    while (found == false) { //BEGIN TRIMMING PROCESS!
        if (file.readableLength && file.readable) {
        let $1 = file.read(2); //get one byte
        let $3 = $1.padStart(2,"0");
        HEAD_string += $3;
        if (HEAD_string.endsWith("0101c4")) {
            HEAD_string = "";
            found = true;
        }
    }};
    found = false;
    while (found == false) { //Snip down the head section.
        let $1 = file.read(2); //get one byte
        //console.debug($1);
        let $3 = $1.padStart(2,"0");
        HEAD_string += $3;
        if (HEAD_string.endsWith("ff0101c4")) { //ends a value, then ends the section
            HEAD_string.replace("ff0101c4","");
            found = true;
            //console.debug(HEAD_string);
        }
    }
    found = false;
    while (HEAD_string !== "0101c4") {
        let x = headparse(HEAD_string, HEAD_data)
        HEAD_string = x[0] || HEAD_string;
        HEAD_data = x[1] || HEAD_data;
        //console.debug(x)
    }
    //nothing expects buffers yet. we can safely switch to streams :-)

    // BEGIN CODE SECTION
    var CODE_length = 0;
    //if (manifest.codelength) {
    //  CODE_length = manifest.codelength // number of bytes
    //}
    file.setEncoding("utf8"); //give me the buffers
    var CODE_path = os.tmpdir + "/.tmp-"+path.parse(filename).name+".pto.code";
    var CODE_stream = fs.createWriteStream(CODE_path);
    var CODE_lastbytes = []; //get the last 3 bytes, looking for a 0101c4*
    if (!CODE_length) { //this is the case, as CODE_length == 0
        while (found == false) {
            var $1 = file.read(2);
            CODE_lastbytes.push($1);
            if (CODE_lastbytes.length > 3) CODE_lastbytes.shift();
            if (CODE_lastbytes.includes(null)) throw new Error("[extract/stream_extract: ERROR] Reached end of file too soon!");
            else if (CODE_lastbytes[0] == '01' && CODE_lastbytes[1] == '01' && CODE_lastbytes[2] == 'c4') {
                found = true;
                CODE_stream.end();
            }
            else if (CODE_lastbytes.length == 3) {CODE_stream.write(Buffer.from([Number.parseInt(CODE_lastbytes[0],16)]))} //so, write the first thing in the buffer, that will get removed
        }
    }
    found = false;

    // BEGIN ARCH SECTION
    var ARCH_length = 0;
    //if (manifest.ARCHlength) {
    //  ARCH_length = manifest.ARCHlength // number of bytes
    //}
    // TODO: since this is the tgz filepath, extract to a tmpdir from this file
    var ARCH_file_path = os.tmpdir + "/.tmp-"+path.parse(filename).name+".pto.arch.tmp";
    var ARCH_stream = fs.createWriteStream(ARCH_file_path);
    file.setEncoding('hex');
    var ARCH_lastbytes = []; //get the last 5 bytes, looking for a 0101c4*
    if (!ARCH_length) { //this is the case, as ARCH_length == 0
        while (found == false) {
            while (found == false) {
                var $1 = file.read(2);
                ARCH_lastbytes.push($1);
                if (ARCH_lastbytes.length > 3) ARCH_lastbytes.shift();
                if (ARCH_lastbytes.includes(null)) throw new Error("[extract/stream_extract: ERROR] Reached end of file too soon!");
                else if (ARCH_lastbytes[0] == '01' && ARCH_lastbytes[1] == '01' && ARCH_lastbytes[2] == 'c4') {
                    found = true;
                    ARCH_stream.end();
                }
                else if (ARCH_lastbytes.length == 3) {ARCH_stream.write(Buffer.from([Number.parseInt(ARCH_lastbytes[0],16)]))} //so, write the first thing in the buffer, that will get removed
            }
        }
    }
    found = false;
    // BEGIN ARCH EXTRACT
    var ARCH_path = os.tmpdir + "/.tmp-"+path.parse(filename).name+".pto.arch"; //fs.mkdtempSync(".tmp-pto-ARCH.");
    if (ARCH_lastbytes.length > 0) {
        //ARCH_stream = fstream.DirWriter({ 'path': ARCH_path });
        var ARCH_fstream = fs.createReadStream(ARCH_file_path)
            .pipe(zlib.createGunzip())
            .pipe(tar.extract(ARCH_path));
            //.pipe(ARCH_stream);
    } else ARCH_path = "";
    //console.debug(ARCH_fstream);//{ HEAD_data, CODE_path, ARCH_path })
    resolve({ HEAD_data, CODE_path, ARCH_path });
    })})
}