import { useState } from 'react';
import { resolveImageUrl } from '../../utils/imageUrl.js';

// Neutral stand-in shown when an image cannot be loaded (product without an
// uploaded image, API offline, expired link). It is an <img>, so every existing
// sizing and object-fit rule keeps applying and layouts do not shift.
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' +
      '<rect width="120" height="120" fill="#e9e6e2"/>' +
      '<g fill="none" stroke="#a5a6a2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="34" y="38" width="52" height="44" rx="4"/>' +
      '<circle cx="48" cy="52" r="4"/>' +
      '<path d="M34 74l16-14 12 10 8-6 16 14"/>' +
      '</g></svg>',
  );

export default function ProductImage({ src, alt = '', ...props }) {
  const resolved = resolveImageUrl(src);
  const [failedSrc, setFailedSrc] = useState(null);
  const failed = !resolved || failedSrc === resolved;

  return (
    <img
      {...props}
      src={failed ? PLACEHOLDER : resolved}
      alt={alt}
      onError={() => setFailedSrc(resolved)}
    />
  );
}
