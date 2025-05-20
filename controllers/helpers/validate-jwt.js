import jwt from 'jsonwebtoken';
import { User } from '../../models/User.js';

const generateToken = (user) => {
    return jwt.sign({user}, process.env.JWT_SECRET, {
        expiresIn: '6h',
    });
};

export const validateJWT = async (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({
            msg: 'No token provided',
            ok: false
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.user._id);


        if (!user) {
            return res.status(401).json({
                msg: 'Unauthorized',
                ok: false
            });
        }

        const newToken = generateToken(user);


        req.user = user;

        res.setHeader('x-new-token', newToken);

        next();
    } catch (error) {
        return res.status(401).json({
            msg: 'Invalid token',
            ok: false
        });
    }
};
