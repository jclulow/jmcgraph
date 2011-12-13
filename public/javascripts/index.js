var socket;

var data = [];
for (var i = 0; i < 100; i++) {
  data.push(null);
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
  var zip = [];
  for (var i = 0; i < data.length; i++) {
    zip.push([i, data[i]]);
  }
  plot.setData([zip]);
  plot.setupGrid();
  plot.draw();
}

function addPoint(pt) {
  data.push(pt);
  while (data.length > 100) {
    data.shift();
  }
}

var curData = null;
var curDataAge = 5;
setInterval(function() {
  addPoint(curData);
  drawGraph();
  if (curDataAge === 0)
    curData = null;
  else
    curDataAge--;
}, 1000);

function updateStatus(str) {
  console.log('status: ' + str);
  $('p#status').text(str);
}

var reconTimes = 0;
$(function() {
  initGraph();
  socket = io.connect('http://localhost:3000');
  socket.on('hello', function(inp) {
    updateStatus(inp.status);
    reconTimes = 0;
  });
  socket.on('datapoint', function(inp) {
    if (!isNaN(inp.value)) {
      console.log('data: ' + inp.value);
      /*addPoint(inp.value);
      drawGraph();*/
      curData = inp.value;
      curDataAge = 5;
    }
  });
  socket.on('reconnecting', function() {
    reconTimes++;
    updateStatus('Disconnected from server.' +
      'Reconnecting... (attempt ' + reconTimes + ')');
  });
  socket.on('connect', function() {
    updateStatus('Connected... Awaiting Response...');
  });
});
