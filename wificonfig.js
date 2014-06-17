"use strict";
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var ejs = require ('ejs');
var set = require('./settings').config;
//console.log("settings = "+JSON.stringify(set,null,2));
var config = set.config;
var networkConfig = set.networkConfig;

var RASPBERRY = 'raspberry';
var ARDUINO_GALILEO = 'arduinogalileo';

var RETRY_TIME = 2000;

function init(funct)
{
	findConfigFile(funct);
}

function findSSID (done)
{
	child_process.exec ('iwgetid -r', function (error, stdout, stderr)
	{
		if (!error)
		{
			done (stdout);
		}
		else
		{
			done (null);
		}
	});
}

/* Function searches for config file depending on the platform.  
	Step two. */
function findConfigFile(funct)
{
	var resetWIFI = false;		
	findSSID (function (ssid)
	{
		if(networkConfig.ssid != '' && ssid!=networkConfig.ssid)
		{
			resetWIFI = true;
		}

		//log.putLog ('Starting');
		//console.log('Starting');
		/* resets wifi if data has changed */
		if(resetWIFI)
		{
			// if(!fs.existsSync(WIFICONF))
			// 	wifi(newJsonData, functie);
			// else 
			wifi(funct);
		}
		else
			funct();
	});
}

function wifi(functie)
{
	var WIFIFORM = path.join(__dirname,'conf',config.board,'/wireless/wireless_form.conf');
	if (!fs.existsSync(WIFIFORM)) 
	{
		//console.log('Board specific WiFi Form not found, using default');
		log.putLog ('Board specific WiFi Form not found, using default');
		WIFIFORM = path.join(__dirname,'conf/wireless/wireless_form.conf');
	}
	try
	{
		var wifiData = fs.readFileSync(WIFIFORM);
		//console.log("wifidata = "+networkConfig.ssid);
		var fileWifi = ejs.render (wifiData.toString(), {ssid:networkConf.ssid,
							scan_ssid:networkConf.scan_ssid, psk:networkConf.psk});
		try
		{
			fs.writeFileSync(WIFICONF, fileWifi);
			child_process.exec ('sudo ifdown wlan0; sudo ifup wlan0', function (error, stdout, stderr)
			{
				if (error!=null) 
				{
					log.putLog("Error resetting Wifi, retrying "+stderr);
					/* retry after RETY_TIME miliseconds */
					setTimeout(function(){child_process.exec ('sudo ifdown wlan0; sudo ifup wlan0', function (error, stdout, stderr)
								{
									if (error!=null) 
									{
										/* retry after 2*RETRY_TIME miliseconds */
						
										setTimeout(function(){child_process.exec ('sudo ifdown wlan0; sudo ifup wlan0', function (error, stdout, stderr)
											{
												if (error!=null) 
												{
													log.putError('Wifi error' +stderr);	
												}
												else
												{
													functie();
												}
											})}, 2*RETRY_TIME);
									}
									else
									{
										functie();
									}
								})}, RETRY_TIME);							
				}
				else
				{
					functie();
				}
			});
		}
		catch(e)
		{
			//log.putError('Cannot write wifi file '+e);
			functie (settings);
		}
	}
	catch(e)
	{
		//log.putError('Cannot read wifi file '+e);
		 functie ();
	}	
}
exports.init = init;
