
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/useAuth.js";
import {
  fetchAdminProducts,
  fetchAdminProductImages,
  createAdminProduct,
  updateAdminProduct,
  setAdminProductStatus,
  uploadAdminProductImage,
} from "../../api/adminProductApi.js";
import { resolveImageUrl } from "../../utils/imageUrl.js";
import "./AdminProducts.css";

const PAGE_SIZE = 8;
const MAX_IMAGE_COUNT = 10;
const MAX_IMAGE_SIZE = 20_000_000;

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

const emptyForm = {
  name: "",
  slug: "",
  price: "",
  image: "",
  category: "tops",
  status: "ready",
  sizes: "",
  isActive: true,
  isMock: false,
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

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  // Create temporary preview URLs for newly selected images.
  useEffect(() => {
    const urls = imageFiles.map((file) => URL.createObjectURL(file));

    setImagePreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

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
      if (sort === "name-asc") {
        return (a.name || "").localeCompare(b.name || "");
      }

      if (sort === "name-desc") {
        return (b.name || "").localeCompare(a.name || "");
      }

      if (sort === "price-asc") {
        return Number(a.price || 0) - Number(b.price || 0);
      }

      if (sort === "price-desc") {
        return Number(b.price || 0) - Number(a.price || 0);
      }

      return 0;
    });
  }, [localProducts, search, category, status, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );

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
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];

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
      isActive: getActive(product),
      isMock: getMock(product),
    });

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
    setSlugEdited(false);
    setFormError("");
    resetImages();
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target;

    if (name === "slug") {
      setSlugEdited(value !== "");
    }

    setForm((current) => {
      const next = {
        ...current,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "name" && !slugEdited) {
        next.slug = slugify(value);
      }

      return next;
    });
  }

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

    const duplicateSlug = localProducts.some(
      (product) =>
        product.slug === normalizedSlug &&
        product.id !== editingProduct?.id,
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
      sizes: form.sizes
        .split(",")
        .map((size) => size.trim())
        .filter(Boolean),
      isActive: form.isActive,
      isMock: form.isMock,
    };

    setSaving(true);

    let savedProduct = null;
    let uploadedCount = 0;

    try {
      if (editingProduct) {
        savedProduct = await updateAdminProduct(
          user,
          editingProduct.id,
          productData,
        );
      } else {
        savedProduct = await createAdminProduct(user, productData);
      }

      // Upload each image individually. The backend stores the files
      // in the private Telegram product-images channel.
      for (const file of imageFiles) {
        await uploadAdminProductImage(user, savedProduct.id, file);
        uploadedCount += 1;
      }

      await refreshProducts();

      setNotice(
        editingProduct
          ? `Product "${name}" updated successfully.`
          : `Product "${name}" created successfully.`,
      );

      setFormOpen(false);
      setEditingProduct(null);
      setForm({ ...emptyForm });
      setSlugEdited(false);
      resetImages();
      setPage(1);
    } catch (error) {
      // The product may already have been saved if an image upload failed.
      // Refresh the catalog so the UI reflects the actual server state.
      await refreshProducts();

      if (savedProduct && imageFiles.length > uploadedCount) {
        setFormError(
          `The product was saved, but an image upload failed after ${uploadedCount} successful upload(s). ${error.message} You can edit the product and upload the remaining images.`,
        );
      } else {
        setFormError(error.message || "Could not save the product.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product) {
    try {
      await setAdminProductStatus(
        user,
        product.id,
        !getActive(product),
      );

      await refreshProducts();

      setNotice(
        `"${product.name}" is now ${
          getActive(product) ? "inactive" : "active"
        }.`,
      );
    } catch (error) {
      setNotice(error.message || "Could not update product status.");
    }
  }

  function clearNotice() {
    setNotice("");
  }

  return (
    <section className="admin-products">
      <header className="admin-products-heading">
        <div>
          <p className="eyebrow">STORE MANAGEMENT</p>
          <h1>Products</h1>
          <p className="admin-page-description">
            Manage your product catalog, availability, and listings.
          </p>
        </div>

        <button
          type="button"
          className="ap-primary-button"
          onClick={openCreateForm}
        >
          <span aria-hidden="true">＋</span>
          Add product
        </button>
      </header>

      {notice && (
        <div className="ap-action-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={clearNotice} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <div className="ap-summary-grid">
        <article className="ap-summary-card">
          <span>Total products</span>
          <strong>{catalogLoading ? "—" : localProducts.length}</strong>
          <small>Products in the database</small>
        </article>

        <article className="ap-summary-card">
          <span>Active listings</span>
          <strong>{catalogLoading ? "—" : activeCount}</strong>
          <small>Currently marked as active</small>
        </article>

        <article className="ap-summary-card">
          <span>Inactive listings</span>
          <strong>{catalogLoading ? "—" : inactiveCount}</strong>
          <small>Currently marked as inactive</small>
        </article>

        <article className="ap-summary-card">
          <span>Pre-order products</span>
          <strong>{catalogLoading ? "—" : preorderCount}</strong>
          <small>Products marked for pre-order</small>
        </article>
      </div>

      <section className="ap-catalog-panel">
        <div className="ap-catalog-header">
          <div>
            <h2>Product catalog</h2>
            <p>Search, filter, and review your store products.</p>
          </div>

          <span className="ap-result-count">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "product" : "products"}
          </span>
        </div>

        <div className="ap-toolbar">
          <label className="ap-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => updateFilter(setSearch, event.target.value)}
              placeholder="Search product name or slug..."
              aria-label="Search products"
            />
          </label>

          <label className="ap-filter">
            <span>Category</span>
            <select
              value={category}
              onChange={(event) =>
                updateFilter(setCategory, event.target.value)
              }
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
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => updateFilter(setStatus, event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="ready">Ready stock</option>
              <option value="pre-order">Pre-order</option>
            </select>
          </label>

          <label className="ap-filter">
            <span>Sort by</span>
            <select
              value={sort}
              onChange={(event) => updateFilter(setSort, event.target.value)}
            >
              <option value="newest">Default order</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>

        {catalogLoading ? (
          <div className="ap-state">
            <span className="ap-loader" />
            <p>Loading products...</p>
          </div>
        ) : catalogError ? (
          <div className="ap-state ap-state-error" role="alert">
            <strong>Products could not be loaded.</strong>
            <p>{catalogError}</p>
            <button
              type="button"
              className="ap-secondary-button"
              onClick={refreshProducts}
            >
              Try again
            </button>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="ap-state">
            <span className="ap-empty-icon">◇</span>
            <strong>No products found</strong>
            <p>Try changing your search or filters.</p>
            <button
              type="button"
              className="ap-secondary-button"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setStatus("all");
                setSort("newest");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="ap-table-wrap">
              <table className="ap-product-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Availability</th>
                    <th>Listing</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>

                <tbody>
                  {paginatedProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <button
                          type="button"
                          className="ap-product-identity"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <span className="ap-product-thumb">
                            {getProductImage(product) ? (
                              <img
                                src={resolveImageUrl(getProductImage(product))}
                                alt=""
                                loading="lazy"
                              />
                            ) : (
                              <span>◇</span>
                            )}
                          </span>

                          <span className="ap-product-name">
                            <strong>{product.name}</strong>
                            <small>{product.slug || "No slug"}</small>
                          </span>
                        </button>
                      </td>

                      <td>
                        <span className="ap-category-label">
                          {product.category || "Uncategorized"}
                        </span>
                      </td>

                      <td className="ap-price">{formatPeso(product.price)}</td>

                      <td>
                        <span
                          className={`ap-status-pill ${
                            getProductStatus(product) === "pre-order"
                              ? "preorder"
                              : "ready"
                          }`}
                        >
                          {getProductStatus(product) === "pre-order"
                            ? "Pre-order"
                            : "Ready stock"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`ap-listing-status ${
                            getActive(product) ? "active" : "inactive"
                          }`}
                        >
                          <span />
                          {getActive(product) ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <div className="ap-row-actions">
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(product)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditForm(product)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(product)}
                          >
                            {getActive(product) ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ap-mobile-list">
              {paginatedProducts.map((product) => (
                <article className="ap-mobile-product" key={product.id}>
                  <div className="ap-mobile-product-main">
                    <span className="ap-product-thumb">
                      {getProductImage(product) ? (
                        <img
                          src={resolveImageUrl(getProductImage(product))}
                          alt=""
                        />
                      ) : (
                        <span>◇</span>
                      )}
                    </span>

                    <div className="ap-product-name">
                      <strong>{product.name}</strong>
                      <small>{product.category || "Uncategorized"}</small>
                      <b>{formatPeso(product.price)}</b>
                    </div>
                  </div>

                  <div className="ap-mobile-product-actions">
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                    >
                      View
                    </button>
                    <button type="button" onClick={() => openEditForm(product)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => toggleActive(product)}>
                      {getActive(product) ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="ap-pagination">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} of{" "}
                {filteredProducts.length}
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

      {selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={() => openEditForm(selectedProduct)}
          user={user}
        />
      )}

      <ProductForm
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
      />
    </section>
  );
}

function ProductDetails({ product, onClose, onEdit, user }) {
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
      setImagesLoading(true);

      try {
        const result = await fetchAdminProductImages(user, product.id);

        if (!cancelled) {
          setImages(
            [...result].sort(
              (a, b) => a.displayOrder - b.displayOrder,
            ),
          );
        }
      } catch {
        if (!cancelled) setImages([]);
      } finally {
        if (!cancelled) setImagesLoading(false);
      }
    }

    loadImages();

    return () => {
      cancelled = true;
    };
  }, [user, product.id]);

  const primaryImage =
    images.find((image) => image.isPrimary) ||
    images[0];

  const imageUrl = primaryImage?.url
    ? resolveImageUrl(primaryImage.url)
    : resolveImageUrl(getProductImage(product));

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
        aria-labelledby="ap-detail-title"
      >
        <div className="ap-modal-header">
          <div>
            <p className="eyebrow">PRODUCT DETAILS</p>
            <h2 id="ap-detail-title">{product.name}</h2>
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
            {imagesLoading ? (
              <span>Loading images...</span>
            ) : imageUrl ? (
              <img src={imageUrl} alt={product.name} />
            ) : (
              <span>No product image</span>
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
              <span>Sizes</span>
              <strong>
                {Array.isArray(product.sizes) && product.sizes.length
                  ? product.sizes.join(", ")
                  : "Not specified"}
              </strong>
            </div>
            <div>
              <span>Listing status</span>
              <strong>{getActive(product) ? "Active" : "Inactive"}</strong>
            </div>
            <div>
              <span>Mock product</span>
              <strong>{getMock(product) ? "Yes" : "No"}</strong>
            </div>
            <div>
              <span>Product images</span>
              <strong>
                {imagesLoading ? "Loading..." : images.length}
              </strong>
            </div>
          </div>
        </div>

        <div className="ap-modal-footer">
          <button
            type="button"
            className="ap-secondary-button"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="ap-primary-button"
            onClick={onEdit}
          >
            Edit product
          </button>
        </div>
      </section>
    </div>
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
}) {
  const [dragging, setDragging] = useState(false);
  const [failedImage, setFailedImage] = useState("");
  const urlFailed = failedImage !== "" && failedImage === form.image;

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, saving]);

  if (!open) return null;

  const categoryOptions = CATEGORY_OPTIONS.some(
    (option) => option.value === form.category,
  )
    ? CATEGORY_OPTIONS
    : [...CATEGORY_OPTIONS, { value: form.category, label: form.category }];

  return (
    <div
      className="ap-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        className="ap-modal ap-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ap-form-title"
      >
        <div className="ap-modal-header">
          <div>
            <p className="eyebrow">PRODUCT CATALOG</p>
            <h2 id="ap-form-title">
              {editing ? "Edit product" : "Add product"}
            </h2>
            <p>
              {editing
                ? "Update product information and upload additional images."
                : "Create a product listing and upload its images."}
            </p>
          </div>

          <button
            type="button"
            className="ap-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className="ap-product-form" onSubmit={onSubmit}>
          <label>
            Product name *
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              required
              autoFocus
              maxLength={120}
            />
          </label>

          <label>
            Product slug *
            <input
              name="slug"
              value={form.slug}
              onChange={onChange}
              required
              maxLength={140}
            />
            <small>
              {slugEdited
                ? "Lowercase letters, numbers, and hyphens."
                : "Created from the name. Edit it to customize."}
            </small>
          </label>

          <label>
            Price (PHP) *
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={onChange}
              required
            />
          </label>

          {form.image && (
            <div className="ap-form-image-preview">
              {urlFailed ? (
                <span>Existing image path unavailable</span>
              ) : (
                <img
                  src={resolveImageUrl(form.image)}
                  alt="Current product"
                  onError={() => setFailedImage(form.image)}
                />
              )}
            </div>
          )}

          <div className="ap-image-upload-section ap-form-full">
            <div className="ap-image-upload-heading">
              <div>
                <strong>Product images</strong>
                <p>
                  Select multiple photos for different product angles and
                  details. Newly selected images will be uploaded when you save.
                </p>
              </div>

              <span>
                {imageFiles.length}/{MAX_IMAGE_COUNT} selected
              </span>
            </div>

            <label
              className={`ap-image-upload-area${dragging ? " is-dragging" : ""}${
                imageFiles.length >= MAX_IMAGE_COUNT ? " is-disabled" : ""
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                onAddFiles(Array.from(event.dataTransfer.files || []));
              }}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                onChange={onImageSelection}
                disabled={saving || imageFiles.length >= MAX_IMAGE_COUNT}
              />

              <span className="ap-image-upload-icon">＋</span>
              <strong>Drop images here or click to browse</strong>
              <small>PNG, JPG, WEBP, or GIF, up to 20 MB each</small>
            </label>

            {imageError && (
              <p className="ap-image-upload-error" role="alert">
                {imageError}
              </p>
            )}

            {imagePreviews.length > 0 && (
              <div className="ap-image-preview-grid">
                {imagePreviews.map((preview, index) => (
                  <div
                    className="ap-uploaded-image"
                    key={`${imageFiles[index]?.name || "image"}-${index}`}
                  >
                    <img
                      src={preview}
                      alt={`Product preview ${index + 1}`}
                    />

                    {index === 0 ? (
                      <span className="ap-main-image-label">First upload</span>
                    ) : (
                      <button
                        type="button"
                        className="ap-make-main"
                        onClick={() => onMakeMain(index)}
                        disabled={saving}
                      >
                        Move first
                      </button>
                    )}

                    <button
                      type="button"
                      className="ap-remove-image"
                      onClick={() => onRemoveImage(index)}
                      disabled={saving}
                      aria-label={`Remove image ${index + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <small className="ap-image-upload-note">
              Images are uploaded to the product image channel when you save.
              The first uploaded image becomes the primary image if the product
              does not already have one.
            </small>
          </div>

          <label>
            Category
            <select name="category" value={form.category} onChange={onChange}>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Availability
            <select name="status" value={form.status} onChange={onChange}>
              <option value="ready">Ready stock</option>
              <option value="pre-order">Pre-order</option>
            </select>
          </label>

          <label className="ap-form-full">
            Sizes
            <input
              name="sizes"
              value={form.sizes}
              onChange={onChange}
              placeholder="S, M, L, XL"
            />
            <small>Separate sizes with commas.</small>
          </label>

          <div className="ap-form-checkboxes ap-form-full">
            <label>
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={onChange}
              />
              Active listing
            </label>

            <label>
              <input
                type="checkbox"
                name="isMock"
                checked={form.isMock}
                onChange={onChange}
              />
              Mock product
            </label>
          </div>

          {error && (
            <p className="ap-form-error ap-form-full" role="alert">
              {error}
            </p>
          )}

          <div className="ap-modal-footer ap-form-full">
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
              className="ap-primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Add product"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
