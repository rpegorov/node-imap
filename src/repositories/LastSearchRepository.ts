import { InsertResult } from "typeorm";
import { ISearchData } from "../interfaces/ISearchData";
import { AppDataSource } from "../connections/SqlLiteConnection";
import { LastSearchData } from "../entities/LastSearchData";

export class LastSearchRepository {
    static save = async (lastSearchData: ISearchData): Promise<InsertResult> =>
        AppDataSource.getRepository(LastSearchData).upsert(lastSearchData, ['user']);

    static findLastMessageId = async (user: string): Promise<number> => {
        const lastSearchData = await AppDataSource.getRepository(LastSearchData).findOne({
            where: { user },
            order: { dateLastMessage: 'DESC' },
            select: ['lastMessageId'],
        });
        return lastSearchData?.lastMessageId ?? 1;
    };
}