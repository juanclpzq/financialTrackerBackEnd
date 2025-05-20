import jwt from 'jsonwebtoken';

export const generateToken = (payload) => {
  // Generar el token con el payload y la clave secreta
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '6h' }
  );
};

export const verifyToken = (token) => {
  try {
    // Verificar y decodificar el token
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Token inválido');
  }
};