import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  // Metadatos
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedAt: {
    type: Date
  }
}, {
  timestamps: true,
  versionKey: false
});

// Middleware para actualizar lastModifiedAt
siteSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.lastModifiedAt = new Date();
  }
  next();
});

export const Site = mongoose.model('Site', siteSchema);