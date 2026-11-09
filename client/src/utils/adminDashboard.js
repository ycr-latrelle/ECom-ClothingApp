const numberFormat = new Intl.NumberFormat('en-PH');
const pesoFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

function isActiveProduct(product) {
  return product.isActive ?? product.is_active ?? true;
}

export function getDashboardMetrics(products, orders, payments, inventory) {
  const activeProducts = products?.filter(isActiveProduct).length;
  const pendingOrders = orders?.filter(
    (order) => order.orderStatus === 'awaiting_payment',
  ).length;
  const pendingPayments = payments?.filter(
    (payment) => payment.status === 'pending_verification',
  ).length;
  const verifiedPayments = payments
    ?.filter((payment) => payment.status === 'verified')
    .reduce((total, payment) => total + (Number(payment.amount) || 0), 0);

  return [
    {
      label: 'Products',
      value: products ? numberFormat.format(products.length) : '—',
      description: products
        ? `${numberFormat.format(activeProducts)} active listings`
        : 'Product data unavailable',
      icon: '◇',
    },
    {
      label: 'Total orders',
      value: orders ? numberFormat.format(orders.length) : '—',
      description: orders ? 'All recorded orders' : 'Order data unavailable',
      icon: '▤',
    },
    {
      label: 'Pending orders',
      value: orders ? numberFormat.format(pendingOrders) : '—',
      description: orders ? 'Awaiting payment' : 'Order data unavailable',
      icon: '◷',
    },
    {
      label: 'Payment submissions',
      value: payments ? numberFormat.format(pendingPayments) : '—',
      description: payments
        ? 'Pending verification'
        : 'Payment data unavailable',
      icon: '₱',
    },
    {
      label: 'Verified payments',
      value: payments ? pesoFormat.format(verifiedPayments) : '—',
      description: payments
        ? 'Total verified submission amounts'
        : 'Payment data unavailable',
      icon: '✓',
    },
    {
      label: 'Low-stock products',
      value: inventory
        ? numberFormat.format(inventory.lowStockProducts)
        : '—',
      description: inventory
        ? `${numberFormat.format(inventory.outOfStockProducts)} out of stock`
        : 'Inventory data unavailable',
      icon: '!',
    },
  ];
}
