import { formatPeso } from '../../data/products.js';
import { formatDateTime } from '../../utils/orders.js';
import OrderStatusBadge from './OrderStatusBadge.jsx';
import ProductImage from '../ProductImage/ProductImage.jsx';

export default function OrderCard({ order, productsById, onOpen }) {
  const first = order.items[0];
  const product = first?.productId ? productsById.get(String(first.productId)) : undefined;
  const image = first?.image ?? product?.image;
  const name = first?.name ?? product?.name ?? 'Order items';
  const extra = order.items.length - 1;

  const quantity = order.items.reduce((sum, item) => sum + (item.qty ?? 0), 0);
  const sizes = [...new Set(order.items.map((item) => item.size).filter(Boolean))];

  const amount =
    order.totals.total !== undefined
      ? { label: 'Total', value: order.totals.total }
      : order.totals.dueToday !== undefined
        ? { label: 'Due at checkout', value: order.totals.dueToday }
        : null;

  return (
    <article className="orders-card">
      <div className="orders-card-media">
        {image ? <ProductImage src={image} alt="" loading="lazy" /> : <span aria-hidden="true">◻</span>}
      </div>

      <div className="orders-card-body">
        <p className="orders-card-code">Order {order.code}</p>
        {order.createdAt && (
          <p className="orders-card-date">
            <time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time>
          </p>
        )}

        <h3>
          {name}
          {extra > 0 && <span className="orders-card-more"> +{extra} more</span>}
        </h3>

        <p className="orders-card-meta">
          {quantity > 0 && <span>Qty {quantity}</span>}
          {sizes.length > 0 && <span>Size {sizes.join(', ')}</span>}
        </p>
      </div>

      <div className="orders-card-side">
        {amount && (
          <p className="orders-card-amount">
            <span>{amount.label}</span>
            <strong>{formatPeso(amount.value)}</strong>
          </p>
        )}

        <div className="orders-card-badges">
          <OrderStatusBadge kind="payment" prefix="Payment:" status={order.paymentStatus} />
          <OrderStatusBadge kind="order" prefix="Order:" status={order.orderStatus} />
        </div>

        <button
          type="button"
          className="orders-button is-outline"
          onClick={(event) => onOpen(order, event.currentTarget)}
          aria-label={`View details for order ${order.code}`}
        >
          View details
        </button>
      </div>
    </article>
  );
}
