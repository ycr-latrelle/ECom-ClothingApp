const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export async function submitPaymentProof(
  user,
  orderId,
  { paymentMethod, senderName, paymentReferenceNumber, proofImage },
) {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is missing from the client environment.');
  }

  if (!user) {
    throw new Error('Sign in again before submitting payment proof.');
  }

  const token = await user.getIdToken();
  const formData = new FormData();

  formData.append('PaymentMethod', paymentMethod);
  formData.append('SenderName', senderName);
  formData.append('PaymentReferenceNumber', paymentReferenceNumber);
  formData.append('ProofImage', proofImage);

  const response = await fetch(
    `${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/payment-proof`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  const responseText = await response.text();
  let result = null;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    // The API response was not JSON.
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
        result?.title ||
        `Could not submit payment proof (HTTP ${response.status}).`,
    );
  }

  return result;
}