#!/usr/bin/env node

var AGENT_NAME = 'smart-acl';
var VERSION = '0.01';

var sys = require("sys");
var posix = require("fs");
var postgres = require("postgres");
var server = require('router');
var ini = require('ini');

var smartAclConfig = './smartacl.conf';

/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
**/
 
var Base64 = {
 
	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
 
	// public method for encoding
	encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = Base64._utf8_encode(input);
 
		while (i < input.length) {
 
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
 
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
 
			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}
 
			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
 
		}
 
		return output;
	},
 
	// public method for decoding
	decode : function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
		while (i < input.length) {
 
			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));
 
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
 
			output = output + String.fromCharCode(chr1);
 
			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
 
		}
 
		output = Base64._utf8_decode(output);
 
		return output;
 
	},
 
	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	},
 
	// private method for UTF-8 decoding
	_utf8_decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;
 
		while ( i < utftext.length ) {
 
			c = utftext.charCodeAt(i);
 
			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		} 
		return string;
	}
}

// -- 
var c;
var smartaclconfig;
var auth;
var super_user;

posix.readFile(smartAclConfig, function(e, d) {
    if(e){
        throw new Error("[ERROR] Unable to read configuration file: " + smartAclConfig);
    } else {
        var config;
        try {
            config = ini.parse(d);
        } catch (err) {
            throw new Error("[ERROR] Unable to parse config file '" + smartAclConfig + "': " + err);
        }

        var smartaclconfig = config.smartacl;
        var username = smartaclconfig.admin_user;
        var password = smartaclconfig.admin_pass;
        super_user = smartaclconfig.super_user;

        // 401 Basic Auth username / password
        auth = "Basic " + Base64.encode(username + ":"+ password);

        var connect_info = '';
        connect_info += 'host=' + config.postgres.host + ' ';
        connect_info += 'dbname=' + config.postgres.database + ' ';
        connect_info += 'user=' + config.postgres.user + ' ';
        connect_info += 'password=' + config.postgres.password;
        c = postgres.createConnection(connect_info);
        
        c.addListener("connect", function() {
          sys.puts("connected");
          sys.puts(c.readyState);
        });

        c.addListener("close", function (err) {
          sys.puts("connection closed.");
          if (err) {
            sys.puts("error: " + err.message);
          }
        });

    }
});

function getCommitter(req, res, domain, username) {  
    
  if (!req.headers.hasOwnProperty('authorization') || (req.headers.hasOwnProperty('authorization') && (auth != req.headers['authorization']))) {  
    sys.debug("Not Authorized\n");
    res.simpleHtml(401,"Not Authorized\n");
  } else {
    // RSP requires a "super" user, so we add that here
    if(username == super_user){
      res.simpleJson(200,{canCommit:true});
      return;
    }

    getCommitterID(username,function(uid){
      if (uid != null) {
        getHostID(domain,function(hid){
          if (hid != null) {
            c.query("SELECT id FROM host_committer_map WHERE committer_id = "+uid+" AND host_id = " + hid + ";", function(results) {
              if (results != undefined) {
                res.simpleJson(200, {canCommit:true});
              } else {
                res.simpleJson(200, {canCommit:false});
              }
            });          
          } else {
            res.simpleJson(200, {canCommit:false});
          }
        });
      } else {
        res.simpleJson(200,{canCommit:false});
      }
    });
  }
}

function addCommitterMap(userID,hostID,callback) {
  c.query("SELECT id FROM host_committer_map WHERE committer_id = "+userID+" AND host_id = " + hostID + ";", function(results) {
    if (results == undefined) {
      c.query("INSERT INTO host_committer_map (host_id, committer_id) VALUES("+hostID+","+userID+") RETURNING id;", function(e) {
        var status = (e instanceof Error) ?  400 : 201;
        callback(status);
      });      
    } else {
      callback(409);
    }
  });
}

function getCommitterID(username, callback) {
  c.query("SELECT id FROM committer WHERE name = '"+username+"';", function(committerResults) {
     if (committerResults == undefined) {
       callback(null);
     } else {
      callback(committerResults[0]);
     }
  });    
}

function getInsertCommitterID(username, callback) {

  c.query("SELECT id FROM committer WHERE name = '"+username+"';", function(committerResults) {
     if (committerResults == undefined) {
       c.query("INSERT INTO committer (id, name, created_at) VALUES(DEFAULT,'"+username+"',NOW()) RETURNING id;", function(id) {
          callback(id);
       });    
     } else {
       callback(committerResults[0]);
     }
  });    
}

function getHostID(domain, callback) {
  c.query("SELECT id FROM hosts WHERE hosts = '"+domain+"';", function(results) {     
    if (results == undefined) {
      callback(null);            
    } else {
      callback(results[0]);      
    }
  });
}

function getInsertHostID(domain, callback) {
  c.query("SELECT id FROM hosts WHERE hosts = '"+domain+"';", function(results) {     
    if (results == undefined) {
      c.query("INSERT INTO hosts (id, hosts, created_at) VALUES(DEFAULT,'"+domain+"',NOW()) RETURNING id;", function(hostId) {  
        callback(hostId);
      });      
    } else {
      callback(results[0]);      
    }
  });
}

function postCommitter(req, res, domain, username) {
  
  if (!req.headers.hasOwnProperty('authorization') || (req.headers.hasOwnProperty('authorization') && (auth != req.headers['authorization']))) {  
    sys.debug("Not Authorized\n");
    res.simpleHtml(401,"Not Authorized\n");
    
  } else {
  
    getInsertHostID(domain,function(hostId){
      getInsertCommitterID(username,function(userId){
        addCommitterMap(userId,hostId,function(status){
          res.simpleJson(status,{done:status});
        });
      });        
    });
  }

}

// ================================= //

// GET /hosts/<smart-host>/committers/<user-name>
// curl -X GET --url http://127.0.0.1:8080/hosts/somedomain.com/committers/silentrob -u admin:secret -H 'Accept: application/json'
// Returns 200, 401, 404 
server.get(new RegExp("^\/hosts\/([a-z0-9.-]*)\/committers\/([a-z0-9]*)$"), getCommitter);

// POST /hosts/<smart-host>
// POST /hosts/<smart-host>/committers/<user-name>
// curl -X POST --url http://127.0.0.1:8080/hosts/somedomain.com/committers/silentrob -u admin:secret -H 'Accept: application/json'
// Returns 201, 400, 401, 404
// server.post(new RegExp("^\/hosts\/([a-z0-9.-]*)$"), postHost);
server.post(new RegExp("^\/hosts\/([a-z0-9.-]*)\/committers\/([a-z0-9]*)$"), postCommitter);
server.listen(8080);
