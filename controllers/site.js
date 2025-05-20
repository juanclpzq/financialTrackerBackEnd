import { Site } from '../models/Site.js';

// Obtener todos los sitios
export const getAllSites = async (req, res) => {
    try {
        const sites = await Site.find({ isActive: true })
            .select('name createdAt')
            .sort({ name: 1 });

        res.json(sites);
    } catch (error) {
        res.status(500).json({
            message: 'Error al obtener las obras',
            error: error.message
        });
    }
};

// Obtener un sitio por ID
export const getSiteById = async (req, res) => {
    try {
        const site = await Site.findById(req.params.id);
        if (!site) {
            return res.status(404).json({ message: 'Obra no encontrada' });
        }
        res.json(site);
    } catch (error) {
        res.status(500).json({
            message: 'Error al obtener la obra',
            error: error.message
        });
    }
};

// Crear un nuevo sitio
// Modificar la función createSite en site.js
export const createSite = async (req, res) => {
    try {
        const { name } = req.body;
        
        const userId = req.user?._id;
        

        const existingSite = await Site.findOne({ name });
        if (existingSite) {
            return res.status(400).json({
                message: 'Ya existe una obra con este nombre'
            });
        }

        const newSite = new Site({
            name,
            ...(userId && { createdBy: userId })
        });

        const savedSite = await newSite.save();

        res.status(201).json({
            site: savedSite,
            message: 'Obra creada exitosamente' // Añadimos el mensaje de éxito
        });
    } catch (error) {
        res.status(400).json({
            message: 'Error al crear la obra',
            error: error.message
        });
    }
};

// Actualizar un sitio
export const updateSite = async (req, res) => {
    try {
        const { name } = req.body;

        // Verificar si el nuevo nombre ya existe en otra obra
        if (name) {
            const existingSite = await Site.findOne({
                name,
                _id: { $ne: req.params.id }
            });

            if (existingSite) {
                return res.status(400).json({
                    message: 'Ya existe otra obra con este nombre'
                });
            }
        }

        const updatedSite = await Site.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                lastModifiedBy: req.user._id,
                lastModifiedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!updatedSite) {
            return res.status(404).json({ message: 'Obra no encontrada' });
        }

        res.json(updatedSite);
    } catch (error) {
        res.status(400).json({
            message: 'Error al actualizar la obra',
            error: error.message
        });
    }
};

// Eliminar un sitio (soft delete)
export const deleteSite = async (req, res) => {
    try {
        const deletedSite = await Site.findByIdAndUpdate(
            req.params.id,
            {
                isActive: false,
                lastModifiedBy: req.user._id,
                lastModifiedAt: new Date()
            },
            { new: true }
        );

        if (!deletedSite) {
            return res.status(404).json({ message: 'Obra no encontrada' });
        }

        res.json({ message: 'Obra eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({
            message: 'Error al eliminar la obra',
            error: error.message
        });
    }
};