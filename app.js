
/**
 * Module dependencies.
 */

var express = require('express');
var ins = require('eyes').inspector();

var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res, next) {
  res.render('index', { title: 'Socket.IO Graph Test' });
});

var sockets = {};

app.post('/datapoint', function(req, res, next) {
  for (var sockid in sockets) {
    console.log('SOCKET ' + sockid);
    sockets[sockid].emit('datapoint', { value: req.body.value });
  }
  res.send(200, { result: 'OK' });
});

io.sockets.on('connection', function(socket) {
  console.log('CONNECT: ' + socket.id);
  sockets[socket.id] = socket;
  socket.emit('hello', { status: 'Connected @ ' + (new Date()) });
  socket.on('disconnect', function () {
    console.log('DELETE SOCKET ' + socket.id);
    delete sockets[socket.id];
  });
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode",
  app.address().port, app.settings.env);
