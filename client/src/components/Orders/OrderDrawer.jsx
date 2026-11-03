import { useEffect, useId, useRef, useState } from 'react';
import { useCart } from '../../context/useCart.js';
import { MAX_QTY } from '../../context/cart-context.js';
import { formatPeso } from '../../data/products.js';
import {
  formatDateTime,
  hasPreorderBalance,
  mergeOrder,
  orderBucket,
  planReorder,
} from '../../utils/orders.js';
import OrderStatusBadge from './OrderStatusBadge.jsx';
import OrderTimeline from './OrderTimeline.jsx';
import PaymentInfo from './PaymentInfo.jsx';
import ShipmentInfo from './ShipmentInfo.jsx';

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function detailMessage(error) {
  if (error?.kind === 'notFound') return 'We couldn’t find this order.';
  if (error?.kind === 'unavailable') return 'Order details aren’t available yet.';
  return error?.message || 'Could not load the order details.';
}

function Money({ value }) {
  return <>{formatPeso(value)}</>;
}

export default function OrderDrawer({
  summary,
  detail,
  user,
  products,
  productsLoading,
  returnFocusTo,
  onClose,
  onPaymentSubmitted,
}) {
  const { addItem, openCart } = useCart();
  const panelRef = useRef(null);
  const titleId = useId();
  const [reorderResult, setReorderResult] = useState(null);

  const order = mergeOrder(summary, detail.order);
  const { totals } = order;

  // Escape closes, Tab stays inside the drawer, the page behind does not scroll.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector('.orders-drawer-close')?.focus();

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter(
        (node) => node.offsetParent !== null,
      );
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (!panelRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey, true);

    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      if (returnFocusTo instanceof HTMLElement && document.contains(returnFocusTo)) {
        returnFocusTo.focus();
      }
    };
  }, [onClose, returnFocusTo]);

  const canReorder = order.items.some((item) => item.productId);

  const handleReorder = () => {
    const { add, skipped } = planReorder(order, products, MAX_QTY);

    add.forEach(({ product, size, qty }) =>
      addItem(
        {
          id: String(product.id),
          name: product.name,
          price: Number(product.price),
          image: product.image,
          category: product.category,
          status: product.status,
          size,
        },
        qty,
      ),
    );

    setReorderResult({ added: add.length, skipped });
  };

  const rows = [
    ['Subtotal', totals.subtotal],
    ['Shipping fee', totals.shippingFee],
    ['Discounts', totals.discount],
    ['Deposit paid', totals.depositPaid],
    ['Due at checkout', totals.dueToday],
    [hasPreorderBalance(order) ? 'Balance due on arrival' : 'Outstanding balance', totals.balance],
  ].filter(([, value]) => value !== undefined);

  const delivery = order.delivery;
  const hasDelivery = Object.values(delivery).some(Boolean);
  const bucket = orderBucket(order.orderStatus);

  return (
    <div className="orders-drawer-root">
      <div className="orders-drawer-overlay" onClick={onClose} />

      <aside
        ref={panelRef}
        className="orders-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="orders-drawer-header">
          <div>
            <p className="eyebrow">Order details</p>
            <h2 id={titleId}>Order {order.code}</h2>
            {order.createdAt && (
              <p className="orders-card-date">
                Placed <time dateTime={order.createdAt}>{formatDateTime(order.createdAt, { time: true })}</time>
              </p>
            )}
          </div>

          <button type="button" className="orders-drawer-close" onClick={onClose} aria-label="Close order details">
            ✕
          </button>
        </header>

        <div className="orders-drawer-body">
          <div className="orders-card-badges">
            <OrderStatusBadge kind="order" prefix="Order:" status={order.orderStatus} />
            <OrderStatusBadge kind="payment" prefix="Payment:" status={order.paymentStatus} />
            {order.isTest === true && <span className="orders-badge is-neutral">Test order</span>}
          </div>

          {detail.status === 'loading' && (
            <p className="orders-muted" role="status">Loading order details…</p>
          )}

          {detail.status === 'error' && (
            <div className="orders-banner is-error" role="alert">
              <p>{detailMessage(detail.error)}</p>
              {detail.error?.kind !== 'notFound' && detail.error?.kind !== 'unavailable' && (
                <button type="button" className="orders-link" onClick={detail.retry}>
                  Try again
                </button>
              )}
            </div>
          )}

          <OrderTimeline order={order} />

          <section className="orders-block" aria-labelledby="order-items-title">
            <h3 id="order-items-title">Items</h3>

            {order.items.length === 0 ? (
              <p className="orders-muted">Item details aren’t available for this order yet.</p>
            ) : (
              <ul className="orders-items">
                {order.items.map((item, index) => {
                  const product = products.find((p) => String(p.id) === item.productId);
                  const image = item.image ?? product?.image;

                  return (
                    <li key={`${item.productId ?? 'item'}-${item.size ?? ''}-${index}`}>
                      <div className="orders-item-media">
                        {image ? <img src={image} alt="" loading="lazy" /> : <span aria-hidden="true">◻</span>}
                      </div>
                      <div className="orders-item-info">
                        <p className="orders-item-name">{item.name ?? product?.name ?? 'Item'}</p>
                        <p className="orders-card-meta">
                          {item.size && <span>Size {item.size}</span>}
                          {item.qty !== undefined && <span>Qty {item.qty}</span>}
                          {item.unitPrice !== undefined && <span><Money value={item.unitPrice} /> each</span>}
                        </p>
                      </div>
                      {item.lineTotal !== undefined && (
                        <p className="orders-item-total"><Money value={item.lineTotal} /></p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <PaymentInfo order={order} user={user} onSubmitted={onPaymentSubmitted} />

          <section className="orders-block" aria-labelledby="order-delivery-title">
            <h3 id="order-delivery-title">Delivery</h3>

            {!hasDelivery ? (
              <p className="orders-muted">Delivery details aren’t available for this order yet.</p>
            ) : (
              <dl className="orders-details">
                {delivery.name && <div><dt>Name</dt><dd>{delivery.name}</dd></div>}
                {delivery.phone && <div><dt>Contact number</dt><dd>{delivery.phone}</dd></div>}
                {delivery.address && <div><dt>Address</dt><dd>{delivery.address}</dd></div>}
                {delivery.notes && <div><dt>Delivery notes</dt><dd>{delivery.notes}</dd></div>}
              </dl>
            )}
          </section>

          <ShipmentInfo shipment={order.shipment} />

          <section className="orders-block" aria-labelledby="order-summary-title">
            <h3 id="order-summary-title">Summary</h3>

            {rows.length === 0 && totals.total === undefined ? (
              <p className="orders-muted">Amounts aren’t available for this order yet.</p>
            ) : (
              <dl className="orders-summary">
                {rows.map(([name, value]) => (
                  <div key={name}><dt>{name}</dt><dd><Money value={value} /></dd></div>
                ))}
                {totals.total !== undefined && (
                  <div className="is-total"><dt>Total</dt><dd><Money value={totals.total} /></dd></div>
                )}
              </dl>
            )}
          </section>

          <section className="orders-block orders-actions" aria-label="Order actions">
            {canReorder && (
              <button
                type="button"
                className="orders-button"
                onClick={handleReorder}
                disabled={productsLoading}
              >
                {productsLoading ? 'Loading products…' : 'Reorder these items'}
              </button>
            )}

            <div role="status">
              {reorderResult && (
                <div className="orders-banner is-success">
                  {reorderResult.added > 0 && (
                    <p>
                      Added {reorderResult.added} {reorderResult.added === 1 ? 'item' : 'items'} to your cart
                      at current prices.{' '}
                      <button type="button" className="orders-link" onClick={() => { onClose(); openCart(); }}>
                        View cart
                      </button>
                    </p>
                  )}
                  {reorderResult.skipped.map((entry) => (
                    <p key={entry.name}>{entry.name} {entry.reason}, so it wasn’t added.</p>
                  ))}
                  {reorderResult.added === 0 && reorderResult.skipped.length === 0 && (
                    <p>There was nothing to add.</p>
                  )}
                </div>
              )}
            </div>

            {bucket !== 'delivered' && bucket !== 'cancelled' && (
              <p className="orders-muted">Online cancellation requests aren’t available yet.</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
