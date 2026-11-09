
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { fetchAdminProducts } from '../../api/adminProductApi.js';
import {
  adjustInventoryStock,
  fetchInventory,
  fetchInventorySummary,
} from '../../api/inventoryApi.js';
import ProductImage from '../../components/ProductImage/ProductImage.jsx';
import {
  filterInventoryRows,
  getInventoryStatus,
  getProductAvailability,
  getProductImage,
  getProductStockTotal,
  INVENTORY_STATUS,
  INVENTORY_STATUS_LABELS,
  isProductActive,
  sortInventoryRows,
} from '../../utils/inventory.js';
import AdminDataTable from '../../components/Admin/AdminDataTable.jsx';
import AdminModal from '../../components/Admin/AdminModal.jsx';
import './AdminProducts.css';
import './AdminInventory.css';

const PAGE_SIZE = 8;
const numberFormat = new Intl.NumberFormat('en-PH');

const dateFormat = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value) {
  if (!value) return '—';

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? dateFormat.format(timestamp) : '—';
}

export default function AdminInventory() {
  const { user } = useAuth();

  const [reloadKey, setReloadKey] = useState(0);
  const [catalog, setCatalog] = useState({
    status: 'loading',
    products: [],
    error: '',
  });
  const [inventory, setInventory] = useState({
    status: 'loading',
    records: [],
    error: '',
  });
  const [summary, setSummary] = useState({
    status: 'loading',
    data: null,
    error: '',
  });

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [productStatus, setProductStatus] = useState('all');
  const [inventoryStatus, setInventoryStatus] = useState('all');
  const [sort, setSort] = useState('default');
  const [page, setPage] = useState(1);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;

    async function loadCatalog() {
      try {
        const products = await fetchAdminProducts(user);

        if (!cancelled) {
          setCatalog({ status: 'ready', products, error: '' });
        }
      } catch (error) {
        if (!cancelled) {
          setCatalog({
            status: 'error',
            products: [],
            error: error.message || 'Could not load products.',
          });
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;

    async function loadInventory() {
      try {
        const records = await fetchInventory(user);

        if (!cancelled) {
          setInventory({ status: 'ready', records, error: '' });
        }
      } catch (error) {
        if (!cancelled) {
          setInventory({
            status: 'error',
            records: [],
            error: error.message || 'Could not load inventory.',
          });
        }
      }
    }

    loadInventory();

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;

    async function loadSummary() {
      try {
        const data = await fetchInventorySummary(user);

        if (!cancelled) {
          setSummary({ status: 'ready', data, error: '' });
        }
      } catch (error) {
        if (!cancelled) {
          setSummary({
            status: 'error',
            data: null,
            error: error.message || 'Could not load summary.',
          });
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  const reload = useCallback(() => {
    setCatalog((current) => ({ ...current, status: 'loading', error: '' }));
    setInventory((current) => ({ ...current, status: 'loading', error: '' }));
    setSummary((current) => ({ ...current, status: 'loading', error: '' }));
    setNotice(null);
    setReloadKey((value) => value + 1);
  }, []);

  const recordsByProduct = useMemo(() => {
    const map = new Map();

    for (const record of inventory.records) {
      const key = String(record.productId);

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(record);
    }

    return map;
  }, [inventory.records]);

  const rows = useMemo(
    () =>
      catalog.products.map((product) => ({
        product,
        records: recordsByProduct.get(String(product.id)) || [],
      })),
    [catalog.products, recordsByProduct],
  );

  const categories = useMemo(
    () =>
      [
        ...new Set(
          catalog.products.map((product) => product.category).filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [catalog.products],
  );

  const visibleRows = useMemo(
    () =>
      sortInventoryRows(
        filterInventoryRows(rows, {
          search,
          category,
          productStatus,
          inventoryStatus,
        }),
        sort,
      ),
    [rows, search, category, productStatus, inventoryStatus, sort],
  );

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visibleRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setCategory('all');
    setProductStatus('all');
    setInventoryStatus('all');
    setSort('default');
    setPage(1);
  }

  const filtersActive =
    search.trim() !== '' ||
    category !== 'all' ||
    productStatus !== 'all' ||
    inventoryStatus !== 'all';

  const inventoryReady = inventory.status === 'ready';
  const inventoryColumns = [
    { key: 'product', label: 'Product' },
    { key: 'variants', label: 'Variants' },
    { key: 'available', label: 'Available units' },
    { key: 'inventoryStatus', label: 'Inventory status' },
    { key: 'productStatus', label: 'Product status' },
    { key: 'actions', label: 'Actions' },
  ];

  const renderInventoryRow = ({ product, records }) => (
    <>
      <td>
        <button
          type="button"
          className="ap-product-identity"
          onClick={() => setSelectedProduct(product)}
        >
          <span className="ap-product-thumb">
            <ProductImage
              src={getProductImage(product)}
              alt=""
              loading="lazy"
            />
          </span>
          <span className="ap-product-name">
            <strong>{product.name}</strong>
            <small>{product.category || 'Uncategorized'}</small>
          </span>
        </button>
      </td>
      <td>{records.length}</td>
      <td>
        <strong className="ai-stock">
          {numberFormat.format(getProductStockTotal(records))}
        </strong>
      </td>
      <td><ProductInventoryStatus records={records} /></td>
      <td><ProductStatus product={product} /></td>
      <td>
        <div className="ap-row-actions ai-actions">
          <button type="button" onClick={() => setSelectedProduct(product)}>
            View
          </button>
          <button type="button" onClick={() => setAdjustingProduct(product)}>
            Adjust stock
          </button>
        </div>
      </td>
    </>
  );

  return (
    <section className="admin-products admin-inventory">
      <header className="admin-products-heading">
        <div>
          <p className="eyebrow">STORE MANAGEMENT</p>
          <h1>Inventory</h1>
          <p className="admin-page-description">
            Manage stock for every product color and size.
          </p>
        </div>

        <div className="ai-heading-actions">
          <button
            type="button"
            className="ap-secondary-button"
            onClick={reload}
            disabled={
              catalog.status === 'loading' ||
              inventory.status === 'loading'
            }
          >
            Refresh
          </button>

          <Link to="/admin/products" className="ap-secondary-button">
            Manage products
          </Link>
        </div>
      </header>

      {notice && (
        <div
          className={`ap-preview-notice ${
            notice.type === 'error' ? 'ai-notice-error' : 'ai-notice-success'
          }`}
          role={notice.type === 'error' ? 'alert' : 'status'}
        >
          <p>{notice.message}</p>
          <button
            type="button"
            className="ai-link-button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
          >
            Dismiss
          </button>
        </div>
      )}

      {inventory.status === 'error' && (
        <div className="ap-preview-notice ai-notice-error" role="alert">
          <p>
            <strong>Inventory could not be loaded.</strong> {inventory.error}
          </p>
        </div>
      )}

      {catalog.status === 'error' && (
        <div className="ap-preview-notice ai-notice-error" role="alert">
          <p>
            <strong>Products could not be loaded.</strong> {catalog.error}
          </p>
        </div>
      )}

      <div className="ap-summary-grid">
        <SummaryCard
          label="Total products"
          value={catalog.status === 'ready' ? catalog.products.length : null}
          note="Products in the catalog"
          loading={catalog.status === 'loading'}
        />
        <SummaryCard
          label="Total available units"
          value={summary.data?.totalStockUnits}
          note="Available stock across variants"
          loading={summary.status === 'loading'}
        />
        <SummaryCard
          label="Low stock products"
          value={summary.data?.lowStockProducts}
          note="Products at or below threshold"
          loading={summary.status === 'loading'}
        />
        <SummaryCard
          label="Out of stock products"
          value={summary.data?.outOfStockProducts}
          note="Products with no available units"
          loading={summary.status === 'loading'}
        />
      </div>

      <section className="ap-catalog-panel">
        <div className="ap-catalog-header">
          <div>
            <h2>Product inventory</h2>
            <p>
              Select a product to view and adjust its color-size stock.
            </p>
          </div>

          <span className="ap-result-count">
            {visibleRows.length}{' '}
            {visibleRows.length === 1 ? 'product' : 'products'}
          </span>
        </div>

        <div className="ap-toolbar">
          <label className="ap-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => updateFilter(setSearch, event.target.value)}
              placeholder="Search product, color, size or SKU..."
              aria-label="Search inventory"
            />
          </label>

          <label className="ap-filter">
            <span>Category</span>
            <select
              value={category}
              onChange={(event) => updateFilter(setCategory, event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option value={item} key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="ap-filter">
            <span>Product status</span>
            <select
              value={productStatus}
              onChange={(event) =>
                updateFilter(setProductStatus, event.target.value)
              }
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="ready">Ready stock</option>
              <option value="pre-order">Pre-order</option>
            </select>
          </label>

          <label className="ap-filter">
            <span>Inventory status</span>
            <select
              value={inventoryStatus}
              onChange={(event) =>
                updateFilter(setInventoryStatus, event.target.value)
              }
              disabled={!inventoryReady}
            >
              <option value="all">All inventory</option>
              <option value={INVENTORY_STATUS.IN_STOCK}>In stock</option>
              <option value={INVENTORY_STATUS.LOW_STOCK}>Low stock</option>
              <option value={INVENTORY_STATUS.OUT_OF_STOCK}>
                Out of stock
              </option>
            </select>
          </label>

          <label className="ap-filter">
            <span>Sort by</span>
            <select
              value={sort}
              onChange={(event) => updateFilter(setSort, event.target.value)}
            >
              <option value="default">Default order</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="stock-asc" disabled={!inventoryReady}>
                Stock: low to high
              </option>
              <option value="stock-desc" disabled={!inventoryReady}>
                Stock: high to low
              </option>
            </select>
          </label>
        </div>

        {catalog.status === 'loading' || inventory.status === 'loading' ? (
          <div className="ap-state" role="status">
            <span className="ap-loader" />
            <p>Loading product inventory...</p>
          </div>
        ) : catalog.status === 'error' || inventory.status === 'error' ? (
          <div className="ap-state ap-state-error" role="alert">
            <strong>Inventory is not ready.</strong>
            <p>Resolve the error above, then refresh this page.</p>
            <button
              type="button"
              className="ap-secondary-button"
              onClick={reload}
            >
              Try again
            </button>
          </div>
        ) : catalog.products.length === 0 ? (
          <div className="ap-state">
            <span className="ap-empty-icon">▦</span>
            <strong>No products yet</strong>
            <p>Add products to your catalog to start tracking inventory.</p>
            <Link to="/admin/products" className="ap-secondary-button">
              Go to products
            </Link>
          </div>
        ) : pageRows.length === 0 ? (
          <div className="ap-state">
            <span className="ap-empty-icon">▦</span>
            <strong>No products found</strong>
            <p>Try changing your search or filters.</p>
            {filtersActive && (
              <button
                type="button"
                className="ap-secondary-button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <AdminDataTable
              className="ai-desktop-table"
              tableClassName="ai-inventory-table"
              columns={inventoryColumns}
              data={pageRows}
              getRowKey={(row) => row.product.id}
              renderRow={renderInventoryRow}
            />

            <div className="ap-mobile-list">
              {pageRows.map(({ product, records }) => (
                <article className="ap-mobile-product" key={product.id}>
                  <div className="ap-mobile-product-main">
                    <span className="ap-product-thumb">
                      <ProductImage
                        src={getProductImage(product)}
                        alt=""
                        loading="lazy"
                      />
                    </span>
                    <div className="ap-product-name">
                      <strong>{product.name}</strong>
                      <small>{product.category || 'Uncategorized'}</small>
                    </div>
                  </div>

                  <dl className="ai-mobile-facts">
                    <div>
                      <dt>Variants</dt>
                      <dd>{records.length}</dd>
                    </div>
                    <div>
                      <dt>Available units</dt>
                      <dd>{numberFormat.format(getProductStockTotal(records))}</dd>
                    </div>
                    <div>
                      <dt>Inventory status</dt>
                      <dd><ProductInventoryStatus records={records} /></dd>
                    </div>
                  </dl>

                  <div className="ap-mobile-product-actions ai-actions">
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustingProduct(product)}
                    >
                      Adjust stock
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="ap-pagination">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, visibleRows.length)} of{' '}
                {visibleRows.length}
              </span>
              <div>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedProduct && (
        <InventoryDetails
          product={selectedProduct}
          records={recordsByProduct.get(String(selectedProduct.id)) || []}
          onClose={() => setSelectedProduct(null)}
          onAdjust={() => {
            setAdjustingProduct(selectedProduct);
            setSelectedProduct(null);
          }}
        />
      )}

      {adjustingProduct && (
        <StockAdjustmentModal
          product={adjustingProduct}
          records={recordsByProduct.get(String(adjustingProduct.id)) || []}
          user={user}
          onClose={() => setAdjustingProduct(null)}
          onSaved={() => {
            setAdjustingProduct(null);
            setNotice({
              type: 'success',
              message: 'Stock adjustment saved successfully.',
            });
            reload();
          }}
          onError={(message) =>
            setNotice({ type: 'error', message })
          }
        />
      )}
    </section>
  );
}

function SummaryCard({ label, value, note, loading }) {
  return (
    <article className="ap-summary-card">
      <span>{label}</span>
      <strong>
        {loading || value === null || value === undefined
          ? '—'
          : numberFormat.format(Number(value))}
      </strong>
      <small>{loading ? 'Loading...' : note}</small>
    </article>
  );
}

function ProductInventoryStatus({ records }) {
  if (!records.length) {
    return <span className="ai-inventory-pill unknown">No variants</span>;
  }

  const statuses = records.map(getInventoryStatus);

  let status = INVENTORY_STATUS.IN_STOCK;

  if (statuses.every((item) => item === INVENTORY_STATUS.OUT_OF_STOCK)) {
    status = INVENTORY_STATUS.OUT_OF_STOCK;
  } else if (statuses.includes(INVENTORY_STATUS.LOW_STOCK)) {
    status = INVENTORY_STATUS.LOW_STOCK;
  } else if (statuses.includes(INVENTORY_STATUS.UNKNOWN)) {
    status = INVENTORY_STATUS.UNKNOWN;
  }

  return (
    <span className={`ai-inventory-pill ${status}`}>
      {INVENTORY_STATUS_LABELS[status]}
    </span>
  );
}

function ProductStatus({ product }) {
  const active = isProductActive(product);
  const preorder = getProductAvailability(product) === 'pre-order';

  return (
    <div className="ai-product-status">
      <span className={`ap-listing-status ${active ? 'active' : 'inactive'}`}>
        <span />
        {active ? 'Active' : 'Inactive'}
      </span>
      <span className={`ap-status-pill ${preorder ? 'preorder' : 'ready'}`}>
        {preorder ? 'Pre-order' : 'Ready stock'}
      </span>
    </div>
  );
}

function InventoryDetails({ product, records, onClose, onAdjust }) {
  return (
    <AdminModal
      isOpen
      onClose={onClose}
      eyebrow="INVENTORY DETAILS"
      title={product.name}
      subtitle={product.category || 'Uncategorized'}
      size="lg"
      dialogClassName="ai-variant-modal"
      footer={
        <>
          <button type="button" className="ap-secondary-button" onClick={onClose}>
            Close
          </button>
          <button type="button" className="ap-primary-button" onClick={onAdjust}>
            Adjust stock
          </button>
        </>
      }
    >
        <div className="ai-detail-product">
          <ProductImage src={getProductImage(product)} alt={product.name} />
          <div>
            <strong>{numberFormat.format(getProductStockTotal(records))} available units</strong>
            <small>{records.length} color-size variants</small>
          </div>
        </div>

        <div className="ai-variant-table-wrap">
          <table className="ai-variant-table">
            <thead>
              <tr>
                <th>Color</th>
                <th>Size</th>
                <th>On hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Threshold</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {records.length ? records.map((record) => (
                <tr key={`${record.color || ''}-${record.size || ''}`}>
                  <td>{record.color || '—'}</td>
                  <td>{record.size || '—'}</td>
                  <td>{record.onHandQuantity}</td>
                  <td>{record.reservedQuantity}</td>
                  <td><strong>{record.availableQuantity}</strong></td>
                  <td>{record.lowStockThreshold ?? '—'}</td>
                  <td>{formatDate(record.updatedAt)}</td>
                </tr>
              )) : (
                <tr><td colSpan="7">No inventory variants have been created.</td></tr>
              )}
            </tbody>
          </table>
        </div>
    </AdminModal>
  );
}

function StockAdjustmentModal({ product, records, user, onClose, onSaved, onError }) {
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [stock, setStock] = useState('');
  const [threshold, setThreshold] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const colors = Array.isArray(product.colors) ? product.colors : [];
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];

  const selectedRecord = records.find(
    (record) =>
      (record.color || '') === color &&
      (record.size || '') === size,
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedRecord) {
      setStock('');
      setThreshold('');
      return;
    }

    setStock(String(selectedRecord.onHandQuantity));
    setThreshold(
      selectedRecord.lowStockThreshold == null
        ? ''
        : String(selectedRecord.lowStockThreshold),
    );
  }, [selectedRecord]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!color || !size) {
      setError('Select both a color and a size.');
      return;
    }

    if (stock === '' || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
      setError('Enter a valid non-negative whole-number stock quantity.');
      return;
    }

    if (
      threshold !== '' &&
      (!Number.isInteger(Number(threshold)) || Number(threshold) < 0)
    ) {
      setError('Enter a valid non-negative whole-number threshold.');
      return;
    }

    setSaving(true);

    try {
      await adjustInventoryStock(user, {
        productId: product.id,
        color,
        size,
        stock: Number(stock),
        lowStockThreshold: threshold === '' ? null : Number(threshold),
      });

      onSaved();
    } catch (requestError) {
      setError(requestError.message || 'Could not save the stock adjustment.');
      onError(requestError.message || 'Could not save the stock adjustment.');
    } finally {
      setSaving(false);
    }
  }

  const selectedColorSizeExists = Boolean(selectedRecord);

  return (
    <AdminModal
      isOpen
      onClose={onClose}
      eyebrow="INVENTORY MANAGEMENT"
      title="Adjust stock"
      subtitle={product.name}
      size="md"
      dialogClassName="ai-stock-modal"
      isBusy={saving}
      footer={
        <>
          <button
            type="button"
            className="ap-secondary-button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="inventory-stock-form"
            className="ap-primary-button"
            disabled={saving || !colors.length || !sizes.length}
          >
            {saving ? 'Saving...' : 'Save stock'}
          </button>
        </>
      }
    >
        <form
          id="inventory-stock-form"
          className="ap-product-form"
          onSubmit={handleSubmit}
        >
          <label>
            Color *
            <select
              value={color}
              onChange={(event) => setColor(event.target.value)}
              required
            >
              <option value="">Select color</option>
              {colors.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Size *
            <select
              value={size}
              onChange={(event) => setSize(event.target.value)}
              required
            >
              <option value="">Select size</option>
              {sizes.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          {color && size && (
            <div className="ai-current-stock ap-form-full">
              {selectedColorSizeExists ? (
                <>
                  <span>Current inventory</span>
                  <strong>
                    {selectedRecord.onHandQuantity} on hand ·{' '}
                    {selectedRecord.reservedQuantity} reserved ·{' '}
                    {selectedRecord.availableQuantity} available
                  </strong>
                </>
              ) : (
                <span>This color-size variant has no inventory record yet.</span>
              )}
            </div>
          )}

          <label>
            On-hand stock *
            <input
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              required
            />
            <small>
              Enter the final physical stock quantity. Reserved units cannot be
              removed from the on-hand quantity.
            </small>
          </label>

          <label>
            Low-stock threshold
            <input
              type="number"
              min="0"
              step="1"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              placeholder="Optional"
            />
            <small>Available stock at or below this value is marked low.</small>
          </label>

          {error && (
            <p className="ap-form-error ap-form-full" role="alert">
              {error}
            </p>
          )}

        </form>
    </AdminModal>
  );
}
