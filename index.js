// Place your server entry point code here
const http = require('http')
const express = require("express")
const app = express()
const db = require("./database.js");
const fs = require('fs')
const md5 = require('md5')
const morgan = require('morgan');
const args = require('minimist')(process.argv.slice(2))

// Help logs
const help = (`
    server.js [options]
    --port		Set the port number for the server to listen on. Must be an integer
                    between 1 and 65535.
    --debug	If set to true, creates endpoints /app/log/access/ which returns
                    a JSON access log from the database and /app/error which throws 
                    an error with the message "Error test successful." Defaults to 
            false.
    --log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.
    --help	Return this message and exit.
`)

if (args.help || args.h) {
    console.log(help);
    process.exit(0);
}

// Parses point and sets default port
args['port']
args['debug'] 
args['log']
args['help']
const port = args.port || process.env.port || 5555;
const debug = args.debug || 'false'
const log = args.log || 'true'

// Start the server
const server = app.listen(port, () => {
  console.log('App listening on port %PORT%'.replace('%PORT%',port))
});

if (log == 'true') {
  const writeStream = fs.createWriteStream('access.log', { flags: 'a' });
  app.use(morgan('combined', { stream: writeStream }));
} 


// App endpoints here
app.use( (req, res, next) => {
  let logdata = {
      remoteaddr: req.ip,
      remoteuser: req.user,
      time: Date.now(),
      method: req.method,
      url: req.url,
      protocol: req.protocol,
      httpversion: req.httpVersion,
      secure: req.secure,
      status: res.statusCode,
      referer: req.headers['referer'],
      useragent: req.headers['user-agent']
    }
  const stmt = db.prepare(`INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url,  protocol, httpversion, secure, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const info = stmt.run(logdata.remoteaddr.toString(), logdata.remoteuser, logdata.time, logdata.method.toString(), logdata.url.toString(), logdata.protocol.toString(), logdata.httpversion.toString(), logdata.secure.toString(), logdata.status.toString(), logdata.referer, logdata.useragent.toString())
  next();
})

if (debug){
  app.get('/app/log/access', (req, res) => {
    try {
      const stmt = db.prepare('SELECT * FROM accesslog').all()
      res.status(200).json(stmt)
    }catch(er){
      console.error(er)
    }
  });

  app.get("/app/error", (req, res) => {
    res.status(500)
    throw new Error("Error test successful.")
  })
}

app.get("/app/", (req, res) => {
  res.status(200).end("OK");
  res.type("text/plain");
});

app.get('/app/flip', (req, res) => {
  var flip = coinFlip()
  res.status(200).json({
      'flip': flip
  })
})

app.get('/app/flips/:number', (req, res) => {
  var rawFlips = coinFlips(req.params.number)
  var summaryFlips = countFlips(rawFlips)
  res.status(200).json({
      'raw': rawFlips,
      'summary': summaryFlips
  })
});

app.get('/app/flip/call/heads', (req, res) => {
  res.status(200).json(flipACoin('heads'))
})

app.get('/app/flip/call/tails', (req, res) => {
  res.status(200).json(flipACoin('tails'))
})

// Default endpoint
app.use(function(req, res){
  res.status(404).send('404 NOT FOUND')
});


// Functions
function coinFlip() {
    var result=Math.random();
    if(result<.5){
      return "tails";
    }
    else{
      return "heads";
    }
  }
  
  function coinFlips(flips) {
    var flipArray=[];
  
    for(var i=0; i<flips; i++){
      flipArray.push(coinFlip());
    }

    return flipArray;
  }
  
  function countFlips(array) {
    var headsCount=0, tailsCount=0;
    for(var i=0; i<array.length; i++){
      if(array[i] == "heads"){
        headsCount++;
      }
      else if(array[i] == "tails"){
        tailsCount++;
      }
    }
    let countObject={tails: tailsCount, heads:headsCount}
    return countObject;
  }
  
  function flipACoin(call) {
    var result;
    var flip=coinFlip();
    if(call == flip){
      result="win";
    }
    else{
      result="lose";
    }
    let coinObject={call:call, flip:flip, result:result};
    return coinObject;
  }