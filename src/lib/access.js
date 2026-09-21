export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  kasir: 'Kasir',
  staff: 'Staff',
}

const routeRoles = {
  dashboard: ['owner', 'admin', 'kasir', 'staff'],
  customers: ['owner', 'admin', 'kasir'],
  transactions: ['owner', 'admin', 'kasir', 'staff'],
  finance: ['owner', 'admin'],
  inventory: ['owner', 'admin'],
  services: ['owner', 'admin', 'kasir'],
  team: ['owner'],
}

const actionRoles = {
  customerCreate: ['owner', 'admin', 'kasir'],
  customerEdit: ['owner', 'admin', 'kasir'],
  customerDelete: ['owner', 'admin'],
  transactionCreate: ['owner', 'admin', 'kasir'],
  transactionEdit: ['owner', 'admin', 'kasir'],
  transactionDelete: ['owner', 'admin'],
  payment: ['owner', 'admin', 'kasir'],
  qris: ['owner', 'admin', 'kasir'],
  status: ['owner', 'admin', 'staff'],
  intakeStatus: ['owner', 'admin', 'kasir'],
  pickupStatus: ['owner', 'admin', 'kasir'],
  inventoryManage: ['owner', 'admin'],
  serviceManage: ['owner', 'admin'],
  receipt: ['owner', 'admin', 'kasir'],
}

export const normalizeRole = role => String(role || '').toLowerCase()
export const canAccess = (role, resource) => routeRoles[resource]?.includes(normalizeRole(role)) || false
export const can = (role, action) => actionRoles[action]?.includes(normalizeRole(role)) || false

export const routeForPath = path => {
  if (path === '/') return 'dashboard'
  if (path.startsWith('/pelanggan')) return 'customers'
  if (path.startsWith('/transaksi')) return 'transactions'
  if (path.startsWith('/keuangan')) return 'finance'
  if (path.startsWith('/stok')) return 'inventory'
  if (path.startsWith('/layanan')) return 'services'
  if (path.startsWith('/tim')) return 'team'
  return null
}
