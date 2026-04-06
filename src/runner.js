var net = require('net');
var process = require('process');
var service = require('./standalone.js');

class MessagePort {
  constructor() {
  }

  postMessage(m) {
    if (m.type == 'serial') {
      process.stdout.write(m.data);
    } else {
      console.log('<<', JSON.stringify(m));
    }
  }
};

class ServiceSpeaker {
	constructor() {
	}

	onmessage(m) {
		console.log(m);
	}
};

var msgport = new MessagePort();
var startOutput = 0;
var gdbServer = null;
var gdbArgs = [];
var serialAllowed = false;

for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] == '--gdb-server') {
    i++;
    if (i > process.argv.length) {
      console.error('no argument specified for gdb server');
      process.exit(1);
    }
    const serverSpec = process.argv[i].split(':');
    if (serverSpec.length != 2) {
      console.error('specify gdb server as host:port');
      process.exit(1);
    }
    gdbServer = { family: 4, host: serverSpec[0], port: parseInt(serverSpec[1]) };
  } else {
    gdbArgs.push(process.argv[i]);
  }
}
var gdbRunner = new service.GdbHost(gdbArgs);

if (!gdbServer) {
  console.error('--gdb-server must be specified as host:port');
  process.exit(1);
}

const netClient = new net.Socket();

gdbRunner.on('serial0', (data) => {
  if (data == '/') {
    startOutput++;
  }
  if (startOutput == 2) {
    process.stdout.write(': running gdb\n');
    gdbRunner.input('chmod +x /mnt/gdb.sh && /mnt/gdb.sh\n');
    serialAllowed = true;
    startOutput++;
  }
  if (startOutput >= 2) {
    process.stdout.write(data);
  }
});

gdbRunner.on('serial1', (data) => {
  if (!serialAllowed) {
    return;
  }
  const toSend = data;
  netClient.write(toSend);
});
netClient.on('data', (data) => {
  gdbRunner.serial(data);
});
gdbRunner.on('ready', (data) => {
  console.log('ready', data);
});
gdbRunner.on('loaded', (data) => console.log('loaded', data));

netClient.on('connect', () => {
  console.log('gdb connected, running client');
  gdbRunner.init(gdbArgs);
});
netClient.connect(gdbServer);

process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  if (data.type == 'Buffer') {
    const encoded = data.data.decode('utf8');
    console.log('tty', encoded);
    gdbRunner.input(encoded);
  } else {
    gdbRunner.input(data);
  }
});

process.stdin.on('end', () => {
	process.exit(1);
});
