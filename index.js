const Server = require('./server.js');
const fs = require('fs');
const express = require('express');
const multer = require("multer");
const WebSocket = require('ws');
const fetch = require('node-fetch');
const mc = require('minecraft_head');
const propertiesToJSON = require("properties-to-json");
const app = express();

fs.writeFileSync('logs/latestOLD.log', fs.readFileSync('logs/latest.log'));
fs.writeFileSync('logs/latest.log', '');

let properties = propertiesToJSON(fs.readFileSync('server.properties').toString());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'mods/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = file.originalname;
        req.fileShit = uniqueSuffix;

        cb(null, file.fieldname + '-' + uniqueSuffix);
    },
    limits: {fileSize: 100000000}
})

const upload = multer({ storage: storage });

const server = new WebSocket.Server({
    port: 8080
});

let mserver = new Server();
let playerCallback;

let sockets = [];
server.on('connection', function(socket) {
    sockets.push(socket);

    socket.on('message', function(msg) {
        if(msg.toString() === 'start'){
            mserver.start();

            fs.writeFileSync('logs/latestOLD.log', fs.readFileSync('logs/latest.log'));
            fs.writeFileSync('logs/latest.log', '');
        } else{
            mserver.send(msg);
        }
    });

    socket.on('close', function() {
        sockets = sockets.filter(s => s !== socket);
    });
});

mserver.data = ( msg ) => {
    let splitMsg = msg.split(' ');
    splitMsg.shift();

    if(splitMsg.join(' ').includes('[Server thread/INFO]: There are ') && splitMsg.join(' ').includes(' of a max of ') && splitMsg.join(' ').includes('players online')){
        splitMsg.shift();
        splitMsg.shift();
        splitMsg.shift();
        splitMsg.shift();
        splitMsg.shift();
        splitMsg.shift();
        splitMsg.shift();
        splitMsg.shift();
        splitMsg.shift();
        splitMsg.shift();
        splitMsg.shift();
        splitMsg.shift();

        splitMsg = splitMsg.join(' ');
        splitMsg = splitMsg.split('\r\n');
        splitMsg = splitMsg.join('');
        splitMsg = splitMsg.split(',');

        playerCallback(splitMsg);
    }

    log(msg);
}

mserver.error = ( msg ) => {
    log(msg);
}

mserver.exit = ( code ) => {
    console.log('Exited with code: '+code)
    mserver.status = 'offline';
    log('æ:stop');
}

let log = (data) => {
    sockets.forEach(s => s.send(data));
}

app.use('/assets', express.static('public'));
app.all('/p/v1/console', (req, res) => {
    res.render('console.ejs')
})

app.all('/p/v1/home', (req, res) => {
    res.render('home.ejs')
})

app.all('/p/v1/mods', (req, res) => {
    res.render('mods.ejs')
})

app.all('/p/v1/players', (req, res) => {
    res.render('players.ejs')
})

app.get('/api/v1/config', (req, res) => {
    res.json(properties)
})

app.get('/api/v1/loadedmods', (req, res) => {
    res.json(fs.readdirSync('mods'));
})

app.get('/p/v1/mods/upload', (req, res) => {
    res.render('upload.ejs')
})

app.get('/api/v1/players', (req, res) => {
    playerCallback = ( players ) => {
        res.json(players)
    }

    mserver.send('list');
})

app.get('/api/v1/tex/:hash', (req, res) => {
    fetch('https://textures.minecraft.net/texture/'+req.params.hash).then(data => data.body.pipe(res));
})

app.get('/api/v1/mc', (req, res) => {
    mc.nameToUuid(req.query.q).then((data) => {
        mc.getSkin(data.uuid).then((uuid) => {
            res.json({ data: data, skin: uuid })
        }).catch((error) => {
            console.log(error)
            res.json({error: "something oofed"})
        });
    }).catch((error) => {
        console.log(error)
        res.json({error: "something oofed"})
    });
})

app.post("/p/v1/mods/upload", upload.single('file'), (req, res) => {
    res.redirect('/p/v1/mods')
})

app.get('/api/v1/loadlogs', (req, res) => {
    res.json({
        status: mserver.status,
        logsHTML: fs.readFileSync('logs/latest.log').toString().split('\n').join('<br />')
    })
})

app.listen(80);