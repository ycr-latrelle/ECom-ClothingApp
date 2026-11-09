
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/useAuth.js";
import {
  fetchAdminProducts,
  fetchAdminProductImages,
  createAdminProduct,
  deleteAdminProduct,
  updateAdminProduct,
  setAdminProductStatus,
  uploadAdminProductImage,
} from "../../api/adminProductApi.js";
import { resolveImageUrl } from "../../utils/imageUrl.js";

import AdminPageHeader from "../../components/Admin/AdminPageHeader.jsx";
import AdminStatCard from "../../components/Admin/AdminStatCard.jsx";
import AdminDataTable from "../../components/Admin/AdminDataTable";
import AdminModal from "../../components/Admin/AdminModal";
import AdminStatusPill from "../../components/Admin/AdminStatusPill.jsx";

import "./AdminProducts.css";

const PAGE_SIZE = 8;
const MAX_IMAGE_COUNT = 10;
const MAX_IMAGE_SIZE = 20_000_000;
const DEFAULT_LOW_STOCK_THRESHOLD = 3;

const formatPeso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const CATEGORY_OPTIONS = [
  { value: "tops", label: "Tops" },
  { value: "bottoms", label: "Bottoms" },
  { value: "footwear", label: "Footwear" },
  { value: "accessories", label: "Accessories" },
];

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getProductImage = (product) =>
  product?.image || product?.imagePath || product?.image_path || "";

const getProductStatus = (product) => product?.status || "ready";

const getActive = (product) =>
  product?.isActive ?? product?.is_active ?? true;

const getMock = (product) =>
  product?.isMock ?? product?.is_mock ?? false;

const parseVariantValues = (value) => [
  ...new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];

const getVariantStockKey = (color, size) =>
  `${color.toLowerCase()}::${size.toUpperCase()}`;

const buildVariantRows = (colors, sizes) =>
  colors.flatMap((color) =>
    sizes.map((size) => ({
      color,
      size,
      key: getVariantStockKey(color, size),
    })),
  );

const emptyForm = {
  name: "",
  slug: "",
  price: "",
  image: "",
  category: "tops",
  status: "ready",
  sizes: "",
  colors: "",
  isActive: true,
};

export default function AdminProducts() {
  const { user } = useAuth();

  const [localProducts, setLocalProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageError, setImageError] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [initialStocks, setInitialStocks] = useState({});

  const refreshProducts = useCallback(async () => {
    if (!user) {
      setLocalProducts([]);
      setCatalogLoading(false);
      setCatalogError("You must be signed in to manage products.");
      return;
    }

    setCatalogLoading(true);
    setCatalogError("");

    try {
      const products = await fetchAdminProducts(user);
      setLocalProducts(products);
    } catch (error) {
      setCatalogError(error.message || "Could not load products.");
    } finally {
      setCatalogLoading(false);
    }
  }, [user]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  useEffect(() => {
    const urls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const categories = useMemo(() => {
    const values = [
      ...new Set(
        localProducts.map((product) => product.category).filter(Boolean),
      ),
    ];
    return values.sort((a, b) => a.localeCompare(b));
  }, [localProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = localProducts.filter((product) => {
      const matchesSearch =
        !query ||
        product.name?.toLowerCase().includes(query) ||
        product.slug?.toLowerCase().includes(query);
      const matchesCategory =
        category === "all" || product.category === category;
      const matchesStatus =
        status === "all" ||
        (status === "active" && getActive(product)) ||
        (status === "inactive" && !getActive(product)) ||
        (status === "ready" && getProductStatus(product) === "ready") ||
        (status === "pre-order" &&
          getProductStatus(product) === "pre-order");
      return matchesSearch && matchesCategory && matchesStatus;
    });

    return result.sort((a, b) => {
      if (sort === "name-asc") return (a.name || "").localeCompare(b.name || "");
      if (sort === "name-desc") return (b.name || "").localeCompare(a.name || "");
      if (sort === "price-asc") return Number(a.price || 0) - Number(b.price || 0);
      if (sort === "price-desc") return Number(b.price || 0) - Number(a.price || 0);
      return 0;
    });
  }, [localProducts, search, category, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const activeCount = localProducts.filter(getActive).length;
  const inactiveCount = localProducts.length - activeCount;
  const preorderCount = localProducts.filter(
    (product) => getProductStatus(product) === "pre-order",
  ).length;

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function resetImages() {
    setImageFiles([]);
    setImageError("");
  }

  function addImageFiles(selectedFiles) {
    const rejected = [];
    const validFiles = [];
    for (const file of selectedFiles) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        rejected.push(`${file.name}: unsupported image format`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        rejected.push(`${file.name}: exceeds 20 MB`);
        continue;
      }
      const isDuplicate = [...imageFiles, ...validFiles].some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified,
      );
      if (isDuplicate) {
        rejected.push(`${file.name}: already selected`);
        continue;
      }
      validFiles.push(file);
    }
    const remainingSlots = MAX_IMAGE_COUNT - imageFiles.length;
    const acceptedFiles = validFiles.slice(0, Math.max(remainingSlots, 0));
    if (validFiles.length > acceptedFiles.length) {
      rejected.push(
        remainingSlots <= 0
          ? `Maximum of ${MAX_IMAGE_COUNT} images reached`
          : `Only ${remainingSlots} more image${
              remainingSlots === 1 ? "" : "s"
            } could be added`,
      );
    }
    if (acceptedFiles.length > 0) {
      setImageFiles((current) => [...current, ...acceptedFiles]);
    }
    setImageError(rejected.join(". "));
  }

  function handleImageSelection(event) {
    addImageFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function makeMainImage(index) {
    setImageFiles((current) => {
      if (index <= 0 || index >= current.length) return current;
      const next = [...current];
      const [picked] = next.splice(index, 1);
      return [picked, ...next];
    });
  }

  function removeImage(index) {
    setImageFiles((current) =>
      current.filter((_, fileIndex) => fileIndex !== index),
    );
    setImageError("");
  }

  function openCreateForm() {
    setEditingProduct(null);
    setForm({ ...emptyForm });
    setInitialStocks({});
    setSlugEdited(false);
    setFormError("");
    setSelectedProduct(null);
    resetImages();
    setFormOpen(true);
  }

  function openEditForm(product) {
    setEditingProduct(product);
    setForm({
      name: product.name || "",
      slug: product.slug || "",
      price: String(product.price ?? ""),
      image: getProductImage(product),
      category: product.category || "tops",
      status: getProductStatus(product),
      sizes: Array.isArray(product.sizes) ? product.sizes.join(", ") : "",
      colors: Array.isArray(product.colors) ? product.colors.join(", ") : "",
      isActive: getActive(product),
    });
    setInitialStocks({});
    setSlugEdited(true);
    setFormError("");
    setSelectedProduct(null);
    resetImages();
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingProduct(null);
    setForm({ ...emptyForm });
    setInitialStocks({});
    setSlugEdited(false);
    setFormError("");
    resetImages();
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target;
    if (name === "slug") setSlugEdited(value !== "");
    setForm((current) => {
      const next = {
        ...current,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "name" && !slugEdited) next.slug = slugify(value);
      return next;
    });
  }

  function handleInitialStockChange(key, value) {
    setInitialStocks((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const formColors = useMemo(() => parseVariantValues(form.colors), [form.colors]);
  const formSizes = useMemo(() => parseVariantValues(form.sizes), [form.sizes]);
  const initialVariantRows = useMemo(
    () => buildVariantRows(formColors, formSizes),
    [formColors, formSizes],
  );
  const newVariantRows = useMemo(() => {
    if (!editingProduct) return initialVariantRows;

    const existingColors = Array.isArray(editingProduct.colors)
      ? editingProduct.colors
      : [];
    const existingSizes = Array.isArray(editingProduct.sizes)
      ? editingProduct.sizes
      : [];
    const existingVariantKeys = new Set(
      buildVariantRows(existingColors, existingSizes).map((variant) => variant.key),
    );

    return initialVariantRows.filter(
      (variant) => !existingVariantKeys.has(variant.key),
    );
  }, [editingProduct, initialVariantRows]);

  async function handleSave(event) {
    event.preventDefault();
    if (saving) return;
    setFormError("");
    setImageError("");
    const name = form.name.trim();
    const slug = form.slug.trim();
    if (!name || !slug || form.price === "") {
      setFormError("Product name, slug, and price are required.");
      return;
    }
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
      setFormError("Enter a valid product price.");
      return;
    }
    const normalizedSlug = slugify(slug);
    if (!normalizedSlug) {
      setFormError("Slug can only contain letters, numbers, and hyphens.");
      return;
    }
    if (normalizedSlug.length > 140) {
      setFormError("The product slug cannot exceed 140 characters.");
      return;
    }
    if (name.length > 120) {
      setFormError("The product name cannot exceed 120 characters.");
      return;
    }
    const colors = parseVariantValues(form.colors);
    const sizes = parseVariantValues(form.sizes);
    if (!editingProduct && (colors.length === 0 || sizes.length === 0)) {
      setFormError("Enter at least one color and one size before creating a product.");
      return;
    }
    if (initialVariantRows.length > 100) {
      setFormError("A product cannot have more than 100 color-size combinations.");
      return;
    }
    if (newVariantRows.length > 0) {
      const missingStock = newVariantRows.find(
        (variant) =>
          initialStocks[variant.key] === undefined ||
          String(initialStocks[variant.key]).trim() === "",
      );
      if (missingStock) {
        setFormError(
          `Enter the initial stock quantity for ${missingStock.color} / ${missingStock.size}. Use 0 if there is no stock.`,
        );
        return;
      }
      const invalidStock = newVariantRows.find((variant) => {
        const value = Number(initialStocks[variant.key]);
        return !Number.isInteger(value) || value < 0 || value > 2_147_483_647;
      });
      if (invalidStock) {
        setFormError(
          `Stock for ${invalidStock.color} / ${invalidStock.size} must be a whole number greater than or equal to zero.`,
        );
        return;
      }
    }
    const duplicateSlug = localProducts.some(
      (product) =>
        product.slug === normalizedSlug && product.id !== editingProduct?.id,
    );
    if (duplicateSlug) {
      setFormError("A product with this slug already exists.");
      return;
    }
    if (imageFiles.length > MAX_IMAGE_COUNT) {
      setImageError(`Maximum of ${MAX_IMAGE_COUNT} images allowed.`);
      return;
    }
    const productData = {
      name,
      slug: normalizedSlug,
      price: Number(form.price),
      category: form.category,
      status: form.status,
      sizes,
      colors,
      isActive: form.isActive,
      isMock: getMock(editingProduct),
      ...((!editingProduct || newVariantRows.length > 0) && {
        initialStocks: newVariantRows.map((variant) => ({
          color: variant.color,
          size: variant.size,
          stock: Number(initialStocks[variant.key]),
          lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
        })),
      }),
    };
    setSaving(true);
    let savedProduct = null;
    let uploadedCount = 0;
    try {
      if (editingProduct) {
        savedProduct = await updateAdminProduct(user, editingProduct.id, productData);
      } else {
        savedProduct = await createAdminProduct(user, productData);
      }
      const productId = savedProduct?.id ?? savedProduct?.productId;
      if (!productId) throw new Error("Product API failed to return ID.");
      for (const file of imageFiles) {
        await uploadAdminProductImage(user, productId, file);
        uploadedCount += 1;
      }
      await refreshProducts();
      setNotice(
        editingProduct
          ? newVariantRows.length > 0
            ? `Product "${name}" updated with ${newVariantRows.length} new inventory variant(s).`
            : `Product "${name}" updated successfully.`
          : `Product "${name}" created successfully with ${initialVariantRows.length} inventory variant(s).`,
      );
      setFormOpen(false);
      setEditingProduct(null);
      setForm({ ...emptyForm });
      setInitialStocks({});
      setSlugEdited(false);
      resetImages();
      setPage(1);
    } catch (error) {
      await refreshProducts();
      if (savedProduct && imageFiles.length > uploadedCount) {
        setFormError(`Product saved, but image upload failed. ${error.message}`);
      } else {
        setFormError(error.message || "Could not save the product.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product) {
    try {
      await setAdminProductStatus(user, product.id, !getActive(product));
      await refreshProducts();
      setNotice(`"${product.name}" is now ${getActive(product) ? "inactive" : "active"}.`);
    } catch (error) {
      setNotice(error.message || "Could not update product status.");
    }
  }

  function requestProductDelete(product) {
    setSelectedProduct(null);
    setDeleteError("");
    setProductToDelete(product);
  }

  async function confirmProductDelete() {
    if (!productToDelete || deletingProduct) return;

    setDeletingProduct(true);
    setDeleteError("");

    try {
      const result = await deleteAdminProduct(user, productToDelete.id);
      setProductToDelete(null);
      setSelectedProduct(null);
      await refreshProducts();
      setPage(1);
      setNotice(
        result?.telegramCleanupPending
          ? `“${productToDelete.name}” was deleted. Some associated image files still need cleanup.`
          : `“${productToDelete.name}” was permanently deleted.`,
      );
    } catch (error) {
      setDeleteError(error.message || "Could not delete the product.");
    } finally {
      setDeletingProduct(false);
    }
  }

  function clearNotice() {
    setNotice("");
  }

  const tableColumns = [
    { label: 'Product', className: 'col-product' },
    { label: 'Category', className: 'col-category' },
    { label: 'Price', className: 'col-price' },
    { label: 'Availability', className: 'col-availability' },
    { label: 'Listing', className: 'col-listing' },
    { label: 'Actions', className: 'col-actions' },
  ];

  const renderProductRow = (product) => (
    <>
      <td>
        <div className="ap-product-identity">
          <span className="ap-product-thumb">
            {getProductImage(product) ? (
              <img src={resolveImageUrl(getProductImage(product))} alt="" loading="lazy" />
            ) : (
              <span>◇</span>
            )}
          </span>
          <div className="ap-product-name">
            <strong>{product.name}</strong>
            <small>{product.slug || "No slug"}</small>
          </div>
        </div>
      </td>
      <td><span className="ap-category-label">{product.category || "Uncategorized"}</span></td>
      <td className="ap-price">{formatPeso(product.price)}</td>
      <td>
        <AdminStatusPill status={getProductStatus(product) === "pre-order" ? "Processing" : "Verified"} />
      </td>
      <td>
        <span className={`ap-listing-status ${getActive(product) ? "active" : "inactive"}`}>
          <span />
          {getActive(product) ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        <div className="ap-row-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setSelectedProduct(product)}>View</button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => openEditForm(product)}>Edit</button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => toggleActive(product)}>
            {getActive(product) ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            className="ap-row-delete"
            onClick={() => requestProductDelete(product)}
            aria-label={`Permanently delete ${product.name}`}
          >
            Delete
          </button>
        </div>
      </td>
    </>
  );

  return (
    <section className="admin-products">
      <AdminPageHeader
        eyebrow="STORE MANAGEMENT"
        title="Products"
        description="Manage your product catalog, availability, and listings."
        action={
          <button className="admin-btn admin-btn-primary" onClick={openCreateForm}>
            <span>＋</span> Add product
          </button>
        }
      />

      {notice && (
        <div className="admin-action-notice" role="status">
          <span className="admin-action-notice-text">{notice}</span>
          <button className="admin-btn admin-btn-ghost" onClick={clearNotice} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="ap-summary-grid">
        <AdminStatCard label="Total products" value={catalogLoading ? "—" : localProducts.length} description="Products in the database" />
        <AdminStatCard label="Active listings" value={catalogLoading ? "—" : activeCount} description="Currently marked as active" />
        <AdminStatCard label="Inactive listings" value={catalogLoading ? "—" : inactiveCount} description="Currently marked as inactive" />
        <AdminStatCard label="Pre-order products" value={catalogLoading ? "—" : preorderCount} description="Products marked for pre-order" />
      </div>

      <section className="ap-catalog-panel">
        <div className="ap-catalog-header">
          <div className="admin-catalog-title-group">
            <h2 className="admin-catalog-title">Product catalog</h2>
            <p className="admin-catalog-description">Search, filter, and review your store products.</p>
          </div>
          <span className="ap-result-count">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "product" : "products"}
          </span>
        </div>

        <div className="ap-toolbar">
          <div className="ap-search">
            <span className="admin-search-icon">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => updateFilter(setSearch, event.target.value)}
              placeholder="Search product name or slug..."
              aria-label="Search products"
            />
          </div>
          <div className="admin-filter-group">
            <label className="ap-filter">
              <span>Category</span>
              <select value={category} onChange={(event) => updateFilter(setCategory, event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            </label>
            <label className="ap-filter">
              <span>Status</span>
              <select value={status} onChange={(event) => updateFilter(setStatus, event.target.value)}>{['all', 'active', 'inactive', 'ready', 'pre-order'].map(s => <option key={s} value={s}>{s}</option>)}</select>
            </label>
            <label className="ap-filter">
              <span>Sort by</span>
              <select value={sort} onChange={(event) => updateFilter(setSort, event.target.value)}>{['newest', 'name-asc', 'name-desc', 'price-asc', 'price-desc'].map(s => <option key={s} value={s}>{s}</option>)}</select>
            </label>
          </div>
        </div>

        <AdminDataTable
          className="ap-product-table"
          columns={tableColumns}
          data={paginatedProducts}
          renderRow={renderProductRow}
          loadingState={catalogLoading ? "Loading products..." : null}
          errorState={catalogError || null}
          emptyState={
            <div className="ap-state">
              <span className="ap-empty-icon">◇</span>
              <strong>No products found</strong>
              <p>Try changing your search or filters.</p>
              <button className="admin-btn admin-btn-secondary" onClick={() => { setSearch(""); setCategory("all"); setStatus("all"); setSort("newest"); setPage(1); }}>Clear filters</button>
            </div>
          }
        />

        <div className="ap-pagination">
          <span className="admin-pagination-info">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} of {filteredProducts.length}
          </span>
          <div>
            <button className="admin-btn admin-btn-ghost" disabled={currentPage === 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>Previous</button>
            <span className="admin-pagination-current">Page {currentPage} of {totalPages}</span>
            <button className="admin-btn admin-btn-ghost" disabled={currentPage === totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>Next</button>
          </div>
        </div>
      </section>

      {selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={() => openEditForm(selectedProduct)}
          onDelete={() => requestProductDelete(selectedProduct)}
          user={user}
        />
      )}

      {productToDelete && (
        <AdminModal
          isOpen
          onClose={() => setProductToDelete(null)}
          eyebrow="PERMANENT ACTION"
          title="Delete product?"
          subtitle="This action cannot be undone."
          size="sm"
          dialogClassName="ap-delete-modal"
          isBusy={deletingProduct}
          footer={
            <>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setProductToDelete(null)}
                disabled={deletingProduct}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn ap-confirm-delete"
                onClick={confirmProductDelete}
                disabled={deletingProduct}
              >
                {deletingProduct ? "Deleting…" : "Permanently delete"}
              </button>
            </>
          }
        >
          <div className="ap-delete-confirmation">
            <p>
              Permanently delete <strong>{productToDelete.name}</strong>,
              its inventory, and its associated product images?
            </p>
            <p>
              Products referenced by existing records, such as order history,
              cannot be deleted.
            </p>
            {deleteError && (
              <p className="ap-delete-error" role="alert">{deleteError}</p>
            )}
          </div>
        </AdminModal>
      )}

      <ProductForm
        key={formOpen ? "open" : "closed"}
        open={formOpen}
        editing={editingProduct}
        form={form}
        error={formError}
        imageFiles={imageFiles}
        imagePreviews={imagePreviews}
        imageError={imageError}
        onImageSelection={handleImageSelection}
        onRemoveImage={removeImage}
        onChange={handleFormChange}
        onClose={closeForm}
        onSubmit={handleSave}
        onAddFiles={addImageFiles}
        onMakeMain={makeMainImage}
        saving={saving}
        slugEdited={slugEdited}
        newVariantRows={newVariantRows}
        initialStocks={initialStocks}
        onInitialStockChange={handleInitialStockChange}
      />
    </section>
  );
}

function ProductDetails({ product, onClose, onEdit, onDelete, user }) {
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadImages() {
      setImagesLoading(true);
      try {
        const result = await fetchAdminProductImages(user, product.id);
        if (!cancelled) setImages([...result].sort((a, b) => a.displayOrder - b.displayOrder));
      } catch {
        if (!cancelled) setImages([]);
      } finally {
        if (!cancelled) setImagesLoading(false);
      }
    }
    loadImages();
    return () => { cancelled = true; };
  }, [user, product.id]);

  const primaryImage = images.find((image) => image.isPrimary) || images[0];
  const imageUrl = primaryImage?.url ? resolveImageUrl(primaryImage.url) : resolveImageUrl(getProductImage(product));

  return (
    <AdminModal
      isOpen={true}
      onClose={onClose}
      title={product.name}
      subtitle="Product Details"
      size="md"
      footer={
        <>
          <button
            type="button"
            className="admin-btn ap-detail-delete"
            onClick={onDelete}
          >
            Delete product
          </button>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Close</button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={onEdit}>Edit product</button>
        </>
      }
    >
      <div className="ap-detail-body">
        <div className="ap-detail-image">
          {imagesLoading ? (
            <span className="admin-loading-text">Loading images...</span>
          ) : imageUrl ? (
            <img src={imageUrl} alt={product.name} />
          ) : (
            <span className="admin-loading-text">No product image</span>
          )}
        </div>
        <div className="ap-detail-information">
          <div>
            <span>Price</span>
            <strong>{formatPeso(product.price)}</strong>
          </div>
          <div>
            <span>Slug</span>
            <strong>{product.slug || "—"}</strong>
          </div>
          <div>
            <span>Category</span>
            <strong>{product.category || "—"}</strong>
          </div>
          <div>
            <span>Availability</span>
            <strong>{getProductStatus(product)}</strong>
          </div>
          <div>
            <span>Colors</span>
            <strong>{Array.isArray(product.colors) && product.colors.length ? product.colors.join(", ") : "Not specified"}</strong>
          </div>
          <div>
            <span>Sizes</span>
            <strong>{Array.isArray(product.sizes) && product.sizes.length ? product.sizes.join(", ") : "Not specified"}</strong>
          </div>
          <div>
            <span>Listing status</span>
            <strong>{getActive(product) ? "Active" : "Inactive"}</strong>
          </div>
          <div>
            <span>Product images</span>
            <strong>{imagesLoading ? "Loading..." : images.length}</strong>
          </div>
        </div>
      </div>
    </AdminModal>
  );
}

function ProductForm({
  open,
  editing,
  form,
  error,
  imageFiles,
  imagePreviews,
  imageError,
  onImageSelection,
  onRemoveImage,
  onChange,
  onClose,
  onSubmit,
  onAddFiles,
  onMakeMain,
  saving,
  slugEdited,
  newVariantRows,
  initialStocks,
  onInitialStockChange,
}) {
  const [dragging, setDragging] = useState(false);
  const [stockForAll, setStockForAll] = useState("");

  if (!open) return null;

  const categoryOptions = CATEGORY_OPTIONS.some((option) => option.value === form.category)
    ? CATEGORY_OPTIONS
    : [...CATEGORY_OPTIONS, { value: form.category, label: form.category }];

  return (
    <AdminModal
      isOpen={open}
      onClose={onClose}
      title={editing ? "Edit product" : "Add product"}
      subtitle={editing ? "Update the listing details and product photos." : "Add the product details, variants, current stock, and photos."}
      size="lg"
      isBusy={saving}
      footer={
        <>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="admin-product-form" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add product"}
          </button>
        </>
      }
    >
      <form id="admin-product-form" className="ap-product-form" onSubmit={onSubmit}>
        <section className="ap-form-section">
          <header className="ap-form-section-header">
            <span>01</span>
            <div>
              <h3>Product details</h3>
              <p>Set the name, price, category, and store availability.</p>
            </div>
          </header>
          <div className="admin-form-grid">
          <div className="admin-form-group">
            <label htmlFor="product-name">Product name *</label>
            <input id="product-name" name="name" value={form.name} onChange={onChange} required autoFocus maxLength={120} />
          </div>
          <div className="admin-form-group">
            <label htmlFor="product-slug">Product slug *</label>
            <input id="product-slug" name="slug" value={form.slug} onChange={onChange} required maxLength={140} />
            <small className="admin-form-hint">{slugEdited ? "Lowercase letters, numbers, and hyphens." : "Created from the name. Edit it to customize."}</small>
          </div>
          <div className="admin-form-group">
            <label htmlFor="product-price">Price (PHP) *</label>
            <input id="product-price" name="price" type="number" min="0" step="0.01" value={form.price} onChange={onChange} required />
          </div>
          <div className="admin-form-group">
            <label htmlFor="product-category">Category</label>
            <select id="product-category" name="category" value={form.category} onChange={onChange}>
              {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="admin-form-group">
            <label htmlFor="product-status">Availability</label>
            <select id="product-status" name="status" value={form.status} onChange={onChange}>
              <option value="ready">Ready stock</option>
              <option value="pre-order">Pre-order</option>
            </select>
          </div>
          <label className="ap-listing-toggle">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
            <span className="ap-listing-toggle-copy">
              <strong>Active listing</strong>
              <small>Make this product visible in your store.</small>
            </span>
          </label>
          </div>
        </section>

        <section className="ap-form-section">
          <header className="ap-form-section-header">
            <span>02</span>
            <div>
              <h3>{editing ? "Product variants" : "Variants & inventory"}</h3>
              <p>
                {editing
                  ? "Add colors or sizes to create new variants. Existing options and their stock must be kept."
                  : "Define colors and sizes, then enter your on-hand stock."}
              </p>
            </div>
          </header>
          <div className="ap-variant-fields">
            <div className="admin-form-group">
              <label htmlFor="product-colors">Colors</label>
              <input
                id="product-colors"
                name="colors"
                value={form.colors}
                onChange={(event) => {
                  setStockForAll("");
                  onChange(event);
                }}
                placeholder="Black, White, Navy Blue"
                disabled={saving}
              />
              <small className="admin-form-hint">
                {editing
                  ? "Keep every existing color; you can add more."
                  : "Separate colors with commas."}
              </small>
            </div>
            <div className="admin-form-group">
              <label htmlFor="product-sizes">Sizes</label>
              <input
                id="product-sizes"
                name="sizes"
                value={form.sizes}
                onChange={(event) => {
                  setStockForAll("");
                  onChange(event);
                }}
                placeholder="S, M, L, XL"
                disabled={saving}
              />
              <small className="admin-form-hint">
                {editing
                  ? "Keep every existing size; you can add more."
                  : "Separate sizes with commas."}
              </small>
            </div>
          </div>

        {(!editing || newVariantRows.length > 0) && (
          <section className="ap-initial-stock-section">
            <div className="ap-initial-stock-heading">
              <div>
                <span className="ap-form-section-kicker">INVENTORY</span>
                <strong>{editing ? "Stock for new variants" : "Current stock on hand"}</strong>
                <p>
                  {editing
                    ? "Set the starting quantity for each newly added color-size combination. Existing inventory will not change."
                    : "Enter the quantity you physically have for each color and size."}
                </p>
              </div>
              {newVariantRows.length > 0 && (
                <span className="ap-stock-variant-count">
                  {newVariantRows.length} {newVariantRows.length === 1 ? "new variant" : "new variants"}
                </span>
              )}
            </div>
            {newVariantRows.length > 0 ? (
              <>
                <label className="ap-stock-bulk-field">
                  <span>Set the same quantity for all variants</span>
                  <span className="ap-stock-bulk-control">
                    <input
                      type="number"
                      min="0"
                      max="2147483647"
                      step="1"
                      inputMode="numeric"
                      placeholder="Quantity"
                      value={stockForAll}
                      onChange={(event) => {
                        const value = event.target.value;
                        setStockForAll(value);
                        if (value !== "" && Number.isInteger(Number(value)) &&
                            Number(value) >= 0 && Number(value) <= 2_147_483_647) {
                          newVariantRows.forEach((variant) =>
                            onInitialStockChange(variant.key, value),
                          );
                        }
                      }}
                      disabled={saving}
                    />
                    <span>units per variant</span>
                  </span>
                </label>
                <div className="ap-initial-stock-table-wrap">
                  <table className="ap-initial-stock-table">
                    <thead>
                      <tr>
                        <th>Color</th>
                        <th>Size</th>
                        <th>Quantity on hand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newVariantRows.map((variant) => (
                        <tr key={variant.key}>
                          <td>{variant.color}</td>
                          <td>{variant.size}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="2147483647"
                              step="1"
                              inputMode="numeric"
                              placeholder="Enter quantity"
                              value={initialStocks[variant.key] ?? ""}
                              onChange={(event) => {
                                setStockForAll("");
                                onInitialStockChange(variant.key, event.target.value);
                              }}
                              disabled={saving}
                              aria-label={`Current stock for ${variant.color}, size ${variant.size}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="ap-stock-empty">
                Add at least one color and size above to enter inventory quantities.
              </div>
            )}
          </section>
        )}
        </section>

        <section className="ap-form-section">
          <header className="ap-form-section-header">
            <span>03</span>
            <div>
              <h3>Product photos</h3>
              <p>Add clear photos to help customers see your product.</p>
            </div>
          </header>
          <div className="ap-image-upload-section">
            <div className="ap-image-upload-heading">
            <div className="admin-image-upload-title-group">
              <strong>Product images</strong>
              <p>Select multiple photos for different product angles and details. Newly selected images will be uploaded when you save.</p>
            </div>
            <span>{imageFiles.length}/{MAX_IMAGE_COUNT} selected</span>
            </div>
            <label
              className={`ap-image-upload-area ${dragging ? " is-dragging" : ""}${imageFiles.length >= MAX_IMAGE_COUNT ? " is-disabled" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setDragging(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                onAddFiles(Array.from(event.dataTransfer.files || []));
              }}
            >
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={onImageSelection} disabled={saving || imageFiles.length >= MAX_IMAGE_COUNT} />
              <span className="ap-image-upload-icon">＋</span>
              <strong>Drop images here or click to browse</strong>
              <small>PNG, JPG, WEBP, or GIF, up to 20 MB each</small>
            </label>
            {imageError && <p className="ap-image-upload-error" role="alert">{imageError}</p>}
            {imagePreviews.length > 0 && (
              <div className="ap-image-preview-grid">
                {imagePreviews.map((preview, index) => (
                  <div className="ap-uploaded-image" key={`${imageFiles[index]?.name || "image"}-${index}`}>
                    <img src={preview} alt={`Product preview ${index + 1}`} />
                    {index === 0 ? <span className="ap-main-image-label">First upload</span> : <button type="button" className="ap-make-main" onClick={() => onMakeMain(index)} disabled={saving}>Move first</button>}
                    <button type="button" className="ap-remove-image" onClick={() => onRemoveImage(index)} disabled={saving} aria-label={`Remove image ${index + 1}`}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {error && <p className="ap-form-error" role="alert">{error}</p>}
      </form>
    </AdminModal>
  );
}
