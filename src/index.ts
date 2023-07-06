import express, { Express } from 'express';
import SearchController from './controllers/SearcherController'
import dotenv from 'dotenv';
import { SearchService } from './services/SearchService';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.use(express.json());
app.use('/api', SearchController);
const searchService = new SearchService;
app.set('searchService', searchService);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});