const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const regexp1 = /\w*\/(\w+)/;
const regexp2 = /(\w*-?\w+?)@/;
const licenceRegex = /^[ ]*Copyright.*$/
const spdxConfig = require(resolve('./spdxConfig.json'))

const org = spdxConfig.orgName ? spdxConfig.orgName : "organization"
const createrInfo = spdxConfig.createrInfo ? spdxConfig.createrInfo: `(foss-compliance@${org}.com)`
const title = spdxConfig.title ? spdxConfig.title: "organization title"
const downloadLocation = spdxConfig.downloadLocation ? spdxConfig.downloadLocation: "http://empower.orgname.com"


let text = `
SPDXVersion: SPDX-2.1
DataLicense: CC0-1.0
DocumentNamespace: http://${org}/spdx/SPDXRef-BIO-1.0-05aadas11-83ab-258fac9fb4d3
DocumentName: BIO-1.0

## Creation Information
Creator: Organization: ${title} (${createrInfo})
Created: 2019-02-05T13:46:42Z

## Relationships
Relationship: SPDXRef-DOCUMENT DESCRIBES SPDXRef-BIO-1.0
 
## Package Information (Supplier)
PackageName: BIO
SPDXID: SPDXRef-BIO-1.0
PackageVersion: 1.0
PackageSupplier: Organization: ${title}
PackageOriginator: Organization: ${title}
PackageDownloadLocation: ${downloadLocation}
PackageLicenseConcluded: LicenseRef-${title.replace(/ /g, "-")}-Commercial-License
PackageLicenseDeclared: LicenseRef-${title.replace(/ /g, "-")}-Commercial-License
PackageCopyrightText: <text>(c) Copyright 2019 Software AG, Darmstadt, Germany and/or Software AG USA
Inc., Reston, VA, USA and/or its subsidiaries and/or its affiliates and/or
their licensors.</text>
FilesAnalyzed: false

## License Information
LicenseID: LicenseRef-${title.replace(/ /g, "-")}-Commercial-License
LicenseName: Software AG Commercial License
ExtractedText: <text>Use, reproduction, transfer, publication or disclosure is prohibited except as specifically provided for in your License Agreement with Software AG.</text>

`;



let unique_ids = {}

let primaryDep, packageLock
exports.spdxGenerate = (licencePath) => {
  packageLock = require(resolve('./package-lock.json'))
  primaryDep = Object.keys(packageLock.dependencies)
  const endText = ``;

  let jsonData = readFileSync(licencePath, 'utf8');
  try {
    if (typeof jsonData === 'string') {
      jsonData = JSON.parse(jsonData);
    }
  } catch (e) {
    console.log(`error while parsing json file data`, e);
    return process.exit(0);
  }

  let allKeys = Object.keys(jsonData);

  for (let i = 0; i < allKeys.length; i++) {
    copy_right_text(jsonData[allKeys[i]]);
  }

  for (let i = 0; i < allKeys.length; i++) {
    try {
      generateSPDX(jsonData[allKeys[i]], allKeys[i], jsonData);
    } catch (error) {
      console.log("err: ", error)
    }

  }
  const finalText = text + endText;

  writeFileSync('./licence.spdx', finalText);
  console.log('spdx file generated @', resolve('./licence.spdx'))

}
const copy_right_text = (obj) => {

  let copy_right_text = ""
  if (obj['licenseFile']) {
    let licenceText = readFileSync(obj['licenseFile'], 'utf8');
    if (licenceText) {

      let text_arr = licenceText.split("\n")

      for (let text in text_arr) {
        let match = text_arr[text].match(licenceRegex)
        if (match && match[0]) {
          copy_right_text = match[0].trim()
        }
      }
    }
  }
  obj['copy_right_text'] = copy_right_text

}

function generateSPDX(obj, key, jsonObj) {
  const header = `\n\n\n## Package Information  (Third Party)\n`;
  const packageName = key.startsWith('@') ? key.match(regexp1)[1] : key.match(regexp2)[1];

  let spdxId = getSpdxId(key)

  let copy_right_text = obj['copy_right_text']

  while (unique_ids['SPDXRef-' + spdxId] != undefined) {
    spdxId = spdxId + String(Math.random())
  }

  unique_ids['SPDXRef-' + spdxId] = true

  if (!unique_ids['SPDXRef-' + spdxId]) {
    unique_ids['SPDXRef-' + spdxId] = true
  } else {
    if (!unique_ids['SPDXRef-' + spdxId]) {
      unique_ids['SPDXRef-' + spdxId] = true
    }
  }

  let packageSPDX = `
    PackageName: ${packageName}
    SPDXID: ${'SPDXRef-' + spdxId}
    PackageVersion: ${key.split('@').slice(-1)}
    PackageSupplier: NOASSERTION
    PackageOriginator: NOASSERTION
    PackageDownloadLocation: ${obj['repository']}
    PackageLicenseConcluded: ${obj['licenses']}
    PackageLicenseDeclared: ${obj['licenses']}
    PackageCopyrightText: ${copy_right_text ? copy_right_text : 'NOASSERTION'}
    Relationship: ${spdxId} PACKAGE_OF SPDXRef-BIO-1.0
    FilesAnalyzed: true
    PackageVerificationCode: d6a770ba38583ed4bb4525bd96e50461655d2758
    PackageChecksum: SHA1: 85ed0817af83a24ad8da68c2b5094de69833983c
    PackageLicenseInfoFromFiles: ${obj['licenses']}
    `

  text += header;
  text += packageSPDX.replace(/^\s+/gm, '');

  let licenceSpdx = getLicenceSpdx(obj) // returns SPDXRef+licence file path
  let [licenceInfo, licence] = attachLicenceInfo(obj, licenceSpdx, copy_right_text, spdxId, packageName)

  text += licenceInfo
  text += licence.replace(/^\s+/gm, '');

  attachFileInfo(key, spdxId, jsonObj, packageName)
}

const getSpdxId = (key) => {
  let pSpdxId = key.replace(/@/g, '-.a.-')
  let spdxId = `${pSpdxId.replace(/\//gm, '-')}`;
  return spdxId;
}

const getLicenceSpdx = (obj) => {

  let licenceFilePath = obj['licenseFile']
  let licencepSpdxId = licenceFilePath.replace(/@/g, '-.a.-')
  let licenceSpdxId = `${licencepSpdxId.replace(/\//gm, '-')}`;
  let licenceSpdx = `SPDXRef${licenceSpdxId}`
  return licenceSpdx
}

/**
 * add only licence file info of package for all dependency packages info see attachFileInfo
*/
const attachLicenceInfo = (obj, licenceSpdx, copy_right_text, spdxId, packageName) => {

  // SPDXID should be a unique number
  while (unique_ids[licenceSpdx] != undefined) {
    licenceSpdx = licenceSpdx + String(Math.random())
  }

  unique_ids[licenceSpdx] = true

  let licenceInfo = `\n\n\n## File Information\n`

  let licence = `
  FileName: ${obj['licenseFile']}
  SPDXID: ${licenceSpdx}
  LicenseConcluded: ${obj['licenses']}
  LicenseInfoInFile: ${obj['licenses']}
  FileCopyrightText: ${copy_right_text ? copy_right_text : 'NOASSERTION'}
  FileChecksum: SHA1: d6a770ba38583ed4bb4525bd96e50461655d2758
  Relationship: ${spdxId} CONTAINS ${licenceSpdx}
  `

  return [licenceInfo, licence]

}

const attachFileInfo = (key, spdxId, jsonObj, packageName) => {

  key = key.substr(0, key.lastIndexOf('@'))

  if (primaryDep.indexOf(key) != -1) {
    let depenJson = packageLock.dependencies[key].dependencies
    if (!depenJson || !Object.keys(depenJson).length) return

    let dep_key_array = Object.keys(depenJson)

    for (let i = 0; i < dep_key_array.length; i++) {

      let dep_key = dep_key_array[i] + "@" + depenJson[dep_key_array[i]].version

      if (primaryDep.indexOf(dep_key_array[i]) == -1 || !jsonObj[dep_key]) continue;

      let dep_obj = jsonObj[dep_key]
      let dep_licenceSpdx = getLicenceSpdx(dep_obj)

      let [fileInfo, filelicence] = attachLicenceInfo(dep_obj, dep_licenceSpdx, dep_obj['copy_right_text'], spdxId)

      text += fileInfo
      text += filelicence.replace(/^\s+/gm, '');

    }
  }

}