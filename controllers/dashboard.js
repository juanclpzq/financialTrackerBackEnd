import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction } from '../models/Transaction.js';


export const getDashboardData = async (req, res) => {
  try {
    const { dateRange } = req.query;

    let dateFilter = {};
    if (dateRange) {
      const { start, end } = JSON.parse(dateRange);
      if (start && end) {
        dateFilter = {
          date: {
            $gte: new Date(start),
            $lte: new Date(end)
          }
        };
      }
    }

    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const currentDayStart = startOfDay(today);

    const pipeline = [
      {
        $match: dateFilter
      },
      {
        $facet: {
          // Overview metrics
          overview: [
            {
              $group: {
                _id: '$category',
                deposits: {
                  $sum: { $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0] }
                },
                withdrawals: {
                  $sum: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0] }
                },
                count: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 1,
                deposits: 1,
                withdrawals: 1,
                net: { $subtract: ["$deposits", "$withdrawals"] }
              }
            }
          ],

          // Bank metrics
          bankMetrics: [
            {
              $match: {
                category: 'banks',
                bank: { $ne: null }
              }
            },
            {
              $lookup: {
                from: 'banks',
                localField: 'bank',
                foreignField: '_id',
                as: 'bankInfo'
              }
            },
            {
              $unwind: '$bankInfo'
            },
            {
              $group: {
                _id: '$bank',
                name: { $first: '$bankInfo.name' },
                totalDeposits: {
                  $sum: { $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0] }
                },
                totalWithdrawals: {
                  $sum: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0] }
                },
                recentTransactions: {
                  $push: {
                    _id: '$_id',
                    date: '$date',
                    concept: '$concept',
                    type: '$type',
                    amount: '$amount',
                    deposits: { $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0] },
                    withdrawals: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0] }
                  }
                }
              }
            },
            {
              $project: {
                name: 1,
                totalDeposits: 1,
                totalWithdrawals: 1,
                net: { $subtract: ["$totalDeposits", "$totalWithdrawals"] },
                recentTransactions: {
                  $slice: [{
                    $sortArray: {
                      input: '$recentTransactions',
                      sortBy: { date: -1 }
                    }
                  }, 5]
                }
              }
            }
          ],

          // Site metrics
          siteMetrics: [
            {
              $match: {
                site: { $ne: null }
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
              $unwind: '$siteInfo'
            },
            {
              $group: {
                _id: '$site',
                name: { $first: '$siteInfo.name' },
                totalDeposits: {
                  $sum: { $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0] }
                },
                totalWithdrawals: {
                  $sum: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0] }
                },
                recentTransactions: {
                  $push: {
                    _id: '$_id',
                    date: '$date',
                    concept: '$concept',
                    type: '$type',
                    amount: '$amount',
                    deposits: { $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0] },
                    withdrawals: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0] }
                  }
                }
              }
            },
            {
              $project: {
                name: 1,
                totalDeposits: 1,
                totalWithdrawals: 1,
                net: { $subtract: ["$totalDeposits", "$totalWithdrawals"] },
                recentTransactions: {
                  $slice: [{
                    $sortArray: {
                      input: '$recentTransactions',
                      sortBy: { date: -1 }
                    }
                  }, 5]
                }
              }
            }
          ],

           // Agregar la nueva sección para datos por mes
           cashFlowByMonth: [
            {
              $match: { 
                category: 'cash',
                ...dateFilter 
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: "$date" },
                  month: { $month: "$date" }
                },
                deposits: {
                  $sum: { $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0] }
                },
                withdrawals: {
                  $sum: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0] }
                }
              }
            },
            {
              $project: {
                _id: 0,
                year: "$_id.year",
                month: "$_id.month",
                deposits: 1,
                withdrawals: 1,
                net: { $subtract: ["$deposits", "$withdrawals"] }
              }
            },
            {
              $addFields: {
                monthStr: {
                  $dateToString: {
                    format: "%Y-%m",
                    date: {
                      $dateFromParts: {
                        year: "$year",
                        month: "$month",
                        day: 1
                      }
                    }
                  }
                }
              }
            },
            { $sort: { monthStr: 1 } },
            {
              $project: {
                month: "$monthStr",
                deposits: 1,
                withdrawals: 1,
                net: 1
              }
            }
          ],

          // Cash flow metrics
          cashFlowTotal: [
            {
              $match: { category: 'cash' }
            },
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
            },
            {
              $project: {
                _id: 0,
                deposits: 1,
                withdrawals: 1,
                net: { $subtract: ["$deposits", "$withdrawals"] }
              }
            }
          ],

          cashFlowDaily: [
            {
              $match: {
                category: 'cash',
                date: { $gte: currentDayStart }
              }
            },
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
            },
            {
              $project: {
                _id: 0,
                deposits: 1,
                withdrawals: 1,
                net: { $subtract: ["$deposits", "$withdrawals"] }
              }
            }
          ],

          // Después de cashFlowDaily...
          cashFlowWeekly: [
            {
              $match: {
                category: 'cash',
                date: { $gte: currentWeekStart }
              }
            },
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
            },
            {
              $project: {
                _id: 0,
                deposits: 1,
                withdrawals: 1,
                net: { $subtract: ["$deposits", "$withdrawals"] }
              }
            }
          ],

          cashFlowMonthly: [
            {
              $match: {
                category: 'cash',
                date: { $gte: currentMonthStart }
              }
            },
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
            },
            {
              $project: {
                _id: 0,
                deposits: 1,
                withdrawals: 1,
                net: { $subtract: ["$deposits", "$withdrawals"] }
              }
            }
          ],

          cashFlowRecentTransactions: [
            {
              $match: { category: 'cash' }
            },
            {
              $project: {
                _id: 1,
                date: 1,
                concept: 1,
                type: 1,
                deposits: { $cond: [{ $eq: ["$type", "deposit"] }, "$amount", 0] },
                withdrawals: { $cond: [{ $eq: ["$type", "withdrawal"] }, "$amount", 0] }
              }
            },
            { $sort: { date: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ];

    const [result] = await Transaction.aggregate(pipeline);

    // Procesar los resultados
    const metrics = {
      overview: {
        banks: result.overview.find(m => m._id === 'banks') || { deposits: 0, withdrawals: 0, net: 0 },
        cash: result.overview.find(m => m._id === 'cash') || { deposits: 0, withdrawals: 0, net: 0 }
      },
      byBank: result.bankMetrics.reduce((acc, bank) => {
        acc[bank._id] = bank;
        return acc;
      }, {}),
      bySite: result.siteMetrics.reduce((acc, site) => {
        acc[site._id] = site;
        return acc;
      }, {}),
      cashFlow: {
        total: result.cashFlowTotal[0] || { deposits: 0, withdrawals: 0, net: 0 },
        daily: result.cashFlowDaily[0] || { deposits: 0, withdrawals: 0, net: 0 },
        weekly: result.cashFlowWeekly[0] || { deposits: 0, withdrawals: 0, net: 0 },
        monthly: result.cashFlowMonthly[0] || { deposits: 0, withdrawals: 0, net: 0 },
        byMonth: result.cashFlowByMonth || [],
        recentTransactions: result.cashFlowRecentTransactions || []
      }
    };

    // Calcular totales
    const totals = {
      banks: metrics.overview.banks,
      cash: metrics.overview.cash,
      global: {
        deposits: metrics.overview.banks.deposits + metrics.overview.cash.deposits,
        withdrawals: metrics.overview.banks.withdrawals + metrics.overview.cash.withdrawals,
        net: (metrics.overview.banks.deposits + metrics.overview.cash.deposits) -
          (metrics.overview.banks.withdrawals + metrics.overview.cash.withdrawals)
      }
    };

    metrics.totals = totals;

    // Obtener transacciones recientes
    const recentTransactions = await Transaction.find(dateFilter)
      .populate('bank', 'name')
      .populate('site', 'name')
      .sort({ date: -1 })
      .limit(50)
      .lean();

    res.json({
      metrics,
      transactions: recentTransactions
    });

  } catch (error) {
    console.error('Error in getDashboardData:', error);
    res.status(500).json({
      message: 'Error al obtener datos del dashboard',
      error: error.message
    });
  }
};

export default {
  getDashboardData
};