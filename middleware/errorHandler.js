export const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
  
    // Errores de MongoDB/Mongoose
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(err.errors).map(val => val.message)
      });
    }
  
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un registro con estos datos'
      });
    }
  
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'ID inválido'
      });
    }
  
    // Error personalizado
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message || 'Error del servidor'
    });
  };
  
  // Middleware para capturar errores async
  export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);