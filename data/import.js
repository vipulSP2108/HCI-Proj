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
const GameSession = require(path.join(backendDir, 'src/models/gameSession.model'));
const PianoSession = require(path.join(backendDir, 'src/models/pianoSession.model'));

const collectionsToRestore = [
  { model: User, filename: 'users.json', name: 'users' },
  { model: BoardDrawingGame, filename: 'boarddrawinggames.json', name: 'boarddrawinggames' },
  { model: BoardDrawingSession, filename: 'boarddrawingsessions.json', name: 'boarddrawingsessions' },
  { model: BoardDrawingTry, filename: 'boarddrawingtries.json', name: 'boarddrawingtries' },
  { model: GameSession, filename: 'gamesessions.json', name: 'gamesessions' },
  { model: PianoSession, filename: 'pianosessions.json', name: 'pianosessions' }
];

async function runImport() {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected Successfully.');

    for (const col of collectionsToRestore) {
      const filePath = path.join(__dirname, col.filename);
      if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${col.name} because ${col.filename} does not exist.`);
        continue;
      }

      console.log(`Reading data from ${col.filename}...`);
      const rawData = fs.readFileSync(filePath, 'utf8');
      const documents = JSON.parse(rawData);

      if (!Array.isArray(documents) || documents.length === 0) {
        console.log(`No documents to import for ${col.name}.`);
        continue;
      }

      console.log(`Clearing existing documents in ${col.name}...`);
      await col.model.deleteMany({});

      console.log(`Inserting ${documents.length} documents into ${col.name}...`);
      await col.model.insertMany(documents);
      console.log(`Successfully restored ${col.name}!`);
    }

    console.log('Data import completed successfully!');
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runImport();
