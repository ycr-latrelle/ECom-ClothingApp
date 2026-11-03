// Product data is served by the ASP.NET Core Web API (see src/api/productApi.js
// and src/context/ProductsProvider.jsx). Nothing in this file describes a product.

export const formatPeso = (n) => `₱${n.toLocaleString('en-PH')}`;
