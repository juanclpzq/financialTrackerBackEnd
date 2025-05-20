import express from 'express';
import { validateJWT } from '../controllers/helpers/validate-jwt.js';
import {
  register,
  login,
} from '../controllers/auth.js';


const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/validate', validateJWT, (req, res) => {
  const newToken = res.get('x-new-token');
  
  if (newToken) {
      res.status(200).json({
          msg: 'Token is valid',
          ok: true,
          newToken
      });
  } else {
      res.status(401).json({
          msg: 'Token validation failed',
          ok: false
      });
  }
});



export default router;