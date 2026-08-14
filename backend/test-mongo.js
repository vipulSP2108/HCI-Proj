const mongoose = require('mongoose');
const User = require('./src/models/user.model');

mongoose.connect('mongodb://localhost:27017/limbplay').then(async () => {
  const users = await User.find({});
  console.log("Users:", users.map(u => ({ id: u._id, email: u.email, role: u.role, type: u.type })));
  process.exit(0);
});
