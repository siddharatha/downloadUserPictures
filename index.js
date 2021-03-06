var jsforce = require('jsforce');
var request = require('request');
var _ = require('underscore');
var Promise = require('bluebird');
var fs= Promise.promisifyAll(require('fs'));
var mkdirp = require('mkdirp');

var conn = new jsforce.Connection({
	oauth2 : {    
		"loginUrl" : "<fill in the loginUrl> "
			"clientId" : "<fill in the clientId> "
			"clientSecret" : "<fill in the clientSecret> "
			"redirectUri" : "<fill in the redirectUri> "
	}
});

var username='xxxxxxxx';
var password='xxxxxxxx';
var instanceurl = '';
var orgid = '';
var validpictures=[];
var totalpics = 0;
var dummyprofileurl = ''; // can use https://se--sandboxname--c.cs43.content.force.com/profilephoto/005/F'

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
.then(function(){
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
				if(record.FullPhotoUrl != dummyprofileurl && !_.contains(alreadyprocessedlist,record.Id))
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
		console.log('finished processing '+ record.Id);
		resolve();
	});		
});
}

function getPictures(records){
	totalpics = records.length;
	return Promise.map(records, function(record) {    
		return getPicture(record);
	}, {concurrency: 30});

}




