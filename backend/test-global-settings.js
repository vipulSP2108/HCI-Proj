const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://vipulpatil_db_user:pvikIuKfSDfDM3vu@cluster0.tnszc0l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const cols = await mongoose.connection.db.listCollections().toArray();
  const settingsCol = cols.find(c => c.name.toLowerCase().includes('setting'));
  if (settingsCol) {
    const settings = await mongoose.connection.db.collection(settingsCol.name).findOne({});
    console.log("Global Settings testingMode:", settings.testingMode);
  }
  process.exit(0);
});
