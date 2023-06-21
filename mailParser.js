const Imap = require('node-imap');
const MailParser = require('mailparser');
const Redis = require('redis');

const imap = new Imap({
    user: 'example@yandex.ru',
    password: 'password',
    host: 'imap.yandex.ru',
    port: 993,
    tls: true
});

const redisClient = Redis.createClient();

function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
}

function processMessage(msg) {
    const mailparser = new MailParser();
    mailparser.on('attachment', function (attachment) {
        // Сохраняем вложение во временную директорию
        // и отправляем его данные по шине Redis в другой сервис
        const data = {
            filename: attachment.generatedFileName,
            content: attachment.content
        };
        redisClient.publish('resume-attachments', JSON.stringify(data));
    });
    mailparser.write(msg);
    mailparser.end();
}

function searchAndFetch() {
    imap.search(['OR', ['TEXT', 'Резюме'], ['SUBJECT', 'Резюме']], function (err, uids) {
        if (err) {
            console.error('IMAP search error:', err);
            return;
        }
        if (uids.length === 0) {
            console.log('No matching messages found');
            return;
        }
        console.log(uids.length, 'matching messages found');
        const fetch = imap.fetch(uids, { bodies: '' });
        fetch.on('message', function (msg, seqno) {
            console.log('Processing message #%d', seqno);
            msg.on('body', function (stream, info) {
                processMessage(stream);
            });
            msg.once('end', function () {
                console.log('Finished processing message #%d', seqno);
            });
        });
        fetch.once('error', function (err) {
            console.error('IMAP fetch error:', err);
        });
        fetch.once('end', function () {
            console.log('Finished fetching all messages');
        });
    });
}

imap.once('ready', function () {
    openInbox(function (err, box) {
        if (err) throw err;
        searchAndFetch();
        setInterval(searchAndFetch, 60000); // Повторяем каждую минуту
    });
});

imap.once('error', function (err) {
    console.error('IMAP error:', err);
});

imap.once('end', function () {
    console.log('IMAP connection ended');
});

redisClient.on('error', function (err) {
    console.error('Redis error:', err);
});

redisClient.on('ready', function () {
    console.log('Redis connection ready');
});

imap.connect();