import express from 'express';

const router = express.Router();
import UserController from '../controllers/user.js';
import { registerUser,
    loginUser,
    getUsers
 } from '../controllers/user.js';

// Ruta para registro de usuario
router.post('/', registerUser);

// Ruta para iniciar sesión
router.post('/login', loginUser);

// Ruta para obtener todos los usuarios
router.get('/', getUsers);

// // Ruta para obtener el perfil de usuario
// router.get('/profile', UserController.getUserProfile);

// // Ruta para actualizar el perfil de usuario
// router.put('/profile', UserController.updateUserProfile);

// // Ruta para restablecer la contraseña
// router.post('/password-reset', UserController.resetPassword);

export default router;