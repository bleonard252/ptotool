var extract = require("./extract");

module.exports = async function inspect(filename) {
    var extracted = await extract(filename);
    //extracted.CODE_data = []; //don't need it. free up that memory
    //extracted.ARCH_data = []; //don't need it either. free up that memory
    var manifest = extracted.HEAD_data;
    console.log(extracted);
    
    console.log("FILE METADATA");
    if (manifest.name) console.log("Name: "+manifest.name);
    if (manifest.description) console.log("Description: "+manifest.description);
    if (manifest.uuid) console.log("UUID: "+manifest.uuid);

    if (manifest.type) console.log("\nAPP INFORMATION")
    if (manifest.type) console.log("File type: "+manifest.type);
    if (manifest.type && manifest.apptype) console.log("App type: "+manifest.apptype)

    if (extracted.CODE_path || extracted.ARCH_path) console.log("\nEXTRACTION LOCATION");
    if (extracted.CODE_path) console.log("CODE Path: "+extracted.CODE_path);
    if (extracted.ARCH_path) console.log("ARCH Path: "+extracted.ARCH_path);
    return
}