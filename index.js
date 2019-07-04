#!/usr/bin/env node

const ids = require('spdx-license-ids');
var Table = require('cli-table');
const { init } = require('license-checker');
const { writeFileSync } = require('fs');
const { resolve } = require('path');
const packJson = require('./package.json')
let jarPath = ""
exclude = packJson.name + "@" + packJson.version

//if generating licence file is enabled
console.log("Generating license for dependent nodemodules in current directory", resolve("./"))

init({
    start: './',
    excludePackages: exclude
}, function (err, packages) {
    if (err) {
        console.error(`error: ${err}`)
    } else {
        console.log("licence file generated at location", resolve("./license.json"))
        writeFileSync('license.json', JSON.stringify(packages, null, 2), 'utf8');

        try {
            // run using command 
            // jarPath=./spdx-tools-2.1.12-jar-with-dependencies spdxValidator

            if (process.argv && process.argv[2] && process.argv[2] == '--jarPath') {
                jarPath = process.argv[3]
                jarPath = resolve(process.argv[3])
                console.log("jar file path: ", jarPath)
            } else {
                console.log("please specify jar path using --jarPath 'location'")
                process.exit(0)
            }

            packages = removeInvalid(packages);

            console.log("storing valid License file: validLicense.json")

            writeFileSync('./validLicense.json', JSON.stringify(packages, null, 2), 'utf8');

            getSpdx(packages);

        } catch (error) {
            console.error(`error: ${error}`)
        }


    }
});

const removeInvalid = (packJson) => {

    console.log("removing packages with invalid licence file")

    let table = new Table({
        head: ['Package', 'Reason']
        , colWidths: [40, 60]
    });

    let removed = false
    let allKeys = Object.keys(packJson);
    allKeys.forEach(k => {
        if (typeof packJson[k] === 'object' && !Array.isArray(packJson[k])) {
            if (!ids.includes(packJson[k].licenses)) {
                removed = true
                table.push([k, `licence found: ${packJson[k].licenses}`])
                delete packJson[k]
            }
        }
    });

    if (removed) {
        console.log("\n\nRemoved Invalid spdx licence for module")
        console.log(table.toString());
        console.log("\n\nRerun with valid licence modules\n\n")
    }

    packJson = removePackagesFromScan(packJson)

    return packJson
}

const removePackagesFromScan = (packJson) => {
    var fs = require('fs')
    var data = fs.readFileSync('./scan.json', "utf8")

    if (!data) return
    else console.log("\n\nscan file found")

    var dataArr = JSON.parse(data).files
    let uniqueArr = []
    for (i = 0; i < dataArr.length; i++) {
        if (!dataArr[i].licenses.length) continue
        for (var j = 0; j < dataArr[i].licenses.length; j++) {
            if (dataArr[i].licenses[j].score == 100) {
                uniqueArr.push(resolve(dataArr[i].path))
            }
        }
    }

    const uniqueArray = (val, index, self) => {
        return self.indexOf(val) === index;
    }

    var unique = uniqueArr.filter(uniqueArray);
    
    display(unique, packJson)

    return packJson
}

const display = (unique, packJson) => {
    let table = new Table({
        head: ['Package', 'Action']
        , colWidths: [40, 60]
    });

    let removed = false

    for (key in packJson) {
        if (unique.indexOf(packJson[key].licenseFile) == -1) {
            removed =  true
            table.push([key, 'removed'])
            delete packJson[key]
        }
    }

    if (removed) {
        console.log(`\n\n100% licence not matched in ${key}, removed`)
        console.log(table.toString());
        console.log('\n\n')
    }
}
const getSpdx = (json) => {
    console.log("genertating spdx file")
    
    Object.keys(json).forEach((key) => {

        let licence = json[key].licenses

        if (Array.isArray(licence)) {
            licence = licence[0]
            json[key].licenses = licence
        }
        if (licence.indexOf("Version") != -1) {

            let packLicence = licenceFromPackage(json[key]["path"])
            if (packLicence) {
                json[key]['licenses'] = packLicence
            } else if (licence == "Apache License, Version 2.0") {
                json[key]['licenses'] = "Apache-2.0"
            }

        }

        if (licence.startsWith("(")) {

            let packLicence = licenceFromPackage(json[key]["path"])
            if (packLicence) {
                json[key]['licenses'] = packLicence
            } else {
                let index = licence.indexOf("OR")
                if (index == -1) { index = licence.indexOf("AND") }
                packLicence = licence.slice(licence.indexOf("(") + 1, index - 1)
                json[key]['licenses'] = packLicence
            }
        }

        if (licence == 'Unlicense') {

            let packLicence = licenceFromPackage(json[key]["path"])
            if (!packLicence || packLicence == licence) console.log(`error: licence not found for ${key}`);
            json[key]['licenses'] = packLicence

        } else if (licence.lastIndexOf('*') == (licence.length - 1)) {

            let packLicence = licenceFromPackage(json[key]["path"])
            if (!packLicence) { packLicence = trimLicence(licence, "*") }
            json[key]['licenses'] = packLicence

        } else if (licence.startsWith("Custom:")) {

            let packLicence = licenceFromPackage(json[key]["path"])
            if (!packLicence) console.log(`error: licence not found for ${key} found custom licence`);
        }

    })
    writeFile(json);
    spdxGenerator('./spdxlicense.json')
    if (jarPath) validateSpdx(jarPath);
    else {
        console.log("jar path not found for spdx validation")
    }
}

const spdxGenerator = (licencePath) => {
    require('./spdxValidate').spdxGenerate(licencePath)
}

const writeFile = (json) => {
    console.log("json license file stored at ./spdxlicense.json");
    writeFileSync('./spdxlicense.json', JSON.stringify(json, null, 2), 'utf8');
}

const validateSpdx = (jarPath) => {

    console.log("validating spdx file with jar file")
    let child = require('child_process').spawn(
        'java', ['-jar', jarPath, 'Verify', 'licence.spdx']
    );
    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stdout)
}

const licenceFromPackage = (path) => {
    const licence = require(resolve(path, "package.json"))['license']
    return licence
}

const trimLicence = (licence, sep) => {
    let i = licence.lastIndexOf(sep)
    let cha = licence.substr(0, i)
    return cha
}

process.on('exit', () => {
    console.log("\n\nvalidation completed!!!!")
})