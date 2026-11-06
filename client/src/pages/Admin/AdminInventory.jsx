import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { fetchAdminProducts } from '../../api/adminProductApi.js';
import {
  fetchInventory,
  fetchInventorySummary,
  getInventoryCapabilities,
  InventoryUnavailableError,
} from '../../api/inventoryApi.js';
import ProductImage from '../../components/ProductImage/ProductImage.jsx';
import {
  filterInventoryRows,
  getInventoryStatus,
  getProductAvailability,
  getProductImage,
  getStockQuantity,
  INVENTORY_STATUS,
  INVENTORY_STATUS_LABELS,
  isProductActive,
  sortInventoryRows,
} from '../../utils/inventory.js';
// The Products screen owns the shared table, toolbar, modal and state styles
// (ap-*). Importing it here keeps them loaded wherever this screen is opened.
import './AdminProducts.css';
import './AdminInventory.css';

const PAGE_SIZE = 8;

const PENDING_HINT = 'Pending backend: the inventory API is not connected yet.';
const ADJUST_HINT =
  'Stock adjustment is not available until the inventory backend is connected.';

// Read once: the API configuration is static for the lifetime of the page.
const capabilities = getInventoryCapabilities();

const numberFormat = new Intl.NumberFormat('en-PH');

const dateFormat = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatUpdated(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? dateFormat.format(time) : null;
}

export default function AdminInventory() {
  const { user } = useAuth();

  const [reloadKey, setReloadKey] = useState(0);

  const [catalog, setCatalog] = useState({
    status: 'loading',
    products: [],
    error: '',
  });

  // status: unavailable (no backend) | loading | ready | error
  const [inventory, setInventory] = useState({
    status: capabilities.list ? 'loading' : 'unavailable',
    records: [],
    error: '',
  });

  const [summary, setSummary] = useState({
    status: capabilities.summary ? 'loading' : 'unavailable',
    data: null,
  });

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [productStatus, setProductStatus] = useState('all');
  const [inventoryStatus, setInventoryStatus] = useState('all');
  const [sort, setSort] = useState('default');
  const [page, setPage] = useState(1);

  const [selectedRow, setSelectedRow] = useState(null);

  // Product catalog (existing admin products API).
  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;

    fetchAdminProducts(user)
      .then((products) => {
        if (!cancelled) setCatalog({ status: 'ready', products, error: '' });
      })
      .catch((error) => {
        if (!cancelled) {
          setCatalog({
            status: 'error',
            products: [],
            error: error.message || 'Could not load products.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  // Inventory records. Skipped entirely while no backend capability exists.
  useEffect(() => {
    if (!capabilities.list || !user) return undefined;

    let cancelled = false;

    fetchInventory(user)
      .then((records) => {
        if (!cancelled) setInventory({ status: 'ready', records, error: '' });
      })
      .catch((error) => {
        if (cancelled) return;

        if (error instanceof InventoryUnavailableError) {
          setInventory({ status: 'unavailable', records: [], error: '' });
        } else {
          setInventory({
            status: 'error',
            records: [],
            error: error.message || 'Could not load inventory.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  // Overview figures.
  useEffect(() => {
    if (!capabilities.summary || !user) return undefined;

    let cancelled = false;

    fetchInventorySummary(user)
      .then((data) => {
        if (!cancelled) setSummary({ status: 'ready', data });
      })
      .catch((error) => {
        if (cancelled) return;

        setSummary({
          status:
            error instanceof InventoryUnavailableError
              ? 'unavailable'
              : 'error',
          data: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  function reload() {
    setCatalog((current) => ({ ...current, status: 'loading', error: '' }));

    if (capabilities.list) {
      setInventory((current) => ({ ...current, status: 'loading', error: '' }));
    }

    if (capabilities.summary) {
      setSummary((current) => ({ ...current, status: 'loading' }));
    }

    setReloadKey((value) => value + 1);
  }

  const catalogStatus = user ? catalog.status : 'error';
  const catalogError = user
    ? catalog.error
    : 'You must be signed in to view inventory.';

  const recordsByProduct = useMemo(
    () =>
      new Map(
        inventory.records.map((record) => [String(record.productId), record]),
      ),
    [inventory.records],
  );

  const rows = useMemo(
    () =>
      catalog.products.map((product) => ({
        product,
        record: recordsByProduct.get(String(product.id)) ?? null,
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

  // Stock-based filtering and sorting only make sense with real stock data.
  const hasStockData = inventory.status === 'ready';

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

  return (
    <section className="admin-products admin-inventory">
      <header className="admin-products-heading">
        <div>
          <p className="eyebrow">STORE MANAGEMENT</p>
          <h1>Inventory</h1>
          <p className="admin-page-description">
            Monitor stock levels and product availability.
          </p>
        </div>

        <Link to="/admin/products" className="ap-secondary-button">
          Manage products
        </Link>
      </header>

      {inventory.status === 'unavailable' && (
        <div className="ap-preview-notice" role="status">
          <span className="ap-notice-icon" aria-hidden="true">
            i
          </span>
          <p>
            <strong>Inventory tracking is not connected yet.</strong> Stock
            quantities, inventory status and last-updated times will appear
            here once the inventory API is available. Product details are
            loaded from the live catalog. The low-stock threshold is pending
            backend configuration.
          </p>
        </div>
      )}

      {inventory.status === 'error' && (
        <div className="ap-preview-notice ai-notice-error" role="alert">
          <span className="ap-notice-icon" aria-hidden="true">
            !
          </span>
          <p>
            <strong>Inventory could not be loaded.</strong> {inventory.error}{' '}
            <button type="button" className="ai-link-button" onClick={reload}>
              Try again
            </button>
          </p>
        </div>
      )}

      <div className="ap-summary-grid">
        <article className="ap-summary-card">
          <span>Total products</span>
          <strong>
            {catalogStatus === 'ready' ? catalog.products.length : '—'}
          </strong>
          <small>Products in the catalog</small>
        </article>

        <SummaryCard
          label="Total stock units"
          summary={summary}
          read={(data) => data.totalStockUnits}
        />

        <SummaryCard
          label="Low stock products"
          summary={summary}
          read={(data) => data.lowStockProducts}
        />

        <SummaryCard
          label="Out of stock products"
          summary={summary}
          read={(data) => data.outOfStockProducts}
        />
      </div>

      <section className="ap-catalog-panel">
        <div className="ap-catalog-header">
          <div>
            <h2>Inventory</h2>
            <p>Search, filter, and review stock for your store products.</p>
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
              placeholder="Search product name or SKU..."
              aria-label="Search inventory by product name or SKU"
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
                <option value={item} key={item}>
                  {item}
                </option>
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
              disabled={!hasStockData}
              title={hasStockData ? undefined : PENDING_HINT}
            >
              <option value="all">
                {hasStockData ? 'All inventory' : 'Pending backend'}
              </option>
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
              <option value="stock-asc" disabled={!hasStockData}>
                Stock: low to high{hasStockData ? '' : ' (pending backend)'}
              </option>
              <option value="stock-desc" disabled={!hasStockData}>
                Stock: high to low{hasStockData ? '' : ' (pending backend)'}
              </option>
              <option value="updated-desc" disabled={!hasStockData}>
                Last updated: newest{hasStockData ? '' : ' (pending backend)'}
              </option>
              <option value="updated-asc" disabled={!hasStockData}>
                Last updated: oldest{hasStockData ? '' : ' (pending backend)'}
              </option>
            </select>
          </label>
        </div>

        {catalogStatus === 'loading' ? (
          <div className="ap-state" role="status">
            <span className="ap-loader" />
            <p>Loading inventory...</p>
          </div>
        ) : catalogStatus === 'error' ? (
          <div className="ap-state ap-state-error" role="alert">
            <strong>Products could not be loaded.</strong>
            <p>{catalogError}</p>
            {user && (
              <button
                type="button"
                className="ap-secondary-button"
                onClick={reload}
              >
                Try again
              </button>
            )}
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
            <div className="ap-table-wrap">
              <table className="ap-product-table ai-inventory-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU / Product ID</th>
                    <th>Category</th>
                    <th>Available stock</th>
                    <th>Product status</th>
                    <th>Inventory status</th>
                    <th>Last updated</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>

                <tbody>
                  {pageRows.map((row) => {
                    const { product, record } = row;

                    return (
                      <tr key={product.id}>
                        <td>
                          <button
                            type="button"
                            className="ap-product-identity"
                            onClick={() => setSelectedRow(row)}
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
                              <small>{product.slug || 'No slug'}</small>
                            </span>
                          </button>
                        </td>

                        <td>
                          <span
                            className="ai-identifier"
                            title={record?.sku || String(product.id)}
                          >
                            {record?.sku || product.id}
                          </span>
                        </td>

                        <td>
                          <span className="ap-category-label">
                            {product.category || 'Uncategorized'}
                          </span>
                        </td>

                        <td>
                          <InventoryField
                            state={inventory.status}
                            record={record}
                            read={(item) => {
                              const stock = getStockQuantity(item);
                              return stock === null ? null : (
                                <strong className="ai-stock">
                                  {numberFormat.format(stock)}
                                </strong>
                              );
                            }}
                          />
                        </td>

                        <td>
                          <ProductStatus product={product} />
                        </td>

                        <td>
                          <InventoryStatusBadge
                            state={inventory.status}
                            record={record}
                          />
                        </td>

                        <td>
                          <InventoryField
                            state={inventory.status}
                            record={record}
                            read={(item) => formatUpdated(item.updatedAt)}
                          />
                        </td>

                        <td>
                          <RowActions onView={() => setSelectedRow(row)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="ap-mobile-list">
              {pageRows.map((row) => {
                const { product, record } = row;

                return (
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
                        <dt>SKU / ID</dt>
                        <dd className="ai-identifier">
                          {record?.sku || product.id}
                        </dd>
                      </div>
                      <div>
                        <dt>Stock</dt>
                        <dd>
                          <InventoryField
                            state={inventory.status}
                            record={record}
                            read={(item) => {
                              const stock = getStockQuantity(item);
                              return stock === null ? null : (
                                <strong className="ai-stock">
                                  {numberFormat.format(stock)}
                                </strong>
                              );
                            }}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Inventory</dt>
                        <dd>
                          <InventoryStatusBadge
                            state={inventory.status}
                            record={record}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Product</dt>
                        <dd>
                          <ProductStatus product={product} />
                        </dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>
                          <InventoryField
                            state={inventory.status}
                            record={record}
                            read={(item) => formatUpdated(item.updatedAt)}
                          />
                        </dd>
                      </div>
                    </dl>

                    <RowActions
                      className="ap-mobile-product-actions"
                      onView={() => setSelectedRow(row)}
                    />
                  </article>
                );
              })}
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

                <span>
                  Page {currentPage} of {totalPages}
                </span>

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

      {selectedRow && (
        <InventoryDetails
          row={selectedRow}
          inventoryState={inventory.status}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </section>
  );
}

// Renders a value that comes from the inventory record, or the honest reason
// it is not shown. `read` returns a node/string, or null if the record has
// no value for that field.
function InventoryField({ state, record, read }) {
  if (state === 'ready') {
    if (!record) return <span className="ai-muted">No record</span>;

    return read(record) ?? <span className="ai-muted">Not provided</span>;
  }

  if (state === 'loading') return <span className="ai-muted">Loading…</span>;
  if (state === 'error') return <span className="ai-muted">Unavailable</span>;

  return (
    <span className="ai-muted" title={PENDING_HINT}>
      Pending backend
    </span>
  );
}

function InventoryStatusBadge({ state, record }) {
  return (
    <InventoryField
      state={state}
      record={record}
      read={(item) => {
        const status = getInventoryStatus(item);

        return (
          <span className={`ai-inventory-pill ${status}`}>
            {INVENTORY_STATUS_LABELS[status]}
          </span>
        );
      }}
    />
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

function RowActions({ onView, className = 'ap-row-actions' }) {
  return (
    <div className={`${className} ai-actions`}>
      <button type="button" onClick={onView}>
        View
      </button>

      <button type="button" disabled title={ADJUST_HINT}>
        Adjust stock
      </button>

      <Link to="/admin/products" className="ai-row-link">
        Manage product
      </Link>
    </div>
  );
}

function SummaryCard({ label, summary, read }) {
  let value = 'Unavailable';
  let note = 'Pending inventory API';

  if (summary.status === 'loading') {
    value = '—';
    note = 'Loading…';
  } else if (summary.status === 'error') {
    note = 'Could not be loaded';
  } else if (summary.status === 'ready') {
    const figure = Number(read(summary.data));

    if (Number.isFinite(figure)) {
      value = numberFormat.format(figure);
      note = 'From the inventory API';
    }
  }

  const known = note === 'From the inventory API';

  return (
    <article className="ap-summary-card">
      <span>{label}</span>
      <strong className={known || value === '—' ? undefined : 'ai-pending-value'}>
        {value}
      </strong>
      <small>{note}</small>
    </article>
  );
}

function InventoryDetails({ row, inventoryState, onClose }) {
  const { product, record } = row;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const active = isProductActive(product);

  return (
    <div
      className="ap-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="ap-modal ap-product-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-detail-title"
      >
        <div className="ap-modal-header">
          <div>
            <p className="eyebrow">INVENTORY DETAILS</p>
            <h2 id="ai-detail-title">{product.name}</h2>
          </div>

          <button
            type="button"
            className="ap-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="ap-detail-body">
          <div className="ap-detail-image">
            <ProductImage src={getProductImage(product)} alt={product.name} />
          </div>

          <div className="ap-detail-information">
            <div>
              <span>Product ID</span>
              <strong className="ai-identifier-wrap">{product.id}</strong>
            </div>

            {record?.sku && (
              <div>
                <span>SKU</span>
                <strong>{record.sku}</strong>
              </div>
            )}

            <div>
              <span>Category</span>
              <strong>{product.category || '—'}</strong>
            </div>

            <div>
              <span>Product status</span>
              <strong>{active ? 'Active' : 'Inactive'}</strong>
            </div>

            <div>
              <span>Availability</span>
              <strong>
                {getProductAvailability(product) === 'pre-order'
                  ? 'Pre-order'
                  : 'Ready stock'}
              </strong>
            </div>

            <div>
              <span>Current stock</span>
              <strong>
                <InventoryField
                  state={inventoryState}
                  record={record}
                  read={(item) => {
                    const stock = getStockQuantity(item);
                    return stock === null ? null : numberFormat.format(stock);
                  }}
                />
              </strong>
            </div>

            <div>
              <span>Inventory status</span>
              <strong>
                <InventoryStatusBadge state={inventoryState} record={record} />
              </strong>
            </div>

            <div>
              <span>Last updated</span>
              <strong>
                <InventoryField
                  state={inventoryState}
                  record={record}
                  read={(item) => formatUpdated(item.updatedAt)}
                />
              </strong>
            </div>
          </div>
        </div>

        <div className="ap-modal-footer ai-detail-footer">
          <small className="ai-footer-hint">{ADJUST_HINT}</small>

          <button type="button" className="ap-secondary-button" onClick={onClose}>
            Close
          </button>

          <Link to="/admin/products" className="ap-secondary-button">
            Manage product
          </Link>

          <button
            type="button"
            className="ap-primary-button"
            disabled
            title={ADJUST_HINT}
          >
            Adjust stock
          </button>
        </div>
      </section>
    </div>
  );
}
