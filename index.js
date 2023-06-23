const config = require('./config.json');

const fs = require('fs');
const { Base64Decode } = require('base64-stream')
const libqp = require('libqp');

const Imap = require('imap');
const imap = new Imap(config.imap);

function findAttachmentParts(struct, attachments) {
  attachments = attachments ||  [];
  for (var i = 0, len = struct.length, r; i < len; ++i) {
    if (Array.isArray(struct[i])) {
      findAttachmentParts(struct[i], attachments);
    } else {
      if (struct[i].disposition && ['inline', 'attachment'].indexOf(struct[i].disposition.type.toLowerCase()) > -1) {
        attachments.push(struct[i]);
      }
    }
  }
  return attachments;
}

function buildAttMessageFunction(attachment) {
  let filename = attachment.params.name;
  let encoding = attachment.encoding;
  let decoder = new libqp.Decoder();
  

  return function (msg, seqno) {
    let prefix = '(#' + seqno + ') ';
    msg.on('body', function(stream, info) {
      //Create a write stream so that we can stream the attachment to file;
      console.log(prefix + 'Streaming this attachment to file', filename, info);
      let writeStream = fs.createWriteStream( (config.downloads && config.downloads.directory) ? `${config.downloads.directory}/${filename}` : filename);
      writeStream.on('finish', function() {
        console.log(prefix + 'Done writing to file %s', filename);
      });

      //so we decode during streaming using 
      // if (encoding.toLowerCase() === 'base64') {
        //the stream is base64 encoded, so here the stream is decode on the fly and piped to the write stream (file)
        stream.pipe(decoder).pipe(writeStream)
      // } else  {
        //here we have none or some other decoding streamed directly to the file which renders it useless probably
        // stream.pipe(writeStream);
      // }
    });
    msg.once('end', function() {
      console.log(prefix + 'Finished attachment %s', filename);
    });
  };
}

imap.once('ready', function() {
  imap.openBox('INBOX', true, function(err, box) {
    if (err) throw err;
    var f = imap.fetch('1:*', {
      bodies: ['', 'TEXT'],
      struct: true
    });
    f.on('message', function (msg, seqno) {
      console.log('Message #%d', seqno);
      const prefix = '(#' + seqno + ') ';
      msg.on('body', function(stream, info) {
        var buffer = '';
        stream.on('data', function(chunk) {
          buffer += chunk.toString('utf8');
        });
        stream.once('end', function() {
          console.log(prefix + 'Parsed header: %s', Imap.parseHeader(buffer));
          console.log(Imap.parseHeader(buffer).from)
          console.log(Imap.parseHeader(buffer).subject)
        });
      });
      msg.once('attributes', function(attrs) {
        const attachments = findAttachmentParts(attrs.struct);
        console.log(prefix + 'Has attachments: %d', attachments.length);
        for (var i = 0, len=attachments.length ; i < len; ++i) {
          const attachment = attachments[i];
          console.log(prefix + 'Fetching attachment %s', attachment.params.name);
          var f = imap.fetch(attrs.uid , {
            bodies: [attachment.partID],
            struct: true
          });
          //build function to process attachment message
          f.on('message', buildAttMessageFunction(attachment));
        }
      });
      msg.once('end', function() {
        console.log(prefix + 'Finished email');
      });
    });
    f.once('error', function(err) {
      console.log('Fetch error: ' + err);
    });
    f.once('end', function() {
      console.log('Done fetching all messages!');
      imap.end();
    });
  });
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

imap.connect();