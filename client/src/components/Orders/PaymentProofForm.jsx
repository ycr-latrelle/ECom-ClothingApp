import { useState } from 'react';
import { submitPaymentProof } from '../../api/paymentApi.js';
import { receiptImageError } from '../../utils/receiptImage.js';
import { paymentLabel } from '../../utils/orders.js';

// Sends a receipt through the existing payment-proof API. The backend decides the
// resulting payment status; nothing is marked verified here.
export default function PaymentProofForm({ user, orderId, resubmitting, onSubmitted }) {
  const [paymentMethod, setPaymentMethod] = useState('GCash');
  const [sourceProvider, setSourceProvider] = useState('BPI');
  const [otherSource, setOtherSource] = useState('');
  const [senderName, setSenderName] = useState('');
  const [reference, setReference] = useState('');
  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState(null);

  const handleImage = (event) => {
    const file = event.target.files?.[0] ?? null;
    const problem = file ? receiptImageError(file) : '';

    if (problem) event.target.value = '';
    setImage(problem ? null : file);
    setImageError(problem);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const problem = receiptImageError(image);
    if (problem) {
      setImageError(problem);
      return;
    }

    const provider = sourceProvider === 'Other' ? otherSource.trim() : sourceProvider;
    if (!provider) {
      setSubmitError('Enter the bank or wallet you sent the payment from.');
      return;
    }

    setSending(true);
    setSubmitError('');

    try {
      const result = await submitPaymentProof(user, orderId, {
        paymentMethod,
        paymentSourceProvider: provider,
        senderName: senderName.trim(),
        paymentReferenceNumber: reference.trim(),
        proofImage: image,
      });

      setSentStatus(result?.paymentStatus ?? 'sent');
      onSubmitted?.(result);
    } catch (error) {
      setSubmitError(error.message || 'Could not submit payment proof. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sentStatus) {
    return (
      <p className="orders-banner is-success" role="status">
        Your receipt was sent.
        {sentStatus !== 'sent' && <> Payment status: {paymentLabel(sentStatus)}.</>}
      </p>
    );
  }

  return (
    <form className="orders-form" onSubmit={handleSubmit}>
      <h4>{resubmitting ? 'Resubmit payment proof' : 'Submit payment proof'}</h4>

      <label>
        Where did you send the payment from?
        <select value={sourceProvider} onChange={(event) => setSourceProvider(event.target.value)}>
          <option value="BPI">BPI</option>
          <option value="GCash">GCash</option>
          <option value="Maya">Maya</option>
          <option value="Other">Other bank or e-wallet</option>
        </select>
      </label>

      {sourceProvider === 'Other' && (
        <label>
          Bank or e-wallet name
          <input
            type="text"
            value={otherSource}
            onChange={(event) => setOtherSource(event.target.value)}
            maxLength={50}
            required
          />
        </label>
      )}

      <label>
        Store receiving account
        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
          <option value="GCash">GCash</option>
          <option value="Maya">Maya</option>
        </select>
      </label>

      <label>
        Sender name
        <input
          type="text"
          value={senderName}
          onChange={(event) => setSenderName(event.target.value)}
          maxLength={200}
          required
        />
      </label>

      <label>
        Payment reference number
        <input
          type="text"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          maxLength={120}
          required
        />
      </label>

      <label>
        Receipt screenshot
        <input type="file" accept="image/jpeg,image/png" onChange={handleImage} required />
        <span className="orders-hint">JPEG or PNG, up to 5 MB.</span>
      </label>

      {image && <p className="orders-hint">Selected: {image.name}</p>}
      {imageError && <p className="orders-error" role="alert">{imageError}</p>}
      {submitError && <p className="orders-error" role="alert">{submitError}</p>}

      <button type="submit" className="orders-button" disabled={sending}>
        {sending ? 'Sending receipt…' : resubmitting ? 'Resubmit payment proof' : 'Submit payment proof'}
      </button>
    </form>
  );
}
