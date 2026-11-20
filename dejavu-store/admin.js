(() => {
  const sessionKey = 'dejavu-admin-session-v1';
  const lockKey = 'dejavu-admin-lock-v1';
  const credentialSalt = 'dejavu-management-v1';
  const credentialFingerprints = {
    username: '1dfa454f7bcb12924ed6c9a2f716505b77216c393150c9098281e3e5352ec9d5',
    password: '5bf826db6e8f901b467d96c70972b93b1c3244e5c8676ea884402ff40c58038e'
  };
  const maxAttempts = 5;
  const lockDurationMs = 15 * 60 * 1000;
  const login = document.querySelector('[data-admin-login]');
  const loginForm = document.querySelector('[data-login-form]');
  const loginMessage = document.querySelector('[data-login-message]');
  const adminPage = document.querySelector('.admin-page');

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function credentialFingerprint(value) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(value),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(credentialSalt),
        iterations: 120000,
        hash: 'SHA-256'
      },
      key,
      256
    );
    return bytesToHex(bits);
  }

  function readLockState() {
    try {
      return JSON.parse(localStorage.getItem(lockKey) || '{"attempts":0,"lockedUntil":0}');
    } catch {
      return { attempts: 0, lockedUntil: 0 };
    }
  }

  function writeLockState(state) {
    localStorage.setItem(lockKey, JSON.stringify(state));
  }

  function setAdminVisible(visible) {
    if (login) login.hidden = visible;
    if (adminPage) adminPage.hidden = !visible;
  }

  setAdminVisible(sessionStorage.getItem(sessionKey) === 'true');

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const fields = new FormData(loginForm);
    const username = String(fields.get('username')).trim();
    const password = String(fields.get('password'));
    const now = Date.now();
    let lockState = readLockState();

    if (lockState.lockedUntil > now) {
      const seconds = Math.ceil((lockState.lockedUntil - now) / 1000);
      loginMessage.textContent = `محاولات كثيرة. حاول بعد ${Math.ceil(seconds / 60)} دقيقة.`;
      return;
    }

    if (lockState.lockedUntil && lockState.lockedUntil <= now) {
      lockState = { attempts: 0, lockedUntil: 0 };
      writeLockState(lockState);
    }

    const submitButton = loginForm.querySelector('[type="submit"]');
    submitButton.disabled = true;

    const [usernameFingerprint, passwordFingerprint] = await Promise.all([
      credentialFingerprint(username),
      credentialFingerprint(password)
    ]);

    submitButton.disabled = false;

    if (
      usernameFingerprint === credentialFingerprints.username &&
      passwordFingerprint === credentialFingerprints.password
    ) {
      writeLockState({ attempts: 0, lockedUntil: 0 });
      sessionStorage.setItem(sessionKey, 'true');
      setAdminVisible(true);
      loginMessage.textContent = '';
      loginForm.reset();
      return;
    }

    lockState.attempts += 1;
    if (lockState.attempts >= maxAttempts) {
      lockState.lockedUntil = now + lockDurationMs;
      writeLockState(lockState);
      loginMessage.textContent = 'تم قفل الدخول مؤقتًا لمدة 15 دقيقة بسبب المحاولات الخاطئة.';
    } else {
      writeLockState(lockState);
      const remaining = maxAttempts - lockState.attempts;
      loginMessage.textContent = `بيانات الدخول غير صحيحة. بقيت ${remaining} محاولات.`;
    }
  });

  const storageKey = 'dejavu-custom-products-v1';
  const form = document.querySelector('[data-product-form]');
  const list = document.querySelector('[data-added-products]');
  const message = document.querySelector('[data-admin-message]');
  const addPanel = document.querySelector('[data-add-panel]');
  const editPanel = document.querySelector('[data-edit-panel]');
  const editGrid = document.querySelector('[data-edit-grid]');
  const editWorkspace = document.querySelector('[data-edit-workspace]');
  const editFormMount = document.querySelector('[data-edit-form-mount]');
  const editSearch = document.querySelector('[data-edit-search]');
  const catalogData = window.DEJAVU_DATA;
  let editingId = '';
  if (!form || !list) return;
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
  const safeImageSource = value => {
    const source = String(value || '');
    return source.startsWith('data:image/jpeg;base64,') ||
      source.startsWith('data:image/png;base64,') ||
      source.startsWith('../assets/')
      ? source
      : '../assets/dejavu-logo.png';
  };

  const readProducts = () => {
    try {
      const products = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(products) ? products.filter(product =>
        product &&
        typeof product.id === 'string' &&
        typeof product.name === 'string' &&
        Number.isFinite(Number(product.price))
      ).map(product => ({
        ...product,
        id: product.id.slice(0, 100),
        name: product.name.slice(0, 120),
        description: String(product.description || '').slice(0, 500),
        material: String(product.material || '').slice(0, 100),
        style: String(product.style || '').slice(0, 100),
        dimensions: String(product.dimensions || '').slice(0, 100),
        price: Math.max(1, Number(product.price)),
        salePrice: Number(product.salePrice) > 0 ? Number(product.salePrice) : null,
        image: safeImageSource(product.image)
      })) : [];
    } catch { return []; }
  };

  const writeProducts = products => localStorage.setItem(storageKey, JSON.stringify(products));

  function getEffectiveProducts() {
    const customProducts = readProducts();
    const customIds = new Set(customProducts.map(product => product.id));
    return [
      ...customProducts,
      ...(catalogData?.products || []).filter(product => !customIds.has(product.id))
    ];
  }

  function clearFormForNewProduct() {
    editingId = '';
    form.reset();
    const imageInput = form.elements.image;
    if (imageInput) imageInput.required = true;
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.textContent = 'إضافة المنتج';
    if (addPanel) addPanel.prepend(form);
    if (editGrid) editGrid.hidden = false;
    if (editWorkspace) editWorkspace.hidden = true;
  }

  function startEditing(product) {
    editingId = product.id;
    if (editFormMount) editFormMount.appendChild(form);
    if (editGrid) editGrid.hidden = true;
    if (editWorkspace) editWorkspace.hidden = false;
    if (!product) return;
    form.elements.name.value = product.name || '';
    form.elements.price.value = product.price || '';
    form.elements.salePrice.value = product.salePrice || '';
    form.elements.discountActive.checked = Boolean(product.discountActive);
    if (product.saleEnds) {
      const localDate = new Date(product.saleEnds);
      const offsetDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
      form.elements.saleEnds.value = offsetDate.toISOString().slice(0, 16);
    } else {
      form.elements.saleEnds.value = '';
    }
    form.elements.categoryId.value = product.categoryId || 'wall-art';
    form.elements.description.value = product.description || '';
    form.elements.material.value = product.material || '';
    form.elements.style.value = product.style || '';
    form.elements.dimensions.value = product.dimensions || '';
    form.elements.featured.checked = Boolean(product.featured);
    form.elements.bestseller.checked = Boolean(product.bestseller);
    form.elements.customizable.checked = Boolean(product.customizable);
    form.elements.image.value = '';
    form.elements.image.required = false;
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.textContent = 'حفظ تعديلات المنتج';
    message.textContent = 'أنت الآن تعدل منتجًا موجودًا. الصورة اختيارية.';
  }

  const slugify = value => value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
    .replace(/^-+|-+$/g, '') || `product-${Date.now()}`;

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => {
          const maxSize = 1200;
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderEditGrid(searchTerm = '') {
    if (!editGrid) return;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const products = getEffectiveProducts().filter(product =>
      `${product.name} ${product.category} ${product.description}`
        .toLowerCase()
        .includes(normalizedSearch)
    );

    editGrid.innerHTML = products.length ? products.map(product => {
      const discountActive = Boolean(product.discountActive && product.salePrice && product.salePrice < product.price);
      const discountPercent = discountActive ? Math.round((1 - product.salePrice / product.price) * 100) : 0;
      const expires = product.saleEnds ? new Date(product.saleEnds).toLocaleString('ar-EG') : '';
      return `
      <button type="button" class="edit-product-card" data-edit-product-card="${escapeHtml(product.id)}">
        <img src="${escapeHtml(safeImageSource(product.image))}" alt="${escapeHtml(product.name)}">
        ${discountActive ? `<span class="edit-discount-badge">خصم ${discountPercent}%</span>` : ''}
        <span class="edit-product-card-copy">
          <strong>${escapeHtml(product.name)}</strong>
          ${discountActive
            ? `<span class="edit-price-row"><del>${Number(product.price).toLocaleString('en-EG')} EGP</del><b>${Number(product.salePrice).toLocaleString('en-EG')} EGP</b></span>`
            : `<small>${Number(product.price).toLocaleString('en-EG')} EGP</small>`}
          ${discountActive && expires ? `<small>ينتهي: ${expires}</small>` : ''}
        </span>
        <span class="edit-product-card-action">تعديل <i class="fa-solid fa-arrow-left"></i></span>
      </button>
    `}).join('') : '<p class="admin-empty">لا توجد منتجات مطابقة للبحث.</p>';
  }

  document.querySelectorAll('[data-management-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.managementTab;
      document.querySelectorAll('[data-management-tab]').forEach(item => {
        const active = item === tab;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
      if (addPanel) addPanel.hidden = target !== 'add';
      if (editPanel) editPanel.hidden = target !== 'edit';
      if (target === 'edit') renderEditGrid(editSearch?.value || '');
    });
  });

  editSearch?.addEventListener('input', () => renderEditGrid(editSearch.value));

  editGrid?.addEventListener('click', event => {
    const card = event.target.closest('[data-edit-product-card]');
    if (!card) return;
    const product = getEffectiveProducts().find(item => item.id === card.dataset.editProductCard);
    if (product) startEditing(product);
  });

  document.querySelector('[data-back-to-products]')?.addEventListener('click', () => {
    clearFormForNewProduct();
    if (editGrid) editGrid.hidden = false;
    if (editWorkspace) editWorkspace.hidden = true;
    message.textContent = '';
  });

  function renderProducts() {
    const products = readProducts();
    if (!products.length) {
      list.innerHTML = '<p class="admin-empty">لا توجد منتجات مضافة بعد.</p>';
      return;
    }

    list.innerHTML = products.map(product => `
      <article class="admin-product">
        <img src="${escapeHtml(safeImageSource(product.image))}" alt="${escapeHtml(product.name)}">
        <div>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${Number(product.price).toLocaleString('en-EG')} EGP</p>
        </div>
        <button type="button" data-delete-product="${escapeHtml(product.id)}" aria-label="حذف ${escapeHtml(product.name)}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </article>
    `).join('');
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const fields = new FormData(form);
    const file = fields.get('image');
    const existingProduct = editingId
      ? getEffectiveProducts().find(product => product.id === editingId)
      : null;
    if (!editingId && (!(file instanceof File) || file.size === 0)) {
      message.textContent = 'اختَر صورة للمنتج.';
      return;
    }

    try {
      const image = file instanceof File && file.size > 0
        ? await resizeImage(file)
        : existingProduct?.image;
      if (!image) {
        message.textContent = 'اختَر صورة للمنتج.';
        return;
      }
      const name = String(fields.get('name')).trim();
      const categoryId = String(fields.get('categoryId'));
      const originalPrice = Number(fields.get('price'));
      const salePrice = Number(fields.get('salePrice')) || null;
      const discountActive = fields.has('discountActive');
      const saleEndsValue = String(fields.get('saleEnds')).trim();
      const saleEnds = saleEndsValue ? new Date(saleEndsValue).toISOString() : null;
      if (discountActive && (!salePrice || salePrice >= originalPrice)) {
        message.textContent = 'السعر بعد الخصم يجب أن يكون أقل من السعر الأصلي.';
        return;
      }
      if (discountActive && (!saleEnds || new Date(saleEnds).getTime() <= Date.now())) {
        message.textContent = 'اختَر تاريخ انتهاء للخصم في المستقبل.';
        return;
      }
      const categoryNames = {
        'wall-art': 'Wall art',
        personalized: 'Personalized',
        frames: 'Frames',
        gifts: 'Gifts',
        'laser-wood': 'Laser wood',
        '3d-printing': '3D printing'
      };
      const idBase = editingId || slugify(name);
      const products = readProducts();
      let id = idBase;
      if (!editingId) {
        let suffix = 2;
        while (products.some(product => product.id === id)) id = `${idBase}-${suffix++}`;
      }

      const updatedProduct = {
        id,
        name,
        category: categoryNames[categoryId],
        categoryId,
        description: String(fields.get('description')).trim(),
        price: Number(fields.get('price')),
        material: String(fields.get('material')).trim(),
        style: String(fields.get('style')).trim(),
        dimensions: String(fields.get('dimensions')).trim(),
        image,
        available: true,
        featured: fields.has('featured'),
        bestseller: fields.has('bestseller'),
        customizable: fields.has('customizable'),
        salePrice: Number(fields.get('salePrice')) || null,
        discountActive: fields.has('discountActive'),
        saleEnds
      };

      const wasEditing = Boolean(editingId);
      if (editingId) {
        const existingIndex = products.findIndex(product => product.id === editingId);
        if (existingIndex >= 0) products[existingIndex] = updatedProduct;
        else products.unshift(updatedProduct);
      } else {
        products.unshift(updatedProduct);
      }

      writeProducts(products);
      clearFormForNewProduct();
      message.textContent = wasEditing
        ? 'تم حفظ تعديلات المنتج.'
        : 'تمت إضافة المنتج وظهر في المتجر.';
      renderEditGrid(editSearch?.value || '');
      renderProducts();
    } catch {
      message.textContent = 'تعذر تجهيز الصورة. جرّب صورة أخرى.';
    }
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-delete-product]');
    if (!button) return;
    const products = readProducts().filter(product => product.id !== button.dataset.deleteProduct);
    writeProducts(products);
    renderProducts();
  });

  document.querySelector('[data-export-products]')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(readProducts(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dejavu-products-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  });

  document.querySelector('[data-admin-logout]')?.addEventListener('click', () => {
    sessionStorage.removeItem(sessionKey);
    setAdminVisible(false);
  });

  renderEditGrid();
  renderProducts();
})();
