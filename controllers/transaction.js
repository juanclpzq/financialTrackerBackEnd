import { Transaction } from "../models/Transaction.js";
import mongoose from 'mongoose';

export const getAllTransactions = async (req, res) => {
    try {
        const {
            bankId,
            siteId,
            transactionOrigin,
            category,
            typeFilters,
            searchTerm,
            dateRange,
            page = 0,
            pageSize = 25,
            hasNonNullBank = false,
            sortBy = 'date',
            sortDirection = 'desc',
            pendingOnly = false
        } = req.query;

        const filter = { transactionOrigin };
        let sort = {};

        // Modificar esta parte del código
        if (Array.isArray(sortBy)) {
            sortBy.forEach((field, index) => {
                sort[field] = sortDirection === 'asc' ? 1 : -1;
            });
        } else {
            if (sortBy === 'date') {
                sort = {
                    date: sortDirection === 'asc' ? 1 : -1,
                    createdAt: -1 // Siempre descendente para createdAt cuando se ordena por fecha
                };
            } else {
                const sortFieldMap = {
                    concept: 'concept',
                    check: 'check',
                    key: 'key',
                    deposits: ['type', 'amount'],
                    withdrawals: ['type', 'amount'],
                    bankName: 'bankName',
                    bank: 'bank',
                    site: 'site',
                    corporate_name: 'corporate_name'
                };

                if (sortFieldMap[sortBy]) {
                    if (Array.isArray(sortFieldMap[sortBy])) {
                        sortFieldMap[sortBy].forEach(field => {
                            sort[field] = sortDirection === 'asc' ? 1 : -1;
                        });
                    } else {
                        sort[sortFieldMap[sortBy]] = sortDirection === 'asc' ? 1 : -1;
                    }
                } else {
                    sort[sortBy] = sortDirection === 'asc' ? 1 : -1;
                }
            }
        }
        const conditions = [];

        // Add pending filter first
        if (pendingOnly === 'true' || pendingOnly === true) {
            conditions.push({ status: 'pending' });
        }

        if (transactionOrigin === 'generalBanks' && bankId) {
            filter.bank = new mongoose.Types.ObjectId(bankId);
        } else if (transactionOrigin === 'sites') {
            if (siteId) {
                filter.site = new mongoose.Types.ObjectId(siteId);
            }
            if (category) {
                filter.category = category;
            }
        }

        if (typeFilters) {
            const parsedTypeFilters = JSON.parse(typeFilters);
            const typeConditions = [];

            if (parsedTypeFilters.deposits) typeConditions.push({ type: 'deposit' });
            if (parsedTypeFilters.withdrawals) typeConditions.push({ type: 'withdrawal' });

            if (typeConditions.length === 0) {
                return res.json({
                    items: [],
                    total: 0,
                    totals: { deposits: 0, withdrawals: 0, net: 0 }
                });
            }

            conditions.push({ $or: typeConditions });
        }

        if (searchTerm) {
            const searchRegex = new RegExp(searchTerm, 'i');
            const searchConditions = [
                { concept: searchRegex },
                { 'bankInfo.name': searchRegex },
                { bankName: searchRegex },
                { 'siteInfo.name': searchRegex },
                { corporate_name: searchRegex }
            ];

            if (!isNaN(searchTerm)) {
                searchConditions.push({ amount: parseFloat(searchTerm) });
            }

            conditions.push({ $or: searchConditions });
        }

        if (dateRange) {
            try {
                const { start, end } = JSON.parse(dateRange);
                if (start && end) {
                    conditions.push({
                        date: {
                            $gte: new Date(start),
                            $lte: new Date(end)
                        }
                    });
                }
            } catch (error) {
                console.error('Error parsing date range:', error);
            }
        }

        if (conditions.length > 0) {
            filter.$and = conditions;
        }

        const pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: 'banks',
                    localField: 'bank',
                    foreignField: '_id',
                    as: 'bankInfo'
                }
            },
            {
                $lookup: {
                    from: 'sites',
                    localField: 'site',
                    foreignField: '_id',
                    as: 'siteInfo'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'createdBy',
                    foreignField: '_id',
                    as: 'createdBy'
                }
            },
            {
                $unwind: {
                    path: '$bankInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$siteInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: '$createdBy',
                    preserveNullAndEmptyArrays: true
                }
            },
            { $sort: sort },
            {
                $facet: {
                    totals: [
                        {
                            $group: {
                                _id: null,
                                deposits: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $eq: ["$type", "deposit"] },
                                                    { $ne: ["$status", "pending"] }
                                                ]
                                            },
                                            "$amount",
                                            0
                                        ]
                                    }
                                },
                                withdrawals: {
                                    $sum: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $eq: ["$type", "withdrawal"] },
                                                    { $ne: ["$status", "pending"] }
                                                ]
                                            },
                                            "$amount",
                                            0
                                        ]
                                    }
                                },
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    paginatedData: [
                        { $skip: parseInt(page) * parseInt(pageSize) },
                        { $limit: parseInt(pageSize) },
                        {
                            $project: {
                                _id: 1,
                                date: 1,
                                check: 1,
                                key: 1,
                                concept: 1,
                                amount: 1,
                                type: 1,
                                bank: 1,
                                bankName: 1,
                                site: 1,
                                category: 1,
                                bankInfo: 1,
                                siteInfo: 1,
                                metadata: 1,
                                corporate_name: 1,
                                createdBy: 1,
                                createdAt: 1,
                                status: 1
                            }
                        }
                    ]
                }
            }
        ];

        const [result] = await Transaction.aggregate(pipeline);
        const { totals, paginatedData } = result;
        const totalInfo = totals[0] || { deposits: 0, withdrawals: 0, count: 0 };

        res.json({
            items: paginatedData,
            totals: {
                deposits: parseFloat(totalInfo.deposits.toFixed(2)),
                withdrawals: parseFloat(totalInfo.withdrawals.toFixed(2)),
                net: parseFloat((totalInfo.deposits - totalInfo.withdrawals).toFixed(2))
            },
            total: totalInfo.count,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });

    } catch (error) {
        console.error('Error en getAllTransactions:', error);
        res.status(500).json({
            message: 'Error al obtener las transacciones',
            error: error.message
        });
    }
};

export const checkInitialBalance = async (req, res) => {
    try {
        const { bankId, category } = req.query;

        const filter = {
            concept: { $regex: 'saldo inicial', $options: 'i' },  // Busca 'saldo inicial' en cualquier parte
            ...(category && { category })
        };

        // Solo agregar filtro de banco si es categoría 'banks'
        if (category === 'banks' && bankId) {
            filter.bank = bankId;
        }


        const initialBalance = await Transaction.findOne(filter)
            .populate('bank', 'name')
            .sort({ date: 1 });


        res.json({
            hasInitialBalance: !!initialBalance,
            initialBalance: initialBalance ? {
                amount: initialBalance.amount,
                date: initialBalance.date,
                bankName: initialBalance.bank?.name
            } : null
        });

    } catch (error) {
        console.error('Error al verificar saldo inicial:', error);
        res.status(500).json({
            message: 'Error al verificar saldo inicial',
            error: error.message
        });
    }
};

export const getTransactionById = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transacción no encontrada' });
        }
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la transacción', error: error.message });
    }
};

export const createTransaction = async (req, res) => {
    try {
        const payload = req.body;

        // Check if the payload is an array
        if (!Array.isArray(payload)) {
            return res.status(400).json({
                message: 'El payload debe ser un array de transacciones'
            });
        }

        const savedTransactions = await Transaction.insertMany(payload);

        res.status(201).json(savedTransactions);
    } catch (error) {
        console.error('Error al crear transacciones:', error);
        res.status(400).json({
            message: 'Error al crear las transacciones',
            error: error.message
        });
    }
};


export const createBulkTransactions = async (req, res) => {
    try {
        // Validación inicial del payload
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                message: 'Payload inválido: se requiere un objeto de transacciones',
                error: 'INVALID_PAYLOAD'
            });
        }

        const transactionsObj = req.body;

        // Validar que hay transacciones para procesar
        const transactionKeys = Object.keys(transactionsObj)
            .filter(key => !isNaN(key)); // Solo las claves numéricas son transacciones

        if (transactionKeys.length === 0) {
            return res.status(400).json({
                message: 'No se encontraron transacciones para procesar',
                error: 'NO_TRANSACTIONS'
            });
        }

        // Convertir objeto a array y procesar cada transacción una sola vez
        const transactions = transactionKeys.map(key => {
            const tx = transactionsObj[key];
            const processedTx = {
                ...tx,
                transactionOrigin: tx.transactionOrigin === 'banks' ? 'generalBanks' : tx.transactionOrigin,
            };




            // Manejar caso especial para transacciones de sites
            if (tx.transactionOrigin === 'sites' && tx.category === 'banks') {
                processedTx.bankName = tx.bankName;
                delete processedTx.bank; // Eliminamos el campo bank si existe
            }

            return processedTx;
        });
        console.log('transactions', transactions)


        console.log('Número de transacciones a insertar:', transactions.length);

        const result = await Transaction.insertMany(transactions, {
            ordered: false
        });

        res.status(201).json({
            message: 'Transacciones importadas exitosamente',
            count: result.length
        });

    } catch (error) {
        console.error('Error en importación masiva:', error);
        res.status(400).json({
            message: 'Error al importar transacciones',
            error: error.message
        });
    }
};


export const updateTransaction = async (req, res) => {
    try {
        const updatedTransaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedTransaction) {
            return res.status(404).json({ message: 'Transacción no encontrada' });
        }
        res.json(updatedTransaction);
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar la transacción', error: error.message });
    }
};

export const deleteTransaction = async (req, res) => {
    try {
        const deletedTransaction = await Transaction.findByIdAndDelete(req.params.id);
        if (!deletedTransaction) {
            return res.status(404).json({ message: 'Transacción no encontrada' });
        }
        res.json({ message: 'Transacción eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la transacción', error: error.message });
    }
};