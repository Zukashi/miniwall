import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`MiniWall API listening on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
  });
})();
