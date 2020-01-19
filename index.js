//console.log("Visual")
var fs = require("fs");
const version = require("./package.json").version;

var build = require("./src/build");

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
            // TODO: where does the manifest come from?
            let mf = {};
            try {
                if (args.manifest) mf = JSON.parse(fs.readFileSync(args.manifest));
            } catch(e) {mf = {};}
            build(mf, args.file, args.datadir || 0, args.output)
        })
        .command("inspect <file>")
        .help()
        //.command("help", "Show this help", (yargs) => {
        //    yargs.showHelp()
        //})
        .version("v"+version)
        .alias("v","version")
        .alias("h", "help")
        .argv
}