import prisma from '../config/prisma.js';
import { logAudit } from '../services/auditService.js';

export const listProducts = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const where = {};
    if (activeOnly === 'true') where.isActive = true;

    const products = await prisma.loanProduct.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    return res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      minAmount,
      maxAmount,
      interestMethod = 'FLAT_RATE',
      defaultInterestRate,
      minInterestRate,
      maxInterestRate,
      minTermMonths = 1,
      maxTermMonths = 36,
      repaymentFrequency = 'MONTHLY',
      processingFeeRate = 2.5,
      insuranceFeeRate = 1.0,
    } = req.body;

    if (!code || !name || !minAmount || !maxAmount || !defaultInterestRate) {
      return res.status(400).json({ success: false, message: 'Please provide all required product parameters' });
    }

    const existing = await prisma.loanProduct.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Product code already in use' });
    }

    const product = await prisma.loanProduct.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description || '',
        minAmount: parseFloat(minAmount),
        maxAmount: parseFloat(maxAmount),
        interestMethod,
        defaultInterestRate: parseFloat(defaultInterestRate),
        minInterestRate: minInterestRate ? parseFloat(minInterestRate) : parseFloat(defaultInterestRate),
        maxInterestRate: maxInterestRate ? parseFloat(maxInterestRate) : parseFloat(defaultInterestRate),
        minTermMonths: parseInt(minTermMonths, 10),
        maxTermMonths: parseInt(maxTermMonths, 10),
        repaymentFrequency,
        processingFeeRate: parseFloat(processingFeeRate),
        insuranceFeeRate: parseFloat(insuranceFeeRate),
        isActive: true,
      },
    });

    await logAudit({
      action: 'CREATE_LOAN_PRODUCT',
      entityType: 'LoanProduct',
      entityId: product.id,
      details: { code: product.code, name: product.name, rate: product.defaultInterestRate },
      req,
    });

    return res.status(201).json({ success: true, message: 'Loan product created successfully', data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const productId = parseInt(id, 10);
    const existing = await prisma.loanProduct.findUnique({ where: { id: productId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    delete updateData.id;

    if (updateData.minAmount) updateData.minAmount = parseFloat(updateData.minAmount);
    if (updateData.maxAmount) updateData.maxAmount = parseFloat(updateData.maxAmount);
    if (updateData.defaultInterestRate) updateData.defaultInterestRate = parseFloat(updateData.defaultInterestRate);
    if (updateData.minInterestRate) updateData.minInterestRate = parseFloat(updateData.minInterestRate);
    if (updateData.maxInterestRate) updateData.maxInterestRate = parseFloat(updateData.maxInterestRate);
    if (updateData.processingFeeRate) updateData.processingFeeRate = parseFloat(updateData.processingFeeRate);
    if (updateData.insuranceFeeRate) updateData.insuranceFeeRate = parseFloat(updateData.insuranceFeeRate);
    if (updateData.minTermMonths) updateData.minTermMonths = parseInt(updateData.minTermMonths, 10);
    if (updateData.maxTermMonths) updateData.maxTermMonths = parseInt(updateData.maxTermMonths, 10);

    const updated = await prisma.loanProduct.update({
      where: { id: productId },
      data: updateData,
    });

    await logAudit({
      action: 'UPDATE_LOAN_PRODUCT',
      entityType: 'LoanProduct',
      entityId: updated.id,
      details: { previous: existing, updated: updateData },
      req,
    });

    return res.json({ success: true, message: 'Loan product updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

