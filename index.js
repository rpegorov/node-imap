const Imap = require('node-imap');
const inspect = require('util').inspect;

const imap = new Imap({
    user: 'example@mail.com',
    password: 'password',
    host: 'imap.yandex.ru',
    port: 993,
    tls: true
});

function openInbox(cb) {
    imap.openBox('INBOX', false, cb);
}

imap.once('ready', () => {
    openInbox((err, box) => {
        if (err) throw err;
        imap.search(['UNSEEN'], (err, results) => {
            if (err) throw err;
            console.log(`Найдено ${results.length} непрочитанных сообщений`);
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT'],
                markSeen: true
            };
            const f = imap.fetch(results, fetchOptions);
            f.on('message', (msg, seqno) => {
                console.log(`Сообщение #${seqno}`);
                const prefix = `Сообщение #${seqno}: `;
                msg.on('body', (stream, info) => {
                    if (info.which === 'HEADER') {
                        let buffer = '';
                        stream.on('data', (chunk) => {
                            buffer += chunk.toString('utf8');
                        });
                        stream.once('end', () => {
                            const headers = Imap.parseHeader(buffer);
                            console.log(`${prefix}От: ${headers.from}`);
                            console.log(`${prefix}Тема: ${headers.subject}`);
                        });
                    }
                });
                msg.once('end', () => {
                    console.log(`${prefix}Завершено`);
                });
            });
            f.once('error', (err) => {
                console.log(`Ошибка получения сообщений: ${err}`);
            });
            f.once('end', () => {
                console.log('Завершено');
                imap.end();
            });
        });
    });
});

imap.once('error', (err) => {
    console.log(`Ошибка IMAP: ${err}`);
});

imap.once('end', () => {
    console.log('IMAP соединение завершено');
});
imap.connect();