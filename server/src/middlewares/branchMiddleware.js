// Middleware simple para manejar sucursal (fase 1)
// Lee header x-branch-id o usa default = 1

import { setBranchId } from '../utils/branchContext.js';

export function attachBranch(req, res, next) {
  const header = req.headers['x-branch-id'];
  const branchId = header ? Number(header) : 1;

  // Validación básica
  req.branchId = Number.isFinite(branchId) && branchId > 0 ? branchId : 1;

  // set global context for this request lifecycle (simple approach)
  try {
    setBranchId(req.branchId);
  } catch {}

  next();
}
