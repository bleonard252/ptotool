var fs = require("fs");
//var fstream = require('fstream');

/**
 * The function responsible for reading PTO files.
 * @param input The path to the PTO file to read.
 */
module.exports = function extract(input) {
    var fullbuffer = Buffer.from(fs.readFileSync(input));
    var fullstring = (() => {
        let part = fullbuffer.map((v) => {
            return v.toString(16).padStart(2,"")
        })
        return part.join("").toLowerCase()
    })();
    var trimmed = fullstring;
    var HEAD_data = {};
    // Trim to 
    trimmed = fullstring.substring(fullstring.indexOf(/0101c4/) + 6);
    while (!trimmed.startsWith("0101c4")) {
        let x = headparse(trimmed, HEAD_data)
        trimmed = x[0] || trimmed;
        HEAD_data = x[1] || HEAD_data;
    }
    // Begin parsing CODE section

    //...
}

/**
 * This function parses the header in its current state,
 * returning the updated manifest object and a new trim 
 * in an array.
 * @param {string} trimmed The existing trimmed state.
 * @param {object} manifest The existing manifest object.
 */
function headparse(trimmed,manifest) {

}