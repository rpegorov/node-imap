import { IImap } from "../interfaces/IImap";
import Imap = require('node-imap');


export class ImapConnections {

    static create(imap: IImap) {
        const Imap = require('node-imap');
        return new Imap({
            user: imap.user,
            password: imap.password,
            host: imap.imapHost,
            port: imap.imapPort,
            tls: imap.tls
        });
    }
}