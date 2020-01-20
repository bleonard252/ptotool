//console.log("Visual")
var fs = require("fs");
const version = require("./package.json").version;

var build = require("./src/build");
var inspect = require("./src/inspect");

if (!module.parent) { // if running from a script
    var yargs = require("yargs")
        .scriptName("ptotool")
        .usage("$0 [options] <command> arguments...")
        .command("build <file> [output]", "Create a PTO file", (yargs) => {
            yargs.positional("file", {
                type: "string",
                describe: "The file to make a PTO file out of.",
                normalize: true
            })
            .positional("output", {
                type: "string",
                describe: "The output PTO file.",
                //alias: ["o", "out"],
                default: "built.pto",
                normalize: true
            })
            .option("datadir", {
                type: "string",
                default: "-",
                normalize: true,
                describe: "The folder in which the data files are located."
            })
            .option("manifest", {
                type: "string",
                normalize: true,
                describe: "A manifest.json. NPM's package.json is mostly compatible.",
                optional: true
            })
            //yargs.demandOption(["file"], "You have to have something to encode to a PTO file!")
        }, (args) => {
            // Build
            let mf = {};
            try {
                if (args.manifest) mf = JSON.parse(fs.readFileSync(args.manifest));
            } catch(e) {mf = {};}
            build(mf, args.file, args.datadir.toString() || "-", args.output)
        })
        .command("inspect <file>", "Get metadata about a PTO file", (yargs) => {
            //TODO: there should be an option ignore-invalid, which silences the invalid type/field warnings
            yargs.positional("file", {
                type: "string",
                describe: "The PTO file you want to read",
                normalize: true
            })
            .option("ignore-invalid", {
                type: "boolean",
                describe: "Ignore the invalid type/field warnings if you have custom fields in the PTO file.",
                default: false,
                alias: "i"
            })
        }, (args) => {
            // Inspect
            inspect(args.file);
        })
        .help()
        //.command("help", "Show this help", (yargs) => {
        //    yargs.showHelp()
        //})
        .version("v"+version)
        .alias("v","version")
        .alias("h", "help")
        .argv
}

//var Promise = (async function() {while (true) {}})()

var argv = yargs.argv || {}