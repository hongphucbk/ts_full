//const url 
const urlsocket = 'http://127.0.0.1:3001',
	  urlbroker = 'mqtt://127.0.0.1:3005',
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
/*const socket = io.connect(urlsocket);
socket.on('connect', function() {
    console.log('Connected to server');
   
});*/
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
});

var History = mongoose.model('History', historySchema, 'history');
//console.log(Alarm)
//var TagName = "MAIN_01_VAR_ga_m_alarmhardfaultword{2}";
//var Value  =1;
console.log("helllo");

//function execute alarm
mqttclient.on('message', function (Topic, message) {
 
  console.log('DataHMI:',message.toString());
  var Data =JSON.parse(message.toString());
  console.log('TagName:',Data.TagName);
  console.log('Value:',Data.Value);
 //call function execute 
 ExecuteData(Data.TagName,Data.Value);
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
				//case alarm txt 
				//socket.emit('data','hellllo');
				//console.log('da send data ');
				//call funtion map retur bit 
				var mess = GetBit(Value);//return bit
				var alarmtext ="";
				var insertData = [];
				//console.log(mess);
				mess.forEach(function(element)
				{
					//query 
					docs.filter(function(doc)
					{
						if (doc.bit == element)
						{
							//console.log(doc)
							alarmtext+=doc.text+',';
							let data_save = {
								alarm_id :doc.id,
								value : 1,
								timestamp : new Date,
								machine: 1
								
							}
							insertData.push(data_save);
						}//return alarm text input bit value 
						
					}
					)
				})
				alarmtext=alarmtext.substring(0, alarmtext.length - 1);
				//console.log(insertData);
				var arr = insertData;
				History.insertMany(arr, function(err, docs) {
					if (err) {
						console.log('Err')
					}
				});
				console.log(alarmtext);
				//push to web socket 
				//socket.emit('AlarmText',alarmtext);

				//execute dulicate .
				//function insert 
				
			}
			else 
			{
				//case product realtime 
				//pulish socket io  {TagName : ,Value : }
				//insert db 
				//socket.emit('Product',Message);
				//insert db 
				//exeute with tag 'MAIN_04_HMI_HMI_m_productsize'
				if (TagName=='MAIN_04_HMI_HMI_m_productsize')
				{
					var size = ProductionSize(Value);
					console.log("Size:" ,size); 
				}
			}
			
		}
	});
}
function GetBit(dataIn)
{
	var jsontext =[];

	for (var index =0 ;index<16;index++)
	{
		var bit_ = integer.getBit(dataIn,index)//get bit 
		if (bit_)
		{
			jsontext.push(index);

		}
	}
	return jsontext;
}
function ProductionSize(TagProduct)
{
	var Size =['S-S Size','S-M Size','S-L Size','S-XL Size','T-S Size','T-M Size','T-L Size','T-XL Size','T-XXL Size'];
	return Size[TagProduct-1];
}