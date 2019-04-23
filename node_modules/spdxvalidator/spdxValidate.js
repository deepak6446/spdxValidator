const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const regexp1 = /\w*\/(\w+)/;
const regexp2 = /(\w*-?\w+?)@/;
const org = "organization"
let text = `
SPDXVersion: SPDX-2.1
DataLicense: CC0-1.0
DocumentNamespace: http://${org}.com/spdx/SPDXRef-BIO-1.0-05aadas11-83ab-258fac9fb4d3
DocumentName: BIO-1.0

## Creation Information
Creator: Organization: ${org} (foss-compliance@${org}.com)
Created: 2019-02-05T13:46:42Z
`;
exports.spdxGenerate = (licencePath) => {
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
  
  for (let i=0;i<allKeys.length;i++) {
      generateSPDX(jsonData[allKeys[i]], allKeys[i]);
  }

  const finalText = text + endText;

  writeFileSync('./licence.spdx', finalText);
  console.log('spdx file generated @', resolve('./licence.spdx'))
   
}

function generateSPDX(obj, key) {
  const header = `\n\n\n## Package Information  (Third Party)\n`;
  const packageName = key.startsWith('@') ? key.match(regexp1)[1] : key.match(regexp2)[1];
  let pSpdxId = key.replace(/@/g, '-.a.-')
  let spdxId = `${pSpdxId.replace(/\//gm, '-')}`;
  spdxId = 'SPDXRef-' + spdxId     // mandatory
  let packageSPDX = `
    PackageName: ${packageName}
    SPDXID: ${spdxId}
    PackageVersion: ${key.split('@').slice(-1)}
    PackageSupplier: NOASSERTION
    PackageOriginator: NOASSERTION
    PackageDownloadLocation: ${obj['repository']}
    PackageLicenseConcluded: ${obj['licenses']}
    PackageLicenseDeclared: ${obj['licenses']}
    PackageCopyrightText: ${obj['copyright'] ? '<text>' + obj['copyright'] + '</text>' : 'NOASSERTION'}
    Relationship: ${spdxId} PACKAGE_OF SPDXRef-BIO-1.0
    FilesAnalyzed: false
    `

  text += header;
  text += packageSPDX.replace(/^\s+/gm, '');
}