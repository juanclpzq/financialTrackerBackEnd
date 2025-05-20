import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { asyncHandler } from './errorHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Verificar el token en el header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado para acceder a esta ruta'
    });
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Obtener usuario del token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Token no válido'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado para acceder a esta ruta'
    });
  }
});

// Middleware para roles específicos
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Usuario no autorizado para esta acción'
      });
    }
    next();
  };
};