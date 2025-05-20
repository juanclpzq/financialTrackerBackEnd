import  Bank  from "../models/Bank.js";

export const getAllBanks = async (req, res) => {
  try {
    const banks = await Bank.find({ active: true }).sort({ name: 1 });
    res.json(banks);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los bancos', error: error.message });
  }
};

export const getBankById = async (req, res) => {
  try {
    const bank = await Bank.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({ message: 'Banco no encontrado' });
    }
    res.json(bank);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el banco', error: error.message });
  }
};

export const createBank = async (req, res) => {
  try {
    const newBank = new Bank(req.body);
    const savedBank = await newBank.save();
    res.status(201).json(savedBank);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear el banco', error: error.message });
  }
};

export const updateBank = async (req, res) => {
  try {
    const updatedBank = await Bank.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastModifiedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!updatedBank) {
      return res.status(404).json({ message: 'Banco no encontrado' });
    }
    res.json(updatedBank);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar el banco', error: error.message });
  }
};

export const deleteBank = async (req, res) => {
  try {
    const bank = await Bank.findByIdAndUpdate(
      req.params.id,
      { active: false, lastModifiedAt: new Date() },
      { new: true }
    );
    if (!bank) {
      return res.status(404).json({ message: 'Banco no encontrado' });
    }
    res.json({ message: 'Banco eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el banco', error: error.message });
  }
};