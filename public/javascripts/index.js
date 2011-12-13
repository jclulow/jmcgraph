var socket;
var connected = false;

var allSeries = {};
function subscribe(series) {
  if (allSeries.hasOwnProperty(series))
    return; // skip already subscribed
  var o = {
    series: series,
    subscribeSent: true,
    subscribeAcked: false,
    data: [],
    current: { value: null, ttl: 0 }
  };
  // prefill series with null data
  for (var i = 0; i < 100; i++) {
    o.data.push(o.current.value);
  }
  allSeries[series] = o;
  // send subscribe to server
  if (connected) {
    socket.emit('subscribe.series', {
      series: series
    });
  }
}

var plot;
function initGraph() {
  var opts = {
    //yaxis: { show: true, min: 0, max: 40000 },
    //xaxis: { show: true, max: 100 }
  };
  plot = $.plot($("#placeholder"), [], opts);
}

function drawGraph() {
  var zips = [];
  for (var series in allSeries) {
    var s = allSeries[series];
    var zip = [];
    for (var i = 0; i < s.data.length; i++) {
      zip.push([i, s.data[i]]);
    }
    zips.push(zip);
  }
  plot.setData(zips);
  plot.setupGrid();
  plot.draw();
}

function addPoint(series, pt) {
  var s = allSeries[series];
  s.data.push(pt);
  while (s.data.length > 100) {
    s.data.shift();
  }
}

setInterval(function() {
  for (var series in allSeries) {
    var s = allSeries[series];
    addPoint(series, s.current.value);
    if (s.current.ttl === 0)
      s.current.value = null;
    else
      s.current.ttl--;
  }
  drawGraph();
}, 1000);

var statusLines = [];
var statusLineNumber = 0;
function updateStatus(str) {
  statusLines.push('[' + (++statusLineNumber) + '] ' + str);
  while (statusLines.length > 5)
    statusLines.shift();
  console.log('status: ' + str);
  $('p#status').html(statusLines.join("<br>"));
}

var reconTimes = 0;
$(function() {
  initGraph();
  socket = io.connect();
  socket.on('hello', function(inp) {
    updateStatus(inp.status);
    reconTimes = 0;
  });
  socket.on('datapoint', function(inp) {
    if (!isNaN(inp.value) && inp.series) {
      console.log('data(' + inp.series + '): ' + inp.value);
      var s = allSeries[inp.series];
      if (s) {
        s.current.value = inp.value;
        s.current.ttl = 5;
      }
      /*addPoint(inp.value);
      drawGraph();*/
    }
  });
  socket.on('disconnect', function() {
    updateStatus('Disconnected from server.');
    reconTimes = 0;
    connected = false;
    // mark all subscriptions for resend
    for (var series in allSeries) {
      var s = allSeries[series];
      s.subscribeSent = false;
      s.subscribeAcked = false;
    }
  });
  socket.on('reconnecting', function() {
    reconTimes++;
    updateStatus('Reconnecting... (attempt ' + reconTimes + ')');
  });
  socket.on('connect', function() {
    connected = true;
    updateStatus('Connected... Awaiting Response...');
    // send all pending subscriptions
    for (var series in allSeries) {
      var s = allSeries[series];
      socket.emit('subscribe.series', { series: s.series });
      s.subscribeSent = true;
    }
  });
  socket.on('subscribe.series.ok', function(inp) {
    updateStatus('Subscribe OK for Series: ' + inp.series);
  });
  socket.on('subscribe.series.error', function(inp) {
    updateStatus('Subscribe Failure: ' + inp.message);
  });
  subscribe('series.one');
  subscribe('series.two');
});
