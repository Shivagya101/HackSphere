import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  path: String,  // Add path field for physical file location
  roomId: String,
  uploadedBy: String,
  fileId: mongoose.Types.ObjectId,
  uploadDate: {
    type: Date,
    default: Date.now
  },
  size: Number,
  mimetype: String
});

export default mongoose.model('File', fileSchema);
