import { Router, Request, Response } from 'express';
import { IImap } from '../interfaces/IImap';
import { SearchService } from '../services/SearchService';
import { IAttachment } from '../interfaces/IAttachment';

const router = Router();

router.post('/search', async (req: Request<{ body: IImap }>, res: Response) => {
    const { imapHost, imapPort, tls, password, user } = req.body;
    const imap: IImap = {
        imapHost,
        imapPort,
        tls,
        password,
        user
    };
    try {
        const searchService = req.app.get('searchService');
        const attachment: IAttachment[] = await searchService.searchAndRetrieveAttachments(imap);
        res.status(200).json(attachment);
    } catch (error) {
        res.status(400).json({ error: 'Соединение с сервером почты не удалось.' });
    }
});

export default router;