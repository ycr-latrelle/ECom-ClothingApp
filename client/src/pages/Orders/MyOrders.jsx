import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { useProducts } from '../../context/useProducts.js';
import AccountNav from '../../components/Orders/AccountNav.jsx';
import OrderCard from '../../components/Orders/OrderCard.jsx';
import OrderDrawer from '../../components/Orders/OrderDrawer.jsx';
import OrderFilters from '../../components/Orders/OrderFilters.jsx';
import { useMyOrders } from '../../components/Orders/useMyOrders.js';
import { useOrderDetail } from '../../components/Orders/useOrderDetail.js';
import { FILTERS, matchesFilter, orderStats } from '../../utils/orders.js';
import '../../components/Orders/Orders.css';

function ListError({ error, onRetry }) {
  const unavailable = error?.kind === 'unavailable' || error?.kind === 'notFound';

  return (
    <div className="orders-state" role="alert">
      <h2>{unavailable ? 'Order history isn’t available yet' : 'We couldn’t load your orders'}</h2>
      <p>
        {unavailable
          ? 'The store hasn’t turned on order history yet. Please check back soon.'
          : error?.message || 'Something went wrong. Please try again.'}
      </p>
      <button type="button" className="orders-button" onClick={onRetry}>Try again</button>

      <details>
        <summary>Technical details</summary>
        <p>GET /api/orders returned {error?.status ? `HTTP ${error.status}` : error?.kind ?? 'an error'}.</p>
      </details>
    </div>
  );
}

export default function MyOrders() {
  const { user } = useAuth();
  const { products, loading: productsLoading } = useProducts();
  const { status, orders, error, reload } = useMyOrders(user);

  const [params, setParams] = useSearchParams();
  const requested = params.get('status');
  const filter = FILTERS.some((entry) => entry.id === requested) ? requested : 'all';

  // The list stays mounted under the drawer, so the filter and scroll position survive.
  const [selected, setSelected] = useState(null);
  const detail = useOrderDetail(user, selected?.id ?? null);

  const productsById = useMemo(
    () => new Map(products.map((product) => [String(product.id), product])),
    [products],
  );

  const stats = useMemo(() => orderStats(orders), [orders]);
  const visible = orders.filter((order) => matchesFilter(order, filter));
  const selectedOrder = selected ? orders.find((order) => order.id === selected.id) : null;

  const changeFilter = (value) => {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete('status');
    else next.set('status', value);
    setParams(next, { replace: true });
  };

  const closeDrawer = useCallback(() => setSelected(null), []);

  // After a receipt is sent, refresh both the list and the open order.
  const handlePaymentSubmitted = () => {
    reload();
    detail.retry();
  };

  const filterLabel = FILTERS.find((entry) => entry.id === filter)?.label.toLowerCase();

  return (
    <main className="orders-page">
      <AccountNav />

      <header className="orders-hero">
        <p className="eyebrow">Account</p>
        <h1>My Orders</h1>
        <p>Track your orders, check payment status and reorder your favorites.</p>
      </header>

      {status === 'loading' && (
        <div role="status" aria-label="Loading your orders">
          <div className="orders-skeletons" aria-hidden="true">
            <span /><span /><span />
          </div>
          <p className="orders-muted">Loading your orders…</p>
        </div>
      )}

      {status === 'error' && <ListError error={error} onRetry={reload} />}

      {status === 'ready' && (
        <>
          <dl className="orders-stats">
            <div><dt>Total orders</dt><dd>{stats.total}</dd></div>
            <div><dt>Processing</dt><dd>{stats.processing}</dd></div>
            <div><dt>Completed</dt><dd>{stats.completed}</dd></div>
          </dl>

          {orders.length === 0 ? (
            <div className="orders-state">
              <h2>No orders yet</h2>
              <p>When you place an order, it will show up here.</p>
              <Link className="orders-button" to="/shop">Start shopping</Link>
            </div>
          ) : (
            <>
              <OrderFilters orders={orders} active={filter} onChange={changeFilter} />

              {visible.length === 0 ? (
                <div className="orders-state">
                  <h2>No {filterLabel}</h2>
                  <p>Nothing matches this filter.</p>
                  <button type="button" className="orders-button is-outline" onClick={() => changeFilter('all')}>
                    Show all orders
                  </button>
                </div>
              ) : (
                <div className="orders-list">
                  {visible.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      productsById={productsById}
                      onOpen={(item, trigger) => setSelected({ id: item.id, trigger })}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {selectedOrder && (
        <OrderDrawer
          key={selectedOrder.id}
          summary={selectedOrder}
          detail={detail}
          user={user}
          products={products}
          productsLoading={productsLoading}
          returnFocusTo={selected.trigger}
          onClose={closeDrawer}
          onPaymentSubmitted={handlePaymentSubmitted}
        />
      )}
    </main>
  );
}
