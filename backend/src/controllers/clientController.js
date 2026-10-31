import prisma from '../config/prisma.js';
import { logAudit } from '../services/auditService.js';

export const listClients = async (req, res) => {
  try {
    const { search, officerId, branchId, status, page = 1, limit = 25 } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = {};
    if (officerId) where.assignedOfficerId = parseInt(officerId, 10);
    if (branchId) where.branchId = parseInt(branchId, 10);
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { clientId: { contains: search } },
        { fullName: { contains: search } },
        { phone: { contains: search } },
        { ghanaCardNumber: { contains: search } },
        { communityTown: { contains: search } },
      ];
    }

    const [total, clients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        include: {
          assignedOfficer: {
            include: { staffProfile: true },
          },
          branch: true,
          loans: {
            select: {
              id: true,
              loanAccountNumber: true,
              status: true,
              principalAmount: true,
              totalOutstanding: true,
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formatted = clients.map((c) => {
      const activeLoan = c.loans.find((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
      return {
        id: c.id,
        clientId: c.clientId,
        fullName: c.fullName,
        phone: c.phone,
        altPhone: c.altPhone,
        email: c.email,
        residentialAddress: c.residentialAddress,
        communityTown: c.communityTown,
        ghanaCardNumber: c.ghanaCardNumber,
        occupation: c.occupation,
        employerBusinessName: c.employerBusinessName,
        status: c.status,
        officerName: c.assignedOfficer?.staffProfile?.fullName || 'Unassigned',
        branchName: c.branch?.name || 'Wassa Powuako',
        hasActiveLoan: !!activeLoan,
        activeLoanAccount: activeLoan?.loanAccountNumber || null,
        activeLoanOutstanding: activeLoan?.totalOutstanding || 0,
        createdAt: c.createdAt,
      };
    });

    return res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / take),
      data: formatted,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const registerClient = async (req, res) => {
  try {
    const {
      fullName,
      dateOfBirth,
      gender,
      phone,
      altPhone,
      email,
      residentialAddress,
      communityTown = 'Wassa Powuako',
      ghanaCardNumber,
      occupation,
      employerBusinessName,
      employmentAddress,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinRelation,
      assignedOfficerId,
      branchId,
      notes,
      guarantor, // optional nested guarantor object
    } = req.body;

    if (!fullName || !phone || !residentialAddress || !ghanaCardNumber || !nextOfKinName || !nextOfKinPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all mandatory client details (Full name, phone, address, Ghana Card, Next of kin)',
      });
    }

    // Check duplicate Ghana Card or Phone
    const duplicate = await prisma.client.findFirst({
      where: {
        OR: [{ ghanaCardNumber: ghanaCardNumber.trim() }, { phone: phone.trim() }],
      },
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Client already exists with this Ghana Card or Phone number (Existing Client ID: ${duplicate.clientId})`,
      });
    }

    // Auto-generate client ID: EF-CL-XXXXX
    const clientCount = await prisma.client.count();
    const clientId = `EF-CL-${String(clientCount + 101).padStart(5, '0')}`;

    const effectiveBranchId = branchId ? parseInt(branchId, 10) : (req.user?.branchId || 1);
    const effectiveOfficerId = assignedOfficerId ? parseInt(assignedOfficerId, 10) : req.user?.id;

    const newClient = await prisma.client.create({
      data: {
        clientId,
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        phone: phone.trim(),
        altPhone: altPhone ? altPhone.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        residentialAddress: residentialAddress.trim(),
        communityTown: communityTown.trim(),
        ghanaCardNumber: ghanaCardNumber.trim().toUpperCase(),
        occupation: occupation ? occupation.trim() : 'Self-Employed / Trader',
        employerBusinessName,
        employmentAddress,
        nextOfKinName: nextOfKinName.trim(),
        nextOfKinPhone: nextOfKinPhone.trim(),
        nextOfKinRelation: nextOfKinRelation ? nextOfKinRelation.trim() : 'Family',
        branchId: effectiveBranchId,
        assignedOfficerId: effectiveOfficerId,
        createdByUserId: req.user?.id,
        notes,
        guarantors: guarantor && guarantor.fullName ? {
          create: {
            fullName: guarantor.fullName.trim(),
            phone: guarantor.phone.trim(),
            altPhone: guarantor.altPhone || '',
            address: guarantor.address || '',
            occupation: guarantor.occupation || '',
            employer: guarantor.employer || '',
            ghanaCardNumber: (guarantor.ghanaCardNumber || 'GHA-000000000-0').toUpperCase(),
            relationship: guarantor.relationship || 'Guarantor',
            liabilityAgreed: true,
          },
        } : undefined,
      },
      include: {
        guarantors: true,
        branch: true,
      },
    });

    await logAudit({
      action: 'REGISTER_CLIENT',
      entityType: 'Client',
      entityId: newClient.id,
      details: { clientId: newClient.clientId, fullName: newClient.fullName, ghanaCard: newClient.ghanaCardNumber },
      req,
    });

    return res.status(201).json({
      success: true,
      message: `Client ${newClient.clientId} registered successfully`,
      data: newClient,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getClientProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findFirst({
      where: {
        OR: [
          { id: !isNaN(id) ? parseInt(id, 10) : -1 },
          { clientId: id },
        ],
      },
      include: {
        branch: true,
        assignedOfficer: { include: { staffProfile: true } },
        guarantors: true,
        loans: {
          include: {
            product: true,
            repaymentSchedules: { orderBy: { installmentNumber: 'asc' } },
            repayments: { orderBy: { paymentDate: 'desc' } },
            disbursement: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        loanApplications: {
          include: { product: true },
          orderBy: { createdAt: 'desc' },
        },
        followUps: {
          include: { officer: { include: { staffProfile: true } } },
          orderBy: { followUpDate: 'desc' },
        },
        complaints: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    return res.json({ success: true, data: client });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const clientId = parseInt(id, 10);
    const existing = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    delete updateData.id;
    delete updateData.clientId; // Immutable identifier
    delete updateData.createdAt;

    if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    if (updateData.branchId) updateData.branchId = parseInt(updateData.branchId, 10);
    if (updateData.assignedOfficerId) updateData.assignedOfficerId = parseInt(updateData.assignedOfficerId, 10);

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
    });

    await logAudit({
      action: 'UPDATE_CLIENT',
      entityType: 'Client',
      entityId: updated.id,
      details: { previous: existing, updated: updateData },
      req,
    });

    return res.json({ success: true, message: 'Client record updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addGuarantor = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, altPhone, address, occupation, employer, ghanaCardNumber, relationship } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ success: false, message: 'Guarantor full name and phone are required' });
    }

    const guarantor = await prisma.guarantor.create({
      data: {
        clientId: parseInt(id, 10),
        fullName: fullName.trim(),
        phone: phone.trim(),
        altPhone: altPhone || '',
        address: address || '',
        occupation: occupation || '',
        employer: employer || '',
        ghanaCardNumber: ghanaCardNumber ? ghanaCardNumber.trim().toUpperCase() : 'N/A',
        relationship: relationship || 'Guarantor',
        liabilityAgreed: true,
      },
    });

    await logAudit({
      action: 'ADD_GUARANTOR',
      entityType: 'Guarantor',
      entityId: guarantor.id,
      details: { clientId: id, guarantorName: fullName },
      req,
    });

    return res.status(201).json({ success: true, message: 'Guarantor added successfully', data: guarantor });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

