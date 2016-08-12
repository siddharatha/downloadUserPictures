var jsforce = require('jsforce');
var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var fs= Promise.promisifyAll(require('fs'));
var mkdirp = require('mkdirp');
var status = require('node-status')

var conn = new jsforce.Connection({
	oauth2 : {    
		"loginUrl" : "<fill your loginUrl here >"
			"clientId" : "<fill your clientId here >"
			"clientSecret" : "<fill your clientSecret here >"
			"redirectUri" : "<fill your redirectUri here >"
	}
});

var username='<fill your username>';
var password='<fill your password>';
var instanceurl = '';
var orgid = '';
var validpictures=[];
var pictureprogress = {};

var userquery = "SELECT Id,FullPhotoUrl FROM User WHERE IsActive=true and contactId=null";

var failanddisplay = function(err){ console.log(err); }
console.time('start');
mkdirp.sync('downloadpics');
fs.readFileAsync('processedlist','utf8')
.then(function(filedata){
	var alreadyprocessedlist = filedata.toString().split('\n')
	return getValidPictures(alreadyprocessedlist);	
})
.then(getPictures)
.then(function(res){
	console.timeEnd('start');
})
.catch(failanddisplay);


function getValidPictures(alreadyprocessedlist){
	return new Promise(function(resolve,reject){
		conn.login(username,password,function(err,res){
			if(err) return console.log(err);
			var curlstring='';
			var query = conn.query(userquery)
			.on('record',function(record){
				if(record.FullPhotoUrl != 'https://se--UATbFO--c.cs43.content.force.com/profilephoto/005/F' && !_.contains(alreadyprocessedlist,record.Id))
					validpictures.push(record);
			})
			.on('end',function(err,result){
				resolve(validpictures);
			})
			.run({ autoFetch : true, maxFetch : 40000 });
		});
	});
}

function getPicture(record){	
return new Promise(function(resolve,reject)	{
	request.get(record.FullPhotoUrl).auth(null, null, true, conn.accessToken).pipe(fs.createWriteStream('./downloadpics/'+record.Id+'.png')).on('finish',function(){
		pictureprogress.inc();
		resolve('done for '+record.Id);
	});		
});
}

function getPictures(records){
console.log(records.length);	
	pictureprogress = status.addItem("pictures", {
  type: ['bar','percentage'],
  max: records.length
});
	status.start()
	return Promise.map(records, function(record) {    
		return getPicture(record);
	}, {concurrency: 100});

}




