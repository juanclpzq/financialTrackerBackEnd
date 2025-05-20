import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

// @desc    Registrar usuario
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya existe'
      });
    }

    // Crear el hash de la contraseña
    const salt =  bcrypt.genSaltSync();
    const hashedPassword =  bcrypt.hashSync(password, salt);

    // Crear usuario
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user'
    });

    console.log('user', user);

    console.log('hashedPassword', hashedPassword);

    // Enviar respuesta
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
};

// @desc    Login usuario
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar si el usuario existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '6h' }
    );

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

// @desc    Obtener perfil de usuario
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil de usuario',
      error: error.message
    });
  }
};

// @desc    Actualizar usuario
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar campos
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
};

// @desc    Eliminar usuario
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};

// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

export default {
  registerUser,
  loginUser,
  getUserProfile,
  updateUser,
  deleteUser,
  getUsers
};