import { useState } from 'react';
import { formatDateTime, safeHttpUrl } from '../../utils/orders.js';

export default function ShipmentInfo({ shipment }) {
  const [copied, setCopied] = useState('');

  const trackingLink = safeHttpUrl(shipment?.trackingUrl);

  const copyTracking = async () => {
    try {
      await navigator.clipboard.writeText(shipment.trackingNumber);
      setCopied('Copied to clipboard');
    } catch {
      setCopied('Couldn’t copy. Select the number and copy it manually.');
    }
  };

  return (
    <section className="orders-block" aria-labelledby="order-shipment-title">
      <h3 id="order-shipment-title">Shipment</h3>

      {!shipment ? (
        <p className="orders-muted">
          Tracking details haven’t been provided yet. They will appear here once your order ships.
        </p>
      ) : (
        <>
          <dl className="orders-details">
            {shipment.courier && (
              <div><dt>Courier</dt><dd>{shipment.courier}</dd></div>
            )}
            {shipment.trackingNumber && (
              <div>
                <dt>Tracking number</dt>
                <dd>
                  <span className="orders-mono">{shipment.trackingNumber}</span>
                  <button type="button" className="orders-link" onClick={copyTracking}>
                    Copy
                  </button>
                </dd>
              </div>
            )}
            {shipment.shippedAt && (
              <div><dt>Shipped</dt><dd>{formatDateTime(shipment.shippedAt)}</dd></div>
            )}
            {shipment.estimatedDelivery && (
              <div>
                <dt>Estimated delivery</dt>
                <dd>{formatDateTime(shipment.estimatedDelivery)}</dd>
              </div>
            )}
          </dl>

          <p className="orders-note" role="status">{copied}</p>

          {trackingLink && (
            <a className="orders-link" href={trackingLink} target="_blank" rel="noopener noreferrer">
              Track your package <span aria-hidden="true">↗</span>
            </a>
          )}
        </>
      )}
    </section>
  );
}
