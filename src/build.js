var fstream = require('fstream'),
    tar = require('tar'),
    zlib = require('zlib');
var fs = require("fs");

/**
 * The function responsible for creating PTO files.
 * @param manifest_json The manifest information as a JavaScript literal object.
 * @param mainfile The raw data buffer for the CODE section, or a string absolute path.
 * @param archivefile The raw data buffer for the ARCH section, or a string absolute path to a directory.
 * @param outfile The output file path. Should end in PTO.
 */
module.exports = function build(manifest_json, mainfile, archivefile, outfile) {
	// Define raw data sections and constants
	const SEPARATOR = 0x0101C4;
	const SEP_ARRAY = [0x01,0x01,0xC4];
	var HEAD_DATA = Buffer.from("");
	var CODE_DATA = Buffer.from("");
	var ARCH_DATA = Buffer.from("");
	//var FILE_DATA = []; //Buffer.from(0);
	if (!fs.existsSync(outfile)) var OutStream = fs.createWriteStream(outfile);
	else {console.error("[build] Stopped: File already exists"); return}
	// Convert manifest from JSON to PTO Manifest format
	HEAD_DATA = Buffer.from(json(manifest_json));
	if (typeof mainfile == "string") var CODE_stream = new fs.createReadStream(mainfile);
	else CODE_DATA = Buffer.from(mainfile);
	//var ARCH_TMP = fs.mkdtempSync("ptoarch")
	if (archivefile !== "-") var ARCH_STRM = fstream.Reader({ 'path': archivefile, 'type': 'Directory' }) /* Read the source directory */
		.pipe(new tar.Pack()) /* Convert the directory to a .tar file */
		.pipe(zlib.Gzip()) /* Compress the .tar file */
		//.pipe(fstream.Writer({ 'path': ARCH_TMP })); /* Give the output file name */
	//ARCH_DATA = Buffer.from(fs.readDir(archivefile));
	//TODO: add CODE and ARCH lengths
	// Write the file
	OutStream.write(Buffer.from(SEP_ARRAY));
	OutStream.write(HEAD_DATA)
	OutStream.write(Buffer.from(SEP_ARRAY));
	if (CODE_stream) CODE_stream.pipe(OutStream, {end: true});
	else OutStream.write(CODE_DATA);
	OutStream.write(Buffer.from(SEP_ARRAY));
	if (archivefile !== "-") ARCH_STRM.pipe(OutStream, {end: true}); // pipe in the archive
	OutStream.write(Buffer.from(SEP_ARRAY));
}

function json(manifest) {
	console.warn("[build/json: WARNING] The manifest is not fully parseable! Not all intended features have been added.");
	//return 0x0 //TODO: return manifest, after parsing it
	var bytearray = [];
	if (manifest.name && typeof manifest.name == "string") {
		bytearray.push(0x01,0xfe);
		let x = Array.from(manifest.name, (v,k) => {
			bytearray.push(v.charCodeAt(0))
			return v.charCodeAt(0)
		});
		//console.log(x)
		bytearray.push(0xff);
	};
	if (manifest.description && typeof manifest.description == "string") {
		bytearray.push(0x02,0xfe);
		let x = Array.from(manifest.description, (v,k) => {
			bytearray.push(v.charCodeAt(0))
			return v.charCodeAt(0)
		});
		bytearray.push(0xff);
	};
	if (manifest.uuid && typeof manifest.uuid == "string") {
		bytearray.push(0x03,0xfe);
		let ruuid = require("uuid/v4")().replace(/[-]/g,"")/*.join("")*/.toUpperCase().match(/../g);
		//let num = Number.from(ruuid).toString(16);
		let x = Array.from(ruuid);
		x.map((v)=>{bytearray.push(v)})
		//bytearray.concat(x);
		bytearray.push(0xff);
	} else {
		bytearray.push(0x03,0xfe);
		// let x = Array.from(require("uuid/v4")().match(/[0-9a-fA-f]/).join(""), (v,k) => {
		// 	return v.charCodeAt(0)
		// });
		let ruuid = require("uuid/v4")().replace(/[-]/g,"")/*.join("")*/.toUpperCase().match(/../g);
		//let num = Number(ruuid).toString(16);
		let x = Array.from(ruuid,(v) => {return Number.parseInt(v,16)});
		x.map((v)=>{bytearray.push(v)})
		/*console.log(x,ruuid)
		var decon_test = "";
		x.map((v) => {decon_test += v.toString(16).padStart(2,"0")})
		console.log(decon_test.toUpperCase())*/
		//Deconstruction seems to work. Just make sure you get the right length (16 bytes/array entries)
		//bytearray.concat(x);
		bytearray.push(0xff);
	}
	if (manifest.type && typeof manifest.type == "string") {
		bytearray.push(0x04,0xfe);
		if (manifest.type.match(/^app(lication)?$/)) bytearray.push(0x00)
		else if (manifest.type == "image") bytearray.push(0x01)
		else if (manifest.type == "audio") bytearray.push(0x02)
		else if (manifest.type == "video") bytearray.push(0x03)
		else if (manifest.type == "appdata") bytearray.push(0x10)
		else {console.warn("[build/json: WARN] Invalid data type! PTO files must have a type of application, image, audio, video, or appdata. An error value is being used instead (0x9999)."); 
			bytearray.push(0x99,0x99)} // in the bytes, 99 99 is easier to read. invalid PTO type
		bytearray.push(0xff);
	}
	if (manifest.apptype && typeof manifest.apptype == "string") {
		bytearray.push(0x04,0x00,0xfe);
		if (manifest.apptype == "html") bytearray.push(0x01)
		else {console.warn("[build/json: WARN] Invalid app type! PTO-based applications must have a valid app type. An error value is being used instead (0x9999).");
			bytearray.push(0x99,0x99)}
		bytearray.push(0xff);
	}
	return bytearray
}
