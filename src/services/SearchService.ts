import { IImap } from "../interfaces/IImap";
import { ImapConnections } from "../connections/ImapConnection";
import { IAttachment } from "../interfaces/IAttachment";
import { LastSearchData } from "../entities/LastSearchData";
import { LastSearchRepository } from "../repositories/LastSearchRepository";
import Connection, { ImapMessage, ImapMessageAttributes, ImapMessageBodyInfo } from "node-imap";
import { Stream } from "stream";

export class SearchService {
  static searchAndRetrieveAttachments(imap: IImap): Promise<IAttachment[]> {
    const connection = ImapConnections.create(imap);

    return new Promise<IAttachment[]>((resolve, reject) => {
      connection.once('ready', async () => {
        try {
          const foundMessage = await searchMessages(connection);
          const attachments = await fetchAttachmentParts(connection, foundMessage);
          resolve(attachments);
        } catch (err) {
          reject(err);
        } finally {
          connection.end();
        }
      });
      connection.connect();
    });

    async function searchMessages(connection: Connection): Promise<number[]> {
      const lastSearchData = await LastSearchRepository.findLastMessageId(imap.user);
      const regex = /резюме/igm;
      const uidCriteria = ['UID', lastSearchData + 1 + ':*'];
      const textCriteria = ['TEXT', regex.source];

      return new Promise((resolve, reject) => {
        connection.openBox('INBOX', (error: Error, mailboxStatus: any) => {
          if (error) {
            reject(error);
            return;
          }

          const lastMessageId = mailboxStatus.uidnext - 1;

          if (lastSearchData >= lastMessageId) {
            reject(error);
            return;
          }

          connection.search(
            [uidCriteria, textCriteria],
            (error: Error, foundMessage: number[]) => {
              if (error) {
                reject(error);
                return;
              }
              resolve(foundMessage);
            }
          );
        });
      });
    }

    function fetchAttachmentParts(connection: Connection, foundMessage: number[]): Promise<IAttachment[]> {
      const fetch = connection.fetch(foundMessage, {
        bodies: ['', 'TEXT'],
        struct: true
      });

      const attachmentPromises: Promise<IAttachment>[] = [];

      fetch.on('message', (msg: ImapMessage) => {
        msg.once('attributes', (attrs: ImapMessageAttributes) => {
          try {
            const attachments = findAttachmentParts(attrs.struct);
            for (let i = 0, len = attachments.length; i < len; ++i) {
              const attachment = attachments[i];
              let attachmentPromise = new Promise<IAttachment>((resolve, reject) => {
                let fetchParts = connection.fetch(attrs.uid, {
                  bodies: [attachment.partID],
                  struct: true
                });
                fetchParts.on('message', retrieveAttachments(attachment, resolve, reject));
              });

              attachmentPromises.push(attachmentPromise);

              const lastSearchData = new LastSearchData();
              lastSearchData.dateLastMessage = attrs.date;
              lastSearchData.lastMessageId = attrs.uid;
              lastSearchData.user = imap.user;
              LastSearchRepository.save(lastSearchData);
            }
          } catch (err) {
            console.error('Error fetching attachment parts:', err);
          }
        });
      });

      return new Promise<IAttachment[]>((resolve, reject) => {
        fetch.once('error', (err: Error) => {
          reject(err);
        });
        fetch.once('end', async () => {
          try {
            const attachments = await Promise.all(attachmentPromises);
            resolve(attachments);
            connection.end();
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    function retrieveAttachments(attachment: any, resolve: any, reject: any) {
      let filename = attachment.params.name;

      return (msg: ImapMessage, seqno: number) => {
        let prefix = '(#' + seqno + ') ';
        let chunks: Buffer[] = [];

        msg.on('body', function (stream: Stream, info: ImapMessageBodyInfo) {
          console.log(prefix + 'Streaming this attachment:', filename, info);

          stream.on('data', function (chunk: Buffer) {
            chunks.push(chunk);
          });

          stream.on('end', function () {
            let content = Buffer.concat(chunks);

            let attachmentData: IAttachment = {
              filename: filename,
              subType: attachment.subtype,
              content: content.toString(),
              type: attachment.type
            };
            resolve(attachmentData);
          });

          stream.on('error', function (err: Error) {
            console.error(prefix + 'Error streaming attachment:', filename, err);
            reject(err);
          });
        });
      };
    }

    function findAttachmentParts(struct: any, attachments: any[] = []): any[] {
      attachments = attachments || [];
      for (let i = 0, len = struct.length, r; i < len; ++i) {
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
  }
}