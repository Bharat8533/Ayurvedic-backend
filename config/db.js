// const mongoose = require("mongoose");

// const connectDB = async () => {
//   try {
//     const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
//     if (!mongoUri) {
//       console.warn(
//         "⚠️  [MongoDB] No MONGO_URI or MONGODB_URI found in environment variables.",
//       );
//       console.log("ℹ️  [Database] Running in Local Storage Fallback Mode.");
//       return false;
//     }

//     const conn = await mongoose.connect(mongoUri);
//     console.log(`✅ MongoDB connected: ${conn.connection.host}`);

//     // Seed default admin if MongoDB connected
//     try {
//       const { seedInitialAdmin } = require("../controllers/adminController");
//       await seedInitialAdmin();
//     } catch (seedErr) {
//       // ignore seed errors
//     }

//     return true;
//   } catch (error) {
//     console.error("❌ MongoDB connection failed:", error.message);
//     console.log("ℹ️  Running in Local Storage Fallback Mode.");
//     return false;
//   }
// };

// const getIsConnected = () => {
//   return mongoose.connection.readyState === 1;
// };

// // Connection event listeners for real-time status updates
// mongoose.connection.on("disconnected", () => {
//   console.warn("⚠️  MongoDB disconnected. Using Local Storage Fallback.");
// });

// mongoose.connection.on("reconnected", () => {
//   console.log("✅ MongoDB reconnected successfully.");
// });

// // Provide both function export and named properties for maximum compatibility:
// // 1. const connectDB = require('./config/db'); connectDB();
// // 2. const { connectDB, getIsConnected } = require('./config/db');
// // 3. const { getIsConnected } = require('../config/db');
// connectDB.connectDB = connectDB;
// connectDB.getIsConnected = getIsConnected;

// module.exports = connectDB;
// module.exports.connectDB = connectDB;
// module.exports.getIsConnected = getIsConnected;

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.warn(
        "⚠️  [MongoDB] No MONGO_URI or MONGODB_URI found in environment variables.",
      );
      console.log("ℹ️  [Database] Running in Local Storage Fallback Mode.");
      return false;
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // Seed default admin if MongoDB connected
    try {
      const { seedInitialAdmin } = require("../controllers/adminController");
      await seedInitialAdmin();
    } catch (seedErr) {
      // ignore seed errors
    }

    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.log("ℹ️  Running in Local Storage Fallback Mode.");
    return false;
  }
};

const getIsConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Connection event listeners for real-time status updates
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected. Using Local Storage Fallback.");
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected successfully.");
});

// Provide both function export and named properties for maximum compatibility:
connectDB.connectDB = connectDB;
connectDB.getIsConnected = getIsConnected;

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.getIsConnected = getIsConnected;
