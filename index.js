require('dotenv').config();
var bodyParser = require('body-parser')


const express = require('express')
const app = express()
const port = 3000

var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use((req, res, next) => {
  res.locals.user = "";
  next()
})


//Khai bao api route
var apiHistoryRouter = require('./api/routes/history.route');
//==================
//--use api route
app.use('/api/history', apiHistoryRouter);


app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded



const cookieParser = require('cookie-parser')
app.use(cookieParser()) // use to read format cookie

var engine = require('ejs-locals');
app.engine('ejs', engine);
app.set('view engine', 'ejs');

app.use(express.static('public'));  
//app.use(express.static(path.join(__dirname, 'public'))); 
app.set('views', './views');

//app.use(express.static(path.join(__dirname, 'public')));

// Khai báo Router --------------------------------------------------
var userRouter = require('./routes/user.route');
var authRouter = require('./routes/auth.route');
//var measurementRouter = require('./routes/measurement.route');

var emailRouter = require('./routes/email.route');

var alarmRouter = require('./routes/alarm.route');
var historyRouter = require('./routes/history.route');
var realRouter = require('./routes/real.route');
//-------------------------------------------------------------------

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useFindAndModify: false});


app.get('/', function(req, res) {
	res.render('layout/index');
}) 

// Router -----------------------------------------------------------
app.use('/users', userRouter);
app.use('/auth', authRouter);


app.use('/email', emailRouter);


app.use('/alarm', alarmRouter);
app.use('/history', historyRouter);
app.use('/real', realRouter);
//-------------------------------------------------------------------

app.listen(port, function(){
	console.log(`Server listening on port ${port}!`)
});


// Add server MQTT
var mosca = require('mosca');
// var settings = {
// 		port:1883
// 		}

// //var server = new mosca.Server(settings);
// var server = new mosca.Server({
//   http: {
//     port: 3005,
//     bundle: true,
//     static: './'
//   }
// });

var settings = {
  http:{
    port: 3002  //MQTT for Web
  },
  port:3003,    //MQTT for PLC
  }

var server = new mosca.Server(settings);

server.on('clientConnected', function(client) {
   //console.log('client connected', client.id);
});
server.on('ready', function(){
	console.log("Server Mosca MQTT ready port " + settings.port);
});


var Datatest = require('./models/datatest.model')

//find when a message .is received
server.on('published',function getdata(packet,client) {
	if(packet.topic =='topic1/demo') 
	{
		// console.log('data: ', packet.topic);
		var data = packet.payload.toString();
		var jsondata = JSON.parse(data);

		var saveData = { "val" : jsondata }
				console.log('receive: ', saveData);

		Datatest.insertMany(saveData, function(err) {
			if (err) return handleError(err);
		});

	}

	if(packet.topic =='control/sdv6101') 
	{
		console.log('data: ', packet.topic);
		var data = packet.payload.toString();
		console.log('data to string: ', data);
	}
});


//-------------------------------------------------------------------
//Socket IO
http.listen(3001, function(){
  console.log('Socket io listening on *:3001');
});

io.on('connection', function(socket){
  console.log('a user connected');
  io.emit('data', "Hello user " + socket.id);

  socket.on('AlarmText', function(msg){
    console.log('Socket Data AlarmText = : ' + msg);
    let array = msg.split(',');
    console.log(array)
    io.emit('AlarmText', array);
  });

  socket.on('Alarm', function(msg){
    console.log('Socket Data AlarmText = : ' + msg);
    let text = msg.id + " - " + msg.text;
    console.log(text)
    io.emit('AlarmText', msg);
  });

  socket.on('Product', function(msg){
    console.log('Socket Data Product = : ' + msg);
    let JsonData = JSON.parse(msg)
    //let text = msg.id + " - " + msg.text;
    console.log(JsonData)
    io.emit('ProductText', JsonData);
  });


  // socket.on('Product', function(msg){
  //   console.log('Socket Data Product = : ' + msg);
  // });

});

//-------------------------------------------------------------------
// Import Excel 
if (false) {
	var Alarm = require('./models/alarm.model')
	var mongoXlsx = require('mongo-xlsx');
	var model = null;
	var xlsx  = './public/file.xlsx';
	mongoXlsx.xlsx2MongoData(xlsx, model, function(err, data) {
	  console.log(data);
	  /*
	  [{ Name: 'Eddie', Email: 'edward@mail' }, { Name: 'Nico', Email: 'nicolas@mail' }]  
	  */
	  Alarm.insertMany(data, function(err, docs) {
	  	if (err) {
	  		console.log("False" + err) 
	  	}
	  }); 

	});
}

