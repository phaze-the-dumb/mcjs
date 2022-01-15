const { spawn } = require('child_process');

class Server{
    constructor(){
        this.status = 'offline'
    }
    send(cmd){
        this.child.stdin.write(cmd+'\n')
    }
    start(){
        var child = spawn('java', ['-Xmx2G', '-jar', 'server.jar', 'nogui']);
        this.child = child;
        this.status = 'starting'

        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (d) => {
            this.data(d);

            let splitMsg = d.split(' ');
            splitMsg.shift();

            let checkSum = splitMsg.join(' ');
            checkSum = checkSum.split('(').join(')');
            checkSum = checkSum.split(')');

            checkSum = checkSum[0]+checkSum[2];
            if(checkSum.includes('[Server thread/INFO]: Done ! For help, type "help"')){
                this.status = 'online'
            }
        });

        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (d) => this.error(d));

        child.on('close', (d) => this.exit(d));
    }
}

module.exports = Server;