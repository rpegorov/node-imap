import express, { Express } from 'express';
import SearchController from './controllers/SearcherController'
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.use(express.json());
app.use('/api', SearchController);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});