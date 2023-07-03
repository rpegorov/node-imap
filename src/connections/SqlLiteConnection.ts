import { DataSource } from "typeorm";
import fs from "fs";
import { LastSearchData } from "../entities/LastSearchData";
import process from 'process';

const sqlitePath = process.cwd() + '/data/sqlite3'; // почему-то создается в папке data, а sqlite3 идет в название файла

if (!fs.existsSync(sqlitePath)) {
    fs.mkdirSync(sqlitePath);
}

const AppDataSource = new DataSource({
    type: "sqlite",
    database: sqlitePath + 'searcher.db',
    synchronize: true,
    logging: true,
    entities: [LastSearchData]
});

AppDataSource.initialize();

export { AppDataSource };
