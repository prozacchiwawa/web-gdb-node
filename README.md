About
----

A build of the linux kernel and supporting scripts based on the work of https://github.com/wokwi/web-gdb
which allows gdb-15.1 multiarch to be run in v86 on the command line, connected to a local gdbserver.

Simple start
----

    node ./src/runner.js --gdb-server localhost:1234 --ex "target remote /dev/ttyS1"

This gives a convenient way to retrieve and run gdb-multarch anywhere node is available without needing
to make a local build for whatever host os and cpu is in use.  The process stdin and stdout interact with
gdb.  Command line arguments are passed through to gdb apart from ones recognized by the host runner:

    --gdb-server host:port
    --workspace <dir>
    --import-file <filename>

Any imported file will be relayed to /mnt in the vm in a directory relative to its position in the
workspace.

The vm starts with /dev/ttyS1 connected to the gdbserver so that ```target remote /dev/ttyS1``` will
start the debug session.

Versions:

- Build host: debian-12.13.0
- Kernel: 6.19.9
- python: 3.11.2
- binutils: 2.46.0
- gdb: 15.1
