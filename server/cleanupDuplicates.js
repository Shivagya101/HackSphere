import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const cleanupDuplicates = async () => {
  try {
    // Connect to database
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/hacksphere",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("Connected to MongoDB");

    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    for (const user of users) {
      console.log(`Processing user: ${user.username}`);

      if (user.joinedRooms && user.joinedRooms.length > 0) {
        console.log(`Before cleanup: ${user.joinedRooms.length} rooms`);

        // Create a map to keep track of unique room IDs
        const uniqueRooms = new Map();

        // Keep the most recent entry for each room ID
        user.joinedRooms.forEach((room) => {
          const existing = uniqueRooms.get(room.roomId);
          if (
            !existing ||
            new Date(room.lastVisited) > new Date(existing.lastVisited)
          ) {
            uniqueRooms.set(room.roomId, room);
          }
        });

        // Replace joinedRooms with unique entries
        user.joinedRooms = Array.from(uniqueRooms.values());

        console.log(`After cleanup: ${user.joinedRooms.length} rooms`);

        // Save the user
        await user.save();
        console.log(`Saved user: ${user.username}`);
      }
    }

    console.log("Cleanup completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
};

cleanupDuplicates();
