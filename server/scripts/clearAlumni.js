require('dotenv').config();
const mongoose = require('mongoose');
const Alumnus = require('../models/Alumnus');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const r = await Alumnus.deleteMany({});
  console.log('Deleted documents:', r.deletedCount);
  await mongoose.disconnect();
})();