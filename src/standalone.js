const EventEmitter = require('node:events');
const libv86 = require('../web-gdb/build/libv86.js');
const path = require('path');

class GdbHost extends EventEmitter {
  uploadFile(name, content) {
    this.emulator.create_file(name, content);
  }

  processArgs(argv) {
    console.log('processArgs', argv);
    let gdbArglist = [];
    let workspace = '.';
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--workspace') {
        ++i;
        if (i >= argv.length) {
          console.error('--workspace specified without a directory');
          process.exit(1);
        }
 	workspace = path.resolve(argv[i]);
      } else if (argv[i] === '--import-file') {
	++i;
	if (i >= argv.length) {
	  console.error('--import-file specified without a file');
	  process.exit(1);
	}

	let file_spec = path.join(path.relative(workspace, path.resolve(path.join(workspace, argv[i]))));
        this.emulator.create_file(file_spec, fs.readFileSync(argv[i], 'rb'));
      } else {
	gdbArglist.push(argv[i]);
      }
    }

    let gdb_sh = `#!/bin/sh\ncd /mnt\nexec gdb "${gdbArglist.join('" "')}"\n`;
    console.log(gdb_sh);
    try { this.emulator.create_file('gdb.sh', new TextEncoder().encode(gdb_sh)); } catch (e) { console.error(e); }
    console.log('gdb_sh should exist');
  }

  onLoaded(data) {
    this.processArgs(this.gdbArgs);
    this.emulator.run();
    this.emit('loaded', data);
  }

  constructor(gdbArgs) {
    super();
    this.settings = {
      wasm_path: path.resolve(path.dirname(__filename), '../web-gdb/build/v86.wasm'),
      bios: { url: path.resolve(path.dirname(__filename), '../web-gdb/bios/seabios.bin') },
      bzimage: { url: path.resolve(path.dirname(__filename), '../images/bzImage') },
      cmdline: 'root=/dev/ram0 tsc=reliable mitigations=off random.trust_cpu=on acpi=force earlycon=uart,0x3f8 idle=halt root=/dev/ram0 console=ttyS0',
      autostart: false,
      disable_speaker: true,
      memory_size: 512 * 1024 * 1024,
      vga_memory_size: 2 * 1024 * 1024,
      filesystem: {},
      uart1: true,
      autostart: true
    };
    this.communicator = new EventEmitter();
    this.emulator = null;
    this.conncted = null;
    this.gdbArgs = gdbArgs;
  }

  input(data) {
    this.emulator.serial0_send(data);
  }

  serial(data) {
    this.emulator.serial_send_bytes(1, data);
  }

  init() {
    const emulator = new libv86.V86(this.settings);

    emulator.add_listener('emulator-loaded', (data) => this.onLoaded(data));
    emulator.add_listener('serial0-output-char',  (data) => this.emit('serial0', data));
    emulator.add_listener('serial1-output-char', (data) => this.emit('serial1', data));

    this.emulator = emulator;
  }
}

const moduleTarget = this.module ?? this.window ?? this;
moduleTarget.libv86 = libv86;
moduleTarget.GdbHost = GdbHost;
