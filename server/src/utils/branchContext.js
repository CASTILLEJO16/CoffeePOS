// Simple global context for branch (per-request lightweight)
let currentBranchId = 1;

export function setBranchId(id) {
  currentBranchId = id || 1;
}

export function getBranchId() {
  return currentBranchId || 1;
}
