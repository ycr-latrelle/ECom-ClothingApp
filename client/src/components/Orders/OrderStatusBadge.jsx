import { orderLabel, orderTone, paymentLabel, paymentTone } from '../../utils/orders.js';

const GLYPHS = { success: '✓', warning: '…', danger: '✕', neutral: '•' };

// The label is always text; the glyph and color are extra cues, not the only one.
export default function OrderStatusBadge({ kind, status, prefix }) {
  const tone = kind === 'payment' ? paymentTone(status) : orderTone(status);
  const text = kind === 'payment' ? paymentLabel(status) : orderLabel(status);

  return (
    <span className={`orders-badge is-${tone}`}>
      <span aria-hidden="true">{GLYPHS[tone]}</span>
      {prefix && <span className="orders-badge-prefix">{prefix}</span>}
      {text}
    </span>
  );
}
