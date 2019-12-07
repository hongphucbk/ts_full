//const url 
const urlsocket = 'http://127.0.0.1:3001',
	  urlbroker = 'mqtt://127.0.0.1:3003',
	  urdb      = 'mongodb://124.158.10.133/taisun';  
	  
var mongoose = require('mongoose'),
	io = require('socket.io-client'),
	integer =require ("bitwise/integer"),
	mqtt = require('mqtt'),
	mqttclient  = mqtt.connect(urlbroker),
	Topic ="HMI1/Data";

mqttclient.on("connect",function(){	
console.log("mqtt connected");
mqttclient.subscribe(Topic, function (err) {
    if (!err) {
      console.log('successful');
    }
  });
})

//var urlsocket = 'http://172.16.0.18:3001';
const socket = io.connect(urlsocket);
socket.on('connect', function() {
    console.log('Socket io connected to server on ' + urlsocket);
});


mongoose.connect(urdb, {useNewUrlParser: true, useUnifiedTopology: true});
var alarmSchema = new mongoose.Schema({
	machine: Number,
	name: String,
	bit: Number,
	text: String,
	flag: Number,
	note: String
});
var Alarm = mongoose.model('Alarm', alarmSchema, 'alarm');
var historySchema = new mongoose.Schema({
	alarm_id: String,
	value: Number,
	timestamp: Date,
	machine: Number,
	note: String,
	name : String,
	bit : Number,
	text : String,
	complete: Number,
	start: Date,
	stop: Date,
	hmi_ack: Number,
	user_ack: String
});
var History = mongoose.model('History', historySchema, 'history');

//table history product
var productSchema = new mongoose.Schema({
	alarm_id: String,
	value: Number,
	timestamp: Date,
	machine: Number,
	note: String,
	name : String

});

var Product = mongoose.model('Product', productSchema, 'product');

console.log("helllo");

//function execute alarm
mqttclient.on('message', function (Topic, message) {
  console.log('DataHMI:',message.toString());
  var Data =JSON.parse(message.toString());
  console.log('TagName: ', Data.TagName);
  console.log('Value: ', Data.Value);
  //call function execute 
  ExecuteData(Data.TagName, Data.Value);
})


function ExecuteData(TagName,Value)
{
	Alarm.find({ name: TagName}, function (err, docs) {
		if(err){
			console.log("Error");
		}
		else 
		{
			if(docs.length > 1 )
			{
				dataget = GetBit(Value);
				for (var index =0 ;index<16;index++)
				{
					var bit_ = dataget[index];//get bit 
					FindAlarmRecord(bit_,TagName,index);
				}
			}
			else 
			{
				// production execute 
				var messageproduct ;
				messageproduct = '{'+'"TagName":"'+TagName+'",'+'"Value":'+ Value + '}'; 
					
				socket.emit('Product',messageproduct);
				//insert db 
				let insertData = [];
					//
				let data_save = {	
					alarm_id : docs[0].id,
					name : TagName,
					machine: 1,
					value : Value,
					timestamp : new Date	
					}
				insertData.push(data_save);
				var arr = insertData;
				Product.insertMany(arr, 
					function(err, docs)
					 {
						if (err)
						{
							console.log('Err: Insert data has error !!!');
						}	
						else 
						{
							console.log('insert new alarm success!!');
							console.log(arr);
						}
					});
				
			}
		}
	});
}
//

//execute record 
async function FindAlarmRecord(ValueBit,TagName,Bit)
{
	//var result ='';//insert break update 
	var data;
	let info = await getalarm(TagName,Bit);
	
	History.find({name:TagName,bit:Bit}).sort({_id:-1}).limit(1).exec(function(err,doc)
	{
		if (err){
			console.log('error!!!!');
		}
		else{
			if (ValueBit)//if value bit is true
			{
				//doc is return 1 record with input tagname bit .
				if(doc.length)
				{
					
					//if valueBit 1 and( have record and compete )
					if (doc[0].complete == 0)
					{
						console.log('complete is false  and value is true jump out',Bit,':',ValueBit);
						
					}
					else 
					{
						console.log('complete is true call insert funtion ');
						oneByOne(TagName,Bit);
					}
				}
				else 
				{
					//insertalarm(
					//no record 
					console.log('no record will insert new',Bit,':',ValueBit);
					//call inser function new record 
					//call insert infunction 
					//insertalarm(TagName,Bit);
					oneByOne(TagName,Bit);
				}
			}
			else 
			{
				//value is false 
				if(doc.length)
				{
					//console.log('xxxxxxxxxxxxxx');
					//console.log(doc[0]);
					//check complete flag 
					
					//if valueBit 1 and( have record and compete )
					if (doc[0].complete == 0)
					{
						console.log('call function update endtime for alarmtxt');
						//call function update endtime 
						updatealarm(TagName,Bit);
						// Process for socket 
						//console.log(info)
						let strSocketSend = {
							id : info.id,
							text : info.text,
							action: 'del'
						} 
						socket.emit('Alarm', strSocketSend);
						
					}
					else 
					{
						console.log('value bit is false and complete is false break');
						//break 
						
					}
				}
				else 
				{
					console.log('no record will break ');
					 //break 
				}
				
			}
				
		}
				

			//console.log('get maximum alarm txt:', doc[0].text);
		
	});
}


async function getalarm(tagname,alarmbit)
{
	var alarm = await Alarm.find({ name: tagname,bit : alarmbit});
	var infoAlarm = {
		id: alarm[0]._id,
		text: alarm[0].text
	}
	return infoAlarm;
}


async function oneByOne(tagname,alarmbit) {
	var alarm =  getalarm(tagname,alarmbit);

	alarm.then(function(doc)
	{
		console.log('xxxxxx', doc);
		insertalarm(tagname,alarmbit,doc.text);//call insert funtion 
		let strSocketSend = {
			id : doc.id,
			text : doc.text,
			action: 'add'
		} 
		console.log('xxxxxx2', strSocketSend);
		socket.emit('Alarm', strSocketSend);
	});
}
///////////function inser new alarm record // and publish new topic alarm 
function insertalarm(tagname,alarmbit,alarmtxt)
{
	var insertData = [];
	//
	let data_save = {	
		name : tagname,
		start : new Date,
		machine: 1,
		bit : alarmbit,
		text : alarmtxt,
		complete : 0
	}
	insertData.push(data_save);
	var arr = insertData;
	History.insertMany(arr, 
	function(err, docs)
	 {
		if (err)
		{
			console.log('Err: Insert data has error !!!');
		}	
		else 
		{
			console.log('insert new alarm success!!');
			console.log(arr);
		}
	});


}


//update stop time alrm txt
function updatealarm(tagname,alarmbit)
{
	History.findOne({name:tagname,bit:alarmbit,complete:0},function(err,doc)
	{
		doc.stop = new Date;
		doc.complete = 1;
		doc.save();

		
	});
}


function GetBit(dataIn)
{
	var arraybit =[];
	for (var index =0 ;index<16;index++)
	{
		var bit_ = integer.getBit(dataIn,index)//get bit 
		arraybit[index]= bit_;
	}
	return arraybit; //return json format 
}

function ProductionSize(TagProduct)
{
	var Size =['S-S Size','S-M Size','S-L Size','S-XL Size','T-S Size','T-M Size','T-L Size','T-XL Size','T-XXL Size'];
	return Size[TagProduct-1];
}
//function get alarm tag and bit and flag in hisorical.

