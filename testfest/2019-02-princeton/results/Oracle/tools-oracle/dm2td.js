// Author: Michael.Lagally@oracle.com
// Created: 7.5.2018
// Last modified: 27.9.2018

"use strict";

var fs = require("fs");
var path = require("path");
var baseDir = ".";

let appId="F68452F4-E498-4A15-BB14-E0DB0E0539DB";
let iotCSServer="129.150.200.242";

if (process.argv.length<5) {
   console.log ("Usage: node dm2td.js <deviceModel.json> <IoTCSServer> <applicationID> <deviceId> [-v]");
   console.log ("Example: node dm2td.js Blue_Pump.json 129.150.200.242 0-AB F68452F4-E498-4A15-BB14-E0DB0E0539DB");
   process.exit (-1);
}

var filename=process.argv[2];

iotCSServer = process.argv[3];
appId = process.argv[4];
var deviceId = process.argv[5];

var verbose=process.argv[6] ==="-v";

if (verbose) console.log(`td-dm started`);


var content=fs.readFileSync('./'+filename);
var path=filename.substring(0, filename.lastIndexOf("/"));
// get package directory name
var pkg=path.substring(path.lastIndexOf("/")+1);
// strip path and extension
var plainfn=path.substring(filename.lastIndexOf("/")+1, filename.lastIndexOf("."));

var dm=JSON.parse(content);
if (verbose) console.log(dm);

if (verbose) console.log("-----");

var td={};
td['@context']=["http://www.w3.org/ns/td" ];
td['@type'] = "Thing";
td.name=dm.name;
td.description=dm.description;
td.id=dm.urn;
td.version = {"instance":"1.0.0"};
let deviceUrn=dm.urn.replace(/:/g ,"%3A");
let base = "https://"+iotCSServer+"/iot/api/v2/apps/"+appId+"/devices/"+deviceId+"/deviceModels/"+deviceUrn;
td.base=base;

// Security
td.securityDefinitions= {
  "basic_sc": {
      "scheme": "basic",
      "in": "header"
  }
};
td.security=["basic_sc"];

var now=new Date(Date.now());
td.created=now.toISOString();
td.lastModified=now.toISOString();
td.userLastModified="auto-generated by dm2td converter";
td.support="mailto://Michael.Lagally@oracle.com";
td.properties={};
td.actions={};

for(var exKey in dm.attributes) {
  if (verbose) console.log("key:"+exKey+", value:"+dm.attributes[exKey]);
  var iac=dm.attributes[exKey];
  if (verbose) console.log(iac);
  var prop={};
  prop.name=iac.name;
  prop.description=iac.description;
  prop.type=iac.type.toLowerCase();
  prop.readOnly = !iac.writable;
  prop.writeOnly = false;
  prop.observable = false;
  if (!iac.alias) {
    prop.title=iac.name;
  } else {
    prop.title=iac.alias;
  };

  let name=prop.name;
  // added object properties
  prop.type="object";
  prop.properties= {};
  if (iac.writable) {
    prop.properties.value={
        "type": iac.type.toLowerCase(),
        "writable": true
    };
    prop.forms = [{
      "href" :  base+"/attributes/"+iac.name,
      "contentType": "application/json",
      "op": ["readproperty", "writeproperty"]
    }];
  } else {
    prop.properties.value={
      "type": iac.type.toLowerCase(),
      "writable": false
    };
    prop.forms = [{
      "href" :  base+"/attributes/"+iac.name,
      "contentType": "application/json",
      "op": ["readproperty"]
    }];
  }

  if (verbose) console.log(prop);

  td.properties[iac.name]=prop;
}

for(var exKey in dm.actions) {
  if (verbose) console.log("key:"+exKey+", value:"+dm.actions[exKey]);
  var iac=dm.actions[exKey];
  if (verbose) console.log(iac);
  var act={};

  act.name=iac.name;
  // we don't know more about the behavior of actions, 
  // so we mark them as not safe and not idempotent
  act.safe = false;
  act.idempotent = false;
  act.description=iac.description;
  if (iac.argType) {
    var inp={};
    inp.type="object";
    // these are now optional in the updated TD spec and don't make 
    // a lot of sense for action parameters
    inp.readOnly = false;
    inp.writeOnly = false;
    
    inp.properties={};
    inp.properties.value={};
    inp.properties.value.type=iac.argType.toLowerCase();
    if (iac.range) {
      inp.minimum=iac.range.split(",")[0];
      inp.maximum=iac.range.split(",")[1];
    }
    act.input=inp;
  }
  var out={};
  // these are now optional in the updated TD spec and don't make 
  // a lot of sense for action parameters
  out.readOnly = false;
  out.writeOnly = false;
  act.output=out;

  if (!iac.alias) {
    act.title=iac.name;
  } else {
    act.title=iac.alias;
  };

  act.forms = [{
    "href" : base+"/actions/"+act.name,
    "contentType": "application/json"
  }];

  td.actions[iac.name]=act;
}

if (verbose) console.log("-----");

console.log(JSON.stringify(td, null, "\t"));
