import { InsertResult } from "typeorm";
import { ISearchData } from "../interfaces/ISearchData";
import { AppDataSource } from "../connections/SqlLiteConnection";
import { LastSearchData } from "../entities/LastSearchData";

export class LastSearchRepository {
    static async save(lastSearchData: ISearchData): Promise<InsertResult> {
        return await AppDataSource.getRepository(LastSearchData).upsert(lastSearchData, ['user']);
    }

    static async findLastMessageId(user: string): Promise<number> {
        const lastSearchData = await AppDataSource.getRepository(LastSearchData).findOne({
            where: { user },
            order: { dateLastMessage: 'DESC' },
            select: ['lastMessageId'],
        });
        return lastSearchData?.lastMessageId ?? 1;
    };

    static async dateLastMessage(user: string): Promise<any> {
        const dateLastMessage = await AppDataSource.getRepository(LastSearchData).findOne({
            where: { user },
            order: { dateLastMessage: 'DESC' },
            select: ['dateLastMessage'],
        });
        const today = new Date();
        return dateLastMessage?.dateLastMessage ?? today.toLocaleString();
    };
}