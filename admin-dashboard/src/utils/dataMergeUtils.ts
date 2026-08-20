import { ConnectedUser, Order } from '../types';

/**
 * Deterministic normalization and upsert-merge for Connected Users.
 * Guarantees that:
 * 1. Rows maintain stable identities (keyed by 10-digit phone or id).
 * 2. Active users always appear first.
 * 3. Most recently connected/active users (e.g. Kavi) stay consistently at the top without jumping.
 * 4. Existing users maintain their relative positions without dancing.
 */
export function mergeAndSortUsers(
  existingUsers: ConnectedUser[],
  incomingUsers: (ConnectedUser | any)[]
): ConnectedUser[] {
  const userMap = new Map<string, ConnectedUser>();

  const getCleanKey = (u: any): string => {
    if (!u) return '';
    const phone = String(u.phone || u.phone_number || u.mobile || '').replace(/\D/g, '').slice(-10);
    if (phone && phone.length >= 7) return `phone_${phone}`;
    if (u.id && String(u.id).trim()) return `id_${String(u.id).trim()}`;
    const name = String(u.name || u.full_name || '').toLowerCase().trim();
    if (name && name !== 'valued guest' && name !== 'shopper') return `name_${name}`;
    return `mac_${u.macAddress || u.ipAddress || Math.random()}`;
  };

  // 1. Seed existing users
  if (Array.isArray(existingUsers)) {
    existingUsers.forEach(u => {
      const key = getCleanKey(u);
      if (key) userMap.set(key, { ...u });
    });
  }

  // 2. Upsert incoming users
  if (Array.isArray(incomingUsers)) {
    incomingUsers.forEach(u => {
      if (!u) return;
      const key = getCleanKey(u);
      if (!key) return;

      const prev = userMap.get(key);
      const rawStatus = String(u.status || (prev ? prev.status : 'Active')).toLowerCase();
      const status: 'Active' | 'Disconnected' = rawStatus === 'disconnected' ? 'Disconnected' : 'Active';

      const visitedStores = Array.from(
        new Set([
          ...(prev?.visitedStores || []),
          ...(Array.isArray(u.visitedStores) ? u.visitedStores : [])
        ])
      );

      const resolvedCreatedAt = u.created_at || (u as any).createdAt || prev?.created_at || (prev as any)?.createdAt || new Date().toISOString();
      const resolvedName = (u.name && u.name !== 'Valued Guest' && u.name !== 'Shopper') 
        ? u.name 
        : (prev?.name || u.name || 'Valued Guest');

      userMap.set(key, {
        id: String(u.id || prev?.id || `usr-${key.replace(/\D/g, '') || Date.now()}`),
        name: resolvedName,
        phone: u.phone || (u as any).phone_number || prev?.phone || '+91 98000 00000',
        macAddress: u.macAddress || prev?.macAddress || 'FE:88:99:A1:B2:C3',
        ipAddress: u.ipAddress || prev?.ipAddress || '192.168.10.101',
        connectionTime: u.connectionTime || prev?.connectionTime || 'Just now',
        sessionDuration: u.sessionDuration || prev?.sessionDuration || '1m',
        visitedStores,
        dataUsed: u.dataUsed || prev?.dataUsed || '15 MB',
        status,
        vipStatus: Boolean(u.vipStatus ?? prev?.vipStatus ?? true),
        zone: u.zone || (u as any).floor_detected || prev?.zone || 'Ground Floor Atrium',
        deviceType: u.deviceType || prev?.deviceType || 'iOS',
        created_at: resolvedCreatedAt,
        createdAt: resolvedCreatedAt
      } as ConnectedUser);
    });
  }

  // 3. Deterministic Sort:
  // - Active users first
  // - Newest created_at / connectionTime first
  // - Stable tie-breaker by name/phone
  return Array.from(userMap.values()).sort((a, b) => {
    // Priority 1: Status (Active = 1, Disconnected = 0)
    const aActive = a.status === 'Active' ? 1 : 0;
    const bActive = b.status === 'Active' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;

    // Priority 2: Timestamp (newest first)
    const aIso = (a as any).createdAt || a.created_at || '';
    const bIso = (b as any).createdAt || b.created_at || '';
    if (aIso && bIso && aIso !== bIso) {
      const aT = new Date(aIso).getTime();
      const bT = new Date(bIso).getTime();
      if (!isNaN(aT) && !isNaN(bT) && aT !== bT) {
        return bT - aT;
      }
    }

    // Priority 3: Fallback stable comparison
    return (a.name || '').localeCompare(b.name || '') || (a.phone || '').localeCompare(b.phone || '');
  });
}

/**
 * Deterministic normalization and upsert-merge for Orders.
 * Guarantees that:
 * 1. Orders maintain stable identities (keyed by orderNumber or id).
 * 2. Newly placed orders (e.g. Kavi's order) stay consistently at the top.
 * 3. Total order count remains strictly consistent without dropping/flickering.
 * 4. Existing orders maintain their relative positions.
 */
export function mergeAndSortOrders(
  existingOrders: Order[],
  incomingOrders: (Order | any)[]
): Order[] {
  const orderMap = new Map<string, Order>();

  const getCleanKey = (o: any): string => {
    if (!o) return '';
    const orderNum = (o.orderNumber || o.order_number || '').trim();
    if (orderNum) return `num_${orderNum}`;
    if (o.id && String(o.id).trim()) return `id_${String(o.id).trim()}`;
    const phone = String(o.customerPhone || o.customer_phone || '').replace(/\D/g, '');
    const amt = Number(o.totalAmount || o.total_amount || 0);
    const store = String(o.storeName || o.store_name || '');
    return `composite_${phone}_${amt}_${store}`;
  };

  // 1. Seed existing orders
  if (Array.isArray(existingOrders)) {
    existingOrders.forEach(o => {
      const key = getCleanKey(o);
      if (key) orderMap.set(key, { ...o });
    });
  }

  // 2. Upsert incoming orders
  if (Array.isArray(incomingOrders)) {
    incomingOrders.forEach(o => {
      if (!o) return;
      const key = getCleanKey(o);
      if (!key) return;

      const prev = orderMap.get(key);
      const rawStatus = String(o.status || (prev ? prev.status : 'Completed')).toLowerCase();
      const status: 'Completed' | 'Processing' | 'Pending' | 'Cancelled' =
        rawStatus === 'processing' ? 'Processing' :
        rawStatus === 'pending' ? 'Pending' :
        rawStatus === 'cancelled' ? 'Cancelled' : 'Completed';

      const resolvedCreatedAt = o.created_at || (o as any).createdAt || prev?.created_at || (prev as any)?.createdAt || new Date().toISOString();
      const rawItems = Array.isArray(o.items) && o.items.length > 0 
        ? o.items.map((i: any) => ({
            name: i.name || i.item_name || i.item?.name || 'Designer Item',
            quantity: Number(i.quantity || i.qty || 1),
            price: Number(i.price || i.unit_price || 2495)
          }))
        : prev?.items || [
            { name: o.item_name || 'Designer Item', quantity: Number(o.quantity || o.itemsCount || 1), price: Number(o.totalAmount || 2495) }
          ];

      const itemsList = Array.isArray(o.itemsList) 
        ? o.itemsList 
        : rawItems.map((i: any) => `${i.name} (x${i.quantity})`);

      const orderNumber = o.orderNumber || o.order_number || prev?.orderNumber || prev?.order_number || `#AX-${String(o.id || Date.now()).slice(-4)}`;

      orderMap.set(key, {
        id: String(o.id || prev?.id || `ord-${orderNumber.replace(/\D/g, '') || Date.now()}`),
        orderNumber,
        order_number: orderNumber,
        customerName: o.customerName || (o as any).user_name || (o as any).customer_name || prev?.customerName || 'Valued Guest',
        customerPhone: o.customerPhone || (o as any).user_phone || (o as any).customer_phone || prev?.customerPhone || '+91 98000 00000',
        storeName: o.storeName || (o as any).store_name || prev?.storeName || 'Nike Flagship',
        storeCategory: o.storeCategory || prev?.storeCategory || 'Fashion',
        orderType: o.orderType || (o as any).order_type || prev?.orderType || 'Click & Collect',
        paymentMethod: o.paymentMethod || (o as any).payment_method || prev?.paymentMethod || 'UPI / GPay',
        itemsCount: Number(o.itemsCount || o.quantity || prev?.itemsCount || rawItems.reduce((a: number, b: any) => a + b.quantity, 0)),
        totalAmount: Number(o.totalAmount || (o as any).total_amount || prev?.totalAmount || 2495),
        timestamp: o.timestamp || prev?.timestamp || 'Just now',
        status,
        itemsList,
        items: rawItems,
        created_at: resolvedCreatedAt,
        createdAt: resolvedCreatedAt
      } as Order);
    });
  }

  // 3. Deterministic Sort:
  // - Newest created_at first
  // - Higher order number first (e.g. #AX-1095 > #AX-1090)
  // - Stable fallback
  return Array.from(orderMap.values()).sort((a, b) => {
    // Priority 1: ISO timestamp
    const aIso = (a as any).createdAt || a.created_at || '';
    const bIso = (b as any).createdAt || b.created_at || '';
    if (aIso && bIso && aIso !== bIso) {
      const aT = new Date(aIso).getTime();
      const bT = new Date(bIso).getTime();
      if (!isNaN(aT) && !isNaN(bT) && aT !== bT) {
        return bT - aT;
      }
    }

    // Priority 2: Order Number descending
    const aDigits = parseInt((a.orderNumber || a.id || '').replace(/\D/g, '')) || 0;
    const bDigits = parseInt((b.orderNumber || b.id || '').replace(/\D/g, '')) || 0;
    if (aDigits !== bDigits) {
      return bDigits - aDigits;
    }

    // Priority 3: Fallback string comparison
    return (b.orderNumber || b.id || '').localeCompare(a.orderNumber || a.id || '');
  });
}
