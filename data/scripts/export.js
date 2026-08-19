const fs = require('fs');
const path = require('path');

// Resolve mongoose and dotenv from the backend directory
const backendDir = path.join(__dirname, '../backend');
const mongoose = require(path.join(backendDir, 'node_modules/mongoose'));
const dotenv = require(path.join(backendDir, 'node_modules/dotenv'));

// Load environment variables from backend/.env
dotenv.config({ path: path.join(backendDir, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in backend/.env');
  process.exit(1);
}

// Import models
const User = require(path.join(backendDir, 'src/models/user.model'));
const BoardDrawingGame = require(path.join(backendDir, 'src/models/boardDrawingGame.model'));
const BoardDrawingSession = require(path.join(backendDir, 'src/models/boardDrawingSession.model'));
const BoardDrawingTry = require(path.join(backendDir, 'src/models/boardDrawingTry.model'));
const fruitBasketSession = require(path.join(backendDir, 'src/models/fruitBasketSession.model'));
const PianoSession = require(path.join(backendDir, 'src/models/pianoSession.model'));

const collectionsToBackup = [
  { model: User, filename: 'users.json', name: 'users' },
  { model: BoardDrawingGame, filename: 'boarddrawinggames.json', name: 'boarddrawinggames' },
  { model: BoardDrawingSession, filename: 'boarddrawingsessions.json', name: 'boarddrawingsessions' },
  { model: BoardDrawingTry, filename: 'boarddrawingtries.json', name: 'boarddrawingtries' },
  { model: fruitBasketSession, filename: 'fruitBasketSession.json', name: 'fruitBasketSession' },
  { model: PianoSession, filename: 'pianosessions.json', name: 'pianosessions (piano-wrist & piano-finger)' }
];

async function runExport() {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected Successfully.');

    for (const col of collectionsToBackup) {
      console.log(`Fetching data from ${col.name}...`);
      const documents = await col.model.find({});
      const filePath = path.join(__dirname, col.filename);
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
      console.log(`Saved ${documents.length} documents to ${path.basename(filePath)}`);
    }

    console.log('Data export completed successfully!');
  } catch (error) {
    console.error('Export failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runExport();
