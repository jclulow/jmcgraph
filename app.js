
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

app.post('/datapoint', function(req, res, next) {
  var series = req.body.series;
  var value = req.body.value;
  if (series && value) {
    sendDataPoint(series, value);
    return res.send(200, { result: 'OK' });
  } else {
    return res.sendError(new Error({ message: 'must supply series && value' }));
  }
});

var allSeries = {};
function lookupSeries(name) {
  if (allSeries.hasOwnProperty(name))
    return allSeries[name];
  else
    return null;
}

function subscribe(socket, series) {
  var s = lookupSeries(series);
  if (s) {
    console.log('SUBSCRIBE ' + socket.id + ' TO ' + s.name);
    s.subscribers[socket.id] = socket;
    return (true);
  } else {
    return (false);
  }
}
function unsubscribeAll(socket) {
  for (var series in allSeries) {
    var s = allSeries[series];
    if (s.subscribers.hasOwnProperty(socket.id)) {
      console.log('UNSUBSCRIBE ' + socket.id + ' FROM ' + series.name);
      delete s.subscribers[socket.id];
    }
  }
}
function sendDataPoint(series, value) {
  var s = lookupSeries(series);
  if (!s) {
    s = allSeries[series] = { name: series, subscribers: {} };
  }
  for (var sockid in s.subscribers) {
    var sock = s.subscribers[sockid];
    sock.emit('datapoint', {
      series: series,
      value: value
    });
  }
}

io.sockets.on('connection', function(socket) {
  console.log('CONNECT: ' + socket.id);

  socket.emit('hello', { status: 'Connected @ ' + (new Date()) });

  socket.on('disconnect', function () {
    console.log('DISCONNECT SOCKET ' + socket.id);
    unsubscribeAll(socket);
  });

  socket.on('subscribe.series', function(inp) {
    if (!inp.series)
      return;
    if (subscribe(socket, inp.series)) {
      socket.emit('subscribe.series.ok', {
        series: inp.series
      });
    } else {
      socket.emit('subscribe.series.error', {
        series: inp.series,
        message: 'could not subscribe series "' + inp.series + '"'
      });
    }
  });
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode",
  app.address().port, app.settings.env);
