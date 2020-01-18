var fs = require("fs");

/**
 * The function responsible for creating PTO files.
 * @param manifest_json The manifest information as a JavaScript literal object.
 * @param mainfile The raw data buffer for the CODE section, or a string absolute path.
 * @param archivefile The raw data buffer for the ARCH section, or a string absolute path.
 * @param outfile The output file path. Should end in PTO.
 */
module.exports = function build(manifest_json, mainfile, archivefile, outfile) {
	// Define raw data sections and constants
	const SEPARATOR = 0x0101C4;
	const SEP_ARRAY = [0x01,0x01,0xC4];
	var HEAD_DATA = Buffer.from(0);
	var CODE_DATA = Buffer.from(0);
	var ARCH_DATA = Buffer.from(0);
	var FILE_DATA = []; //Buffer.from(0);
	var OutStream = fs.createWriteStream(outfile);
	// Convert manifest from JSON to PTO Manifest format
	HEAD_DATA = Buffer.from(json(manifest_json));
	CODE_DATA = Buffer.from(fs.readFile(mainfile));
	ARCH_DATA = Buffer.from(fs.readFile(archivefile));
	
}

function json(manifest) {
	console.warn("[build/json INDEV] The manifest is not yet parseable! Do not use this function yet!");
	return 0x0 //TODO: return manifest, after parsing it
}
