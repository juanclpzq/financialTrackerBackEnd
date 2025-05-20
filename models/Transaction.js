import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // Datos principales (existentes)
  concept: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: false,
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal'],
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },


  // Campo de origen (existente)
  transactionOrigin: {
    type: String,
    enum: ['generalBanks', 'generalCash', 'sites'],
    required: true
  },

  category: {
    type: String,
    required: true,
    enum: [
      'banks',
      'cash',
      'payroll',
      'machinery',
      'fuel',
      'invoices',
      'materials',
      'services',
      'administrative',
      'taxes',
      'other'
    ]
  },

  // Metadatos específicos por subcategoría (solo para sites)
  metadata: {
    payroll: {
      employeeName: String,
      position: String,
      period: {
        start: Date,
        end: Date
      }
    },
    machinery: {
      equipmentId: String,
      equipmentType: String,
      hours: Number,
      operator: String
    },
    fuel: {
      liters: Number,
      unitPrice: Number,
      vehicle: String
    },
    invoice: {
      invoiceNumber: String,
      provider: String,
      dueDate: Date,
      taxAmount: Number
    }
  },

  // Referencias (existentes)
  bank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bank',
    required: false,
  },
  bankName: {
    type: String,
    required: false,
  },
  corporate_name: {
    type: String,
    required: false,
  },
  site: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
  },

  // Campos calculados (existentes)
  deposits: {
    type: Number,
    default: 0,
  },
  withdrawals: {
    type: Number,
    default: 0,
  },

  // Campo key (existente)
  key: {
    type: String,
    trim: true,
    sparse: true,
  },

  check: {
    type: String,
    trim: true,
    sparse: true,
  },

  status: {
    type: String,
    enum: ['paid', 'pending'],
    default: 'pending', // Por defecto todas serán paid
    required: true
  },

  // Metadatos (existentes)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Índices existentes optimizados

transactionSchema.index({
  date: 1,
  createdAt: 1
});


transactionSchema.index({
  category: 1,
  type: 1,
  date: -1,
  bank: 1,
  site: 1
});

transactionSchema.index({
  bank: 1,
  category: 1,
  type: 1,
  date: -1
});

transactionSchema.index({
  site: 1,
  category: 1,
  type: 1,
  date: -1
});

transactionSchema.index({
  date: -1,
  category: 1,
  type: 1
});

// Nuevo índice para subcategorías en sites
transactionSchema.index({
  transactionOrigin: 1,
  site: 1,
  subCategory: 1,
  date: -1
}, {
  partialFilterExpression: { transactionOrigin: 'sites' }
});

// Índice de texto mejorado
transactionSchema.index({
  concept: 'text',
  key: 'text',
  bankName: 'text',
  corporate_name: 'text',
  'metadata.payroll.employeeName': 'text',
  'metadata.machinery.equipmentId': 'text',
  'metadata.invoice.invoiceNumber': 'text',
  'metadata.invoice.provider': 'text'
}, {
  weights: {
    concept: 10,
    key: 5,
    bankName: 8,
    'metadata.payroll.employeeName': 6,
    'metadata.invoice.provider': 7
  },
  default_language: "spanish",
  name: "SearchIndex"
});

// Middleware pre-save (existente + nueva lógica)
transactionSchema.pre('save', function (next) {
  // Lógica existente para campos calculados
  this.deposits = this.type === 'deposit' ? this.amount : 0;
  this.withdrawals = this.type === 'withdrawal' ? this.amount : 0;

  // Asignar transactionOrigin automáticamente si no está definido
  if (!this.transactionOrigin) {
    if (this.site) {
      this.transactionOrigin = 'sites';
    } else {
      this.transactionOrigin = this.category === 'banks' ? 'generalBanks' : 'generalCash';
    }
  }

  // Validar que subCategory y metadata solo existan en 'sites'
  if (this.transactionOrigin !== 'sites') {
    this.subCategory = undefined;
    this.metadata = undefined;
  }

  next();
});

// Método estático findByFilters mejorado
transactionSchema.statics.findByFilters = async function ({
  transactionOrigin,
  category,
  subCategory,
  dateRange,
  typeFilters,
  searchTerm,
  bankId,
  siteId,
  page = 0,
  pageSize = 25,
  hasNonNullBank = false
}) {
  try {
    // Construir el filtro base
    const filter = {};

    if (transactionOrigin) filter.transactionOrigin = transactionOrigin;
    if (category) filter.category = category;
    if (bankId) filter.bank = bankId;
    if (siteId) filter.site = siteId;
    if (hasNonNullBank) filter.bank = { $ne: null };

    // Aplicar subcategoría solo para sites
    if (transactionOrigin === 'sites' && subCategory) {
      filter.subCategory = subCategory;
    }

    // Aplicar filtro de fechas
    if (dateRange?.[0] || dateRange?.[1]) {
      filter.date = {};
      if (dateRange[0]) filter.date.$gte = new Date(dateRange[0]);
      if (dateRange[1]) filter.date.$lte = new Date(dateRange[1]);
    }

    // Aplicar filtros de tipo
    if (typeFilters) {
      const typeConditions = [];
      if (typeFilters.deposits) typeConditions.push({ type: 'deposit' });
      if (typeFilters.withdrawals) typeConditions.push({ type: 'withdrawal' });

      if (typeConditions.length > 0) {
        filter.$or = typeConditions;
      }
    }

    // Aplicar búsqueda de texto
    if (searchTerm?.trim()) {
      filter.$text = { $search: searchTerm };
    }

    // Ejecutar consulta
    const [items, total, aggregatedTotals] = await Promise.all([
      this.find(filter)
        .populate('bank', 'name')
        .populate('site', 'name')
        .populate('createdBy', 'name email')
        .sort({ date: -1 })
        .skip(page * pageSize)
        .limit(pageSize)
        .lean(),
      this.countDocuments(filter),
      this.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            deposits: {
              $sum: { $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0] }
            },
            withdrawals: {
              $sum: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0] }
            }
          }
        }
      ])
    ]);

    const totals = aggregatedTotals[0] || { deposits: 0, withdrawals: 0 };
    totals.net = totals.deposits - totals.withdrawals;

    return { items, total, totals };
  } catch (error) {
    console.error('Error en findByFilters:', error);
    throw error;
  }
};

export const Transaction = mongoose.model('Transaction', transactionSchema);