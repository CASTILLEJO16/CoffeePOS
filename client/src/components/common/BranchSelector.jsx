import { useEffect, useState } from 'react';

export default function BranchSelector() {
  const [branch, setBranch] = useState(localStorage.getItem('branchId') || '1');

  useEffect(() => {
    localStorage.setItem('branchId', branch);
  }, [branch]);

  return (
    <select
      value={branch}
      onChange={(e) => setBranch(e.target.value)}
      style={{ padding: '6px', borderRadius: '6px' }}
    >
      <option value="1">Sucursal 1</option>
      <option value="2">Sucursal 2</option>
    </select>
  );
}
