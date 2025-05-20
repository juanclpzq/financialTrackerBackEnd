import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Por favor ingrese un nombre']
  },
  email: {
    type: String,
    required: [true, 'Por favor ingrese un email'],
    unique: true,
    
  },
  password: {
    type: String,
    required: [true, 'Por favor ingrese una contraseña'],
    minlength: 5,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // resetPasswordToken: String,
  // resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// // Encriptar contraseña usando bcrypt
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) {
//     next();
//   }

//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
// });

// Firmar JWT y retornar
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// // Método para verificar contraseña
// userSchema.methods.matchPassword = async function(enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// // Generar y hashear token para reset de contraseña
// userSchema.methods.getResetPasswordToken = function() {
//   // Generar token
//   const resetToken = crypto.randomBytes(20).toString('hex');

//   // Hash token y guardar en base de datos
//   this.resetPasswordToken = crypto
//     .createHash('sha256')
//     .update(resetToken)
//     .digest('hex');

//   // Establecer expiración
//   this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

//   return resetToken;


export const User = mongoose.model('User', userSchema);