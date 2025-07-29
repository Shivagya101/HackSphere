// controllers/fileController.js
import path from 'path';
import fs from 'fs';
import File from '../models/File.js';

export const uploadFile = async (req, res) => {
  try {
    const { roomId, username } = req.body;

    const newFile = new File({
      roomId,
      uploadedBy: username,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      uploadDate: new Date()
    });

    await newFile.save();
    const io = req.app.get('io');
    io.to(roomId).emit('file:uploaded', newFile);

    res.status(201).json({ message: 'File uploaded', file: newFile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

export const getFileUrl = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    res.json({ downloadUrl: `/uploads/${file.filename}` });
  } catch (err) {
    res.status(500).json({ error: 'Error getting file URL' });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const filePath = path.resolve(file.path);
    res.download(filePath, file.originalName);
  } catch (err) {
    res.status(500).json({ error: 'Error downloading file' });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    console.log('Attempting to delete file:', {
      fileId: file._id,
      filename: file.filename,
      path: file.path,
      roomId: file.roomId
    });

    // Delete physical file from server
    if (file.path) {
      try {
        // Try the stored path first
        fs.unlinkSync(file.path);
        console.log('Physical file deleted successfully:', file.path);
      } catch (err) {
        if (err.code === 'ENOENT') {
          // If file not found, try with uploads directory
          const uploadsPath = path.join('./uploads', file.filename);
          try {
            fs.unlinkSync(uploadsPath);
            console.log('Physical file deleted successfully (uploads path):', uploadsPath);
          } catch (err2) {
            if (err2.code === 'ENOENT') {
              console.log('Physical file not found in either location:', file.path, 'or', uploadsPath);
            } else {
              console.error('Error deleting physical file from uploads path:', err2);
              throw err2;
            }
          }
        } else {
          console.error('Error deleting physical file:', err);
          throw err;
        }
      }
    } else {
      // If no path stored, try to delete using filename
      const uploadsPath = path.join('./uploads', file.filename);
      try {
        fs.unlinkSync(uploadsPath);
        console.log('Physical file deleted successfully (filename path):', uploadsPath);
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log('Physical file not found using filename:', uploadsPath);
        } else {
          console.error('Error deleting physical file using filename:', err);
          throw err;
        }
      }
    }

    // Delete database record
    await file.deleteOne();
    console.log('Database record deleted successfully');

    const io = req.app.get('io');
    io.to(file.roomId).emit('file:deleted', file._id);

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Error deleting file' });
  }
};