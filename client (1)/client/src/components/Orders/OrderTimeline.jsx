import { buildTimeline, formatDateTime, orderLabel } from '../../utils/orders.js';

export default function OrderTimeline({ order }) {
  const timeline = buildTimeline(order);

  return (
    <section className="orders-block" aria-labelledby="order-timeline-title">
      <h3 id="order-timeline-title">Order timeline</h3>

      <p className="orders-current">
        <span>Current status</span>
        <strong>{orderLabel(order.orderStatus)}</strong>
      </p>

      {timeline.items.length > 0 && (
        <ol className="orders-timeline">
          {timeline.items.map((item) => (
            <li key={item.key} className={`is-${item.state}`}>
              <p className="orders-timeline-title">
                {item.title}
                {item.state === 'current' && <span className="orders-timeline-now"> · Current</span>}
              </p>
              {item.description && <p className="orders-timeline-text">{item.description}</p>}
              {item.at && (
                <time className="orders-timeline-time" dateTime={item.at}>
                  {formatDateTime(item.at, { time: true })}
                </time>
              )}
            </li>
          ))}
        </ol>
      )}

      {timeline.mode === 'recorded' && (
        <p className="orders-note">
          A full status history isn’t available yet. This list shows only the dates we have on
          record.
        </p>
      )}
    </section>
  );
}
