import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
    console.log('email', email);
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas (email)'
      });
    }

    const isValidPassword =  bcrypt.compareSync(password, user.password);
    

    if (!isValidPassword) {
    console.log('password', password)
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas(password)'
      });
    }
    
    const token = jwt.sign({
      user
  }, process.env.JWT_SECRET, { expiresIn: '6h' });


    // 4. Enviar respuesta
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión'
    });
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;



    // 1. Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya existe'
      });
    }

    // 3. Crear el nuevo usuario
    const user = await User.create({
      name,
      email,
      password,
      role
    });



    // 4. Generar token JWT
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role
    };

    const token = generateToken(payload);

    // 5. Enviar respuesta
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario'
    });
  }
};