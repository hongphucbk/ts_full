var mongoose = require('mongoose');
var historySchema = new mongoose.Schema({
	alarm_id: String,
	value: Number,
	timestamp: Date,
	machine: Number,
	name: String,
	bit: Number,
	text: String,
	note: String,
});

var History = mongoose.model('History', historySchema, 'history');

module.exports = History;