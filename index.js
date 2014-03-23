"use strict";

var through = require("through");
var jade = require("jade");
var fs = require("fs");
var path = require("path");
var _ = require("underscore")

module.exports = function (fileName) {
    if (!/\.jade$/i.test(fileName)) {
        return through();
    }

    var inputString = "";
    var jadeifyConfig = {}
    var jadeifyConfigLoaded = false

    return through(
        function (chunk) {
            inputString += chunk;
        },
        function () {
            
            var self = this
            var compile = function(){
                var opts = { filename: fileName, compileDebug: jadeifyConfig.debug || false };

                var templateFunction;
                if (jade.compileClient) {
                    templateFunction = jade.compileClient(inputString, opts);
                } else {
                    opts.client = true;
                    templateFunction = jade.compile(inputString, opts);
                }

                var moduleBody = "var jade = require(\"jade/runtime\");\n\n"
                if(jadeifyConfig.local_variables) {
                    for(var key in jadeifyConfig.local_variables)
                        moduleBody += "var "+key+" = "+jadeifyConfig.local_variables[key]+";\n"
                }
                moduleBody += "module.exports = " + templateFunction.toString() + ";";

                self.queue(moduleBody);
                self.queue(null);
            }

            if(!jadeifyConfigLoaded)
                if(fs.existsSync(process.cwd()+"/dna")) {
                    var DNA = require("organic").DNA
                    var dna = new DNA()
                    dna.loadDir(process.cwd()+"/dna", function(){
                        if(dna.jadeify) {
                            if(dna[process.env.CELL_MODE])
                                dna.mergeBranchInRoot(process.env.CELL_MODE)
                            _.extend(jadeifyConfig, dna.jadeify)
                            jadeifyConfigLoaded = true
                            compile()
                        }
                    })
                } else
                if(fs.existsSync(process.cwd()+"/jadeify.json")) {
                    jadeifyConfig = require(process.cwd()+"/jadeify.json")
                    jadeifyConfigLoaded = true
                    compile()
                } else {
                    jadeifyConfigLoaded = true
                    compile()
                }
            else
                compile()
        }
    );
};
