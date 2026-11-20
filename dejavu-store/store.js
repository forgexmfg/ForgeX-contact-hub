/* Store behavior stays separate from the editable catalog in data.js. */
(() => {
  const data = window.DEJAVU_DATA;
  if (!data) return;
  try {
    const savedProducts = JSON.parse(localStorage.getItem('dejavu-custom-products-v1') || '[]');
    if (Array.isArray(savedProducts) && savedProducts.length) {
      const sanitizedSavedProducts = savedProducts.filter(product =>
        product &&
        typeof product.id === 'string' &&
        typeof product.name === 'string' &&
        Number.isFinite(Number(product.price))
      ).map(product => ({
        ...product,
        id: product.id.slice(0, 100),
        name: String(product.name).slice(0, 120),
        description: String(product.description || '').slice(0, 500),
        price: Math.max(1, Number(product.price)),
        salePrice: Number(product.salePrice) > 0 ? Number(product.salePrice) : null,
        image: /^data:image\/(jpeg|png);base64,/i.test(String(product.image || '')) ||
          /^(\.\.\/)?assets\//.test(String(product.image || ''))
          ? String(product.image).slice(0, 1000000)
          : '../assets/dejavu-logo.png'
      }));
      const savedIds = new Set(sanitizedSavedProducts.map(product => product.id));
      data.products = [
        ...sanitizedSavedProducts,
        ...data.products.filter(product => !savedIds.has(product.id))
      ];
    }
  } catch {}

  const page = document.body.dataset.page;
  const cartKey = 'dejavu-cart-v1';
  const wishlistKey = 'dejavu-wishlist-v1';
  const money = amount => `EGP ${Number(amount).toLocaleString('en-EG')}`;
  const priceValue = amount => Number(amount).toLocaleString('en-EG');
  const saleIsActive = product => {
    if (!product?.discountActive || !product.salePrice || product.salePrice >= product.price) return false;
    if (!product.saleEnds) return true;
    return new Date(product.saleEnds).getTime() > Date.now();
  };
  const effectivePrice = product => saleIsActive(product) ? Number(product.salePrice) : Number(product?.price || 0);
  const countdownMarkup = product => {
    if (!saleIsActive(product) || !product.saleEnds) return '';
    return `<div class="sale-countdown" data-sale-countdown="${escapeHtml(product.saleEnds)}" aria-label="Sale countdown">
      <span><b data-count-days>00</b><small>يوم</small></span>
      <span><b data-count-hours>00</b><small>ساعة</small></span>
      <span><b data-count-minutes>00</b><small>دقيقة</small></span>
      <span><b data-count-seconds>00</b><small>ثانية</small></span>
    </div>`;
  };
  const priceMarkup = product => {
    if (saleIsActive(product)) {
      return `<span class="price-before">${priceValue(product.price)} <small>EGP</small></span><span class="price-after">${priceValue(product.salePrice)} <small>EGP</small></span>`;
    }
    return `${priceValue(product.price)} <small>EGP</small>`;
  };
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const productById = id => data.products.find(product => product.id === id);
  const readStore = key => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  };
  const writeStore = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  let toastTimer;

  function showToast(message) {
    const toast = document.querySelector('.toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  function logoMarkup(className = 'brand-lockup') {
    return `<a class="${className}" href="index.html" aria-label="Dejavu Decor home"><img class="brand-logo" src="${escapeHtml(data.brand.logo)}" alt="Dejavu Decor logo"><span class="brand-wordmark">Dejavu Decor</span></a>`;
  }

  function renderHeader() {
    const announcements = data.announcement.map((item, index) => {
      const icons = ['fa-truck', 'fa-wand-magic-sparkles', 'fa-heart'];
      return `<span><i class="fa-solid ${icons[index] || 'fa-star'}" aria-hidden="true"></i>${escapeHtml(item)}</span>`;
    }).join('');
    const links = data.navigation.map(item => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`).join('');
    document.querySelector('#site-header').innerHTML = `
      <div class="announcement" aria-label="Store highlights">${announcements}</div>
      <header class="site-header">
        <div class="nav-row">
          ${logoMarkup()}
          <nav class="main-nav" aria-label="Main navigation">${links}</nav>
          <div class="nav-actions">
            <button class="nav-action" type="button" data-open-search aria-label="Search products"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></button>
            <button class="nav-action" type="button" data-account aria-label="Customer account"><i class="fa-regular fa-user" aria-hidden="true"></i></button>
            <button class="nav-action" type="button" data-open-wishlist aria-label="Wishlist"><i class="fa-regular fa-heart" aria-hidden="true"></i><span class="count-badge" data-wishlist-count>0</span></button>
            <button class="nav-action" type="button" data-open-cart aria-label="Shopping bag"><i class="fa-solid fa-bag-shopping" aria-hidden="true"></i><span class="count-badge" data-cart-count>0</span></button>
            <button class="menu-toggle" type="button" data-menu-toggle aria-label="Open navigation" aria-expanded="false"><i class="fa-solid fa-bars" aria-hidden="true"></i></button>
          </div>
        </div>
      </header>`;
    const logo = document.querySelector('.brand-logo');
    logo.addEventListener('error', () => { logo.hidden = true; }, { once: true });
  }

  function renderFooter() {
    const social = [
      ['facebook', 'fa-facebook-f'], ['instagram', 'fa-instagram'], ['tiktok', 'fa-tiktok']
    ].map(([network, icon]) => `<a href="${escapeHtml(data.brand.social[network])}" target="_blank" rel="noopener" aria-label="Dejavu Decor ${network}"><i class="fa-brands ${icon}" aria-hidden="true"></i></a>`).join('');
    const linkList = items => items.map(item => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`).join('');
    document.querySelector('#site-footer').innerHTML = `
      <footer class="store-footer" id="contact">
        <div class="footer-main">
          <div class="footer-brand footer-brand-column">
            ${logoMarkup('brand-lockup')}
            <p>Unique decor for unique people. Customized designs for homes, offices, and special occasions.</p>
            <p>${escapeHtml(data.brand.parent)}.</p>
            <div class="footer-socials">${social}</div>
          </div>
          <div><h2 class="footer-heading">Shop</h2><nav class="footer-links" aria-label="Shop links">${linkList(data.footerLinks.shop)}</nav></div>
          <div><h2 class="footer-heading">Help</h2><nav class="footer-links" aria-label="Help links">${linkList(data.footerLinks.help)}</nav></div>
          <div class="footer-contact footer-contact-column"><h2 class="footer-heading">Contact</h2>
            <a href="https://wa.me/${escapeHtml(data.brand.whatsapp)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i><span>Chat on WhatsApp</span></a>
            <a href="mailto:${escapeHtml(data.brand.email)}"><i class="fa-regular fa-envelope" aria-hidden="true"></i><span>${escapeHtml(data.brand.email)}</span></a>
            <p><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>${escapeHtml(data.brand.location)}</span></p>
          </div>
        </div>
        <div class="footer-bottom"><p>© ${new Date().getFullYear()} Dejavu Decor · ${escapeHtml(data.brand.parent)}</p><p>Designed with care in Egypt</p></div>
      </footer>`;
    const logo = document.querySelector('#site-footer .brand-logo');
    logo.addEventListener('error', () => { logo.hidden = true; }, { once: true });
  }

  function ensureOverlays() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="drawer-backdrop" data-drawer-backdrop></div>
      <aside class="cart-drawer" data-cart-drawer aria-label="Shopping bag" aria-hidden="true">
        <div class="drawer-header"><h2>Your bag <span data-drawer-count></span></h2><button class="drawer-close" type="button" data-close-cart aria-label="Close bag"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>
        <div class="cart-items" data-cart-items></div>
        <div class="cart-summary"><div class="cart-subtotal"><span>Subtotal</span><b data-cart-subtotal>EGP 0</b></div><a class="button button-light" data-checkout href="#" target="_blank" rel="noopener">Continue on WhatsApp <i class="fa-brands fa-whatsapp" aria-hidden="true"></i></a><p class="cart-disclaimer">This preview sends your order details to Dejavu on WhatsApp. Online payment is not connected yet.</p></div>
      </aside>
      <div class="search-layer" data-search-layer aria-hidden="true">
        <button class="search-scrim" type="button" data-close-search aria-label="Close search"></button>
        <form class="search-panel" data-search-form role="search"><div class="drawer-header"><h2>Find a piece</h2><button class="drawer-close" type="button" data-close-search aria-label="Close search"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div><label for="store-search">Search the collection</label><div class="search-entry"><input id="store-search" name="q" type="search" placeholder="Try wall art or personalized" data-search-input required><button class="button button-light" type="submit" aria-label="Search"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div></form>
      </div>
      <dialog class="quick-view-dialog" data-quick-view-dialog aria-labelledby="quick-view-title"><div data-quick-view-content></div></dialog>
      <div class="toast" role="status" aria-live="polite"></div>`);
  }

  function productCard(product) {
    const wished = readStore(wishlistKey).includes(product.id);
    return `<article class="product-card">
      <a class="product-image" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${escapeHtml(product.name)}">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)} displayed in a styled interior" loading="lazy">
        ${saleIsActive(product) ? `<span class="sale-ribbon"><b>خصم ${Math.round((1 - product.salePrice / product.price) * 100)}%</b><small>عرض خاص</small></span>` : ''}
        ${product.available ? '' : '<span class="unavailable">Made to order</span>'}
      </a>
      <button class="wishlist-toggle" type="button" data-wishlist="${escapeHtml(product.id)}" aria-label="Add ${escapeHtml(product.name)} to wishlist" aria-pressed="${wished}"><i class="${wished ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i></button>
      <div class="product-info"><span class="product-category">${escapeHtml(product.category)}</span><a href="product.html?id=${encodeURIComponent(product.id)}"><h3>${escapeHtml(product.name)}</h3></a>
        <p class="product-price">${priceMarkup(product)}</p>
        ${countdownMarkup(product)}
        <div class="product-actions"><button class="add-button" type="button" data-add-to-cart="${escapeHtml(product.id)}"><i class="fa-solid fa-plus" aria-hidden="true"></i> Add to bag</button><button class="quick-view" type="button" data-quick-view="${escapeHtml(product.id)}" aria-label="Quick view ${escapeHtml(product.name)}"><i class="fa-solid fa-up-right-and-down-left-from-center" aria-hidden="true"></i></button></div>
      </div>
    </article>`;
  }

  function renderHome() {
    document.querySelector('[data-hero-eyebrow]').textContent = data.hero.eyebrow;
    document.querySelector('[data-hero-title]').textContent = data.hero.title;
    document.querySelector('[data-hero-copy]').textContent = data.hero.copy;
    document.querySelector('[data-hero-primary]').textContent = data.hero.primaryCta;
    document.querySelector('[data-hero-secondary]').textContent = data.hero.secondaryCta;
    document.querySelector('[data-category-grid]').innerHTML = data.categories.map(category => `<a class="category-card" href="shop.html?category=${encodeURIComponent(category.id)}"><img src="${escapeHtml(category.image)}" alt="${escapeHtml(category.name)} home decor collection" loading="lazy"><div class="category-info"><h3>${escapeHtml(category.name)}</h3><p>${escapeHtml(category.description)}</p></div></a>`).join('');
    document.querySelector('[data-featured-grid]').innerHTML = data.products.filter(product => product.featured).map(productCard).join('');
    document.querySelector('[data-bestseller-grid]').innerHTML = data.products.filter(product => product.bestseller).slice(0, 3).map(productCard).join('');
    const review = data.testimonials[0];
    document.querySelector('[data-review-feature]').innerHTML = `<div class="review-stars" aria-label="${review.rating} out of 5 stars">${'★'.repeat(review.rating)}</div><blockquote>“${escapeHtml(review.quote)}”</blockquote><p class="review-author">${escapeHtml(review.name)}<span class="review-location">${escapeHtml(review.location)}</span></p>`;
  }

  function populateShopFilters() {
    const categorySelect = document.querySelector('[data-filter="category"]');
    const materialSelect = document.querySelector('[data-filter="material"]');
    const styleSelect = document.querySelector('[data-filter="style"]');
    data.categories.forEach(category => categorySelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`));
    [...new Set(data.products.map(product => product.material))].forEach(material => materialSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(material)}">${escapeHtml(material)}</option>`));
    [...new Set(data.products.map(product => product.style))].forEach(style => styleSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(style)}">${escapeHtml(style)}</option>`));
    const params = new URLSearchParams(location.search);
    if (params.has('category')) categorySelect.value = params.get('category');
    if (params.has('sort')) document.querySelector('[data-filter="sort"]').value = params.get('sort');
    if (params.has('q')) document.querySelector('[data-shop-search]')?.setAttribute('value', params.get('q'));
  }

  function renderShop() {
    populateShopFilters();
    const search = new URLSearchParams(location.search).get('q') || '';
    const filtered = data.products.filter(product => {
      const value = search.toLowerCase();
      const price = document.querySelector('[data-filter="price"]').value;
      const bounds = price === 'all' ? null : price.split('-').map(Number);
      return (!value || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(value))
        && (document.querySelector('[data-filter="category"]').value === 'all' || product.categoryId === document.querySelector('[data-filter="category"]').value)
        && (!bounds || (effectivePrice(product) >= bounds[0] && effectivePrice(product) <= bounds[1]))
        && (document.querySelector('[data-filter="material"]').value === 'all' || product.material === document.querySelector('[data-filter="material"]').value)
        && (document.querySelector('[data-filter="style"]').value === 'all' || product.style === document.querySelector('[data-filter="style"]').value)
        && (!document.querySelector('[data-filter="availability"]').checked || product.available);
    });
    const sort = document.querySelector('[data-filter="sort"]').value;
    if (sort === 'price-asc') filtered.sort((a,b) => effectivePrice(a) - effectivePrice(b));
    if (sort === 'price-desc') filtered.sort((a,b) => effectivePrice(b) - effectivePrice(a));
    if (sort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));
    document.querySelector('[data-shop-grid]').innerHTML = filtered.map(productCard).join('');
    document.querySelector('[data-result-count]').textContent = `${filtered.length} ${filtered.length === 1 ? 'piece' : 'pieces'}`;
    document.querySelector('[data-empty-state]').hidden = filtered.length > 0;
  }

  function renderProduct() {
    const params = new URLSearchParams(location.search);
    const product = productById(params.get('id')) || data.products.find(item => item.featured) || data.products[0];
    document.title = `${product.name} | Dejavu Decor`;
    document.querySelector('[data-product-category]').textContent = product.category;
    const gallery = product.gallery || [product.image];
    const customization = product.customizable ? `<div class="custom-fields"><h2>Make it yours</h2>
      <label>Name<input name="custom-name" type="text" maxlength="40" placeholder="Name for your design"></label>
      <label>Text or phrase<input name="custom-text" type="text" maxlength="90" placeholder="Optional wording"></label>
      <label>Size<select name="custom-size"><option>Standard</option><option>Small</option><option>Large</option></select></label>
      <label>Finish<select name="custom-color"><option>Natural wood</option><option>Dark wood</option><option>Ivory</option></select></label>
      <label>Notes<textarea name="custom-notes" maxlength="300" placeholder="Anything else we should know?"></textarea></label>
      <label>Reference image<input name="custom-upload" type="file" accept="image/*,.pdf"><small>After continuing in WhatsApp, send this reference file in the chat.</small></label>
    </div>` : '';
    document.querySelector('[data-product-detail]').innerHTML = `
      <div class="product-gallery"><figure class="product-main-image"><img data-main-product-image src="${escapeHtml(gallery[0])}" alt="${escapeHtml(product.name)}" fetchpriority="high"></figure>
        <div class="product-thumbnails">${gallery.map((image,index) => `<button class="product-thumb" type="button" data-product-image="${escapeHtml(image)}" aria-label="View product image ${index + 1}" aria-current="${index === 0}"><img src="${escapeHtml(image)}" alt="" loading="lazy"></button>`).join('')}</div>
      </div>
      <div class="product-summary"><p class="eyebrow">${escapeHtml(product.category)}</p><h1>${escapeHtml(product.name)}</h1><p class="product-price">${priceMarkup(product)}</p>${countdownMarkup(product)}
        <p class="product-description">${escapeHtml(product.description)}</p>
        <div class="product-specs"><span>Material<b>${escapeHtml(product.material)}</b></span><span>Dimensions<b>${escapeHtml(product.dimensions)}</b></span></div>
        ${customization}
        <div class="purchase-row"><div class="quantity-control"><button type="button" data-quantity-step="-1" aria-label="Decrease quantity">−</button><output data-quantity>1</output><button type="button" data-quantity-step="1" aria-label="Increase quantity">+</button></div>
          <div class="purchase-buttons"><button class="button button-light" type="button" data-detail-add="${escapeHtml(product.id)}">Add to bag</button><button class="button buy-button" type="button" data-buy-now="${escapeHtml(product.id)}">Buy now</button></div>
        </div><p class="delivery-note"><i class="fa-solid fa-truck" aria-hidden="true"></i> Delivery across Egypt. Custom pieces are confirmed with you on WhatsApp before production.</p>
      </div>`;
    document.querySelector('[data-related-grid]').innerHTML = data.products.filter(item => item.id !== product.id).slice(0, 4).map(productCard).join('');
    const review = data.testimonials[0];
    document.querySelector('[data-product-review]').innerHTML = `<p class="eyebrow">Customer note</p><div class="review-stars" aria-label="${review.rating} out of 5 stars">${'★'.repeat(review.rating)}</div><blockquote>“${escapeHtml(review.quote)}”</blockquote><p class="review-author">${escapeHtml(review.name)}<span class="review-location">${escapeHtml(review.location)}</span></p>`;
  }

  function addToCart(id, quantity = 1, customization = null) {
    const product = productById(id);
    if (!product) return;
    const cart = readStore(cartKey);
    const existing = cart.find(item => item.id === id && JSON.stringify(item.customization || null) === JSON.stringify(customization));
    if (existing) existing.quantity += quantity;
    else cart.push({ id, quantity, customization });
    writeStore(cartKey, cart);
    updateCart();
    showToast(`${product.name} added to your bag`);
  }

  function updateCart() {
    const cart = readStore(cartKey);
    const count = cart.reduce((total,item) => total + item.quantity, 0);
    document.querySelectorAll('[data-cart-count]').forEach(badge => { badge.textContent = count; badge.hidden = count === 0; });
    document.querySelector('[data-drawer-count]').textContent = count ? `(${count})` : '';
    const items = document.querySelector('[data-cart-items]');
    if (!cart.length) {
      items.innerHTML = '<p class="cart-empty">Your bag is waiting for something made personal.</p>';
    } else {
      items.innerHTML = cart.map((item,index) => {
        const product = productById(item.id);
        if (!product) return '';
        const details = item.customization ? Object.entries(item.customization).filter(([,value]) => value).map(([key,value]) => `${escapeHtml(key)}: ${escapeHtml(value)}`).join(' · ') : '';
        return `<article class="cart-item"><img src="${escapeHtml(product.image)}" alt="" loading="lazy"><div><h3>${escapeHtml(product.name)}</h3><p>${money(effectivePrice(product))} · Qty ${item.quantity}</p>${details ? `<small>${details}</small>` : ''}<div class="cart-item-controls"><button type="button" data-cart-change="-1" data-cart-index="${index}" aria-label="Decrease ${escapeHtml(product.name)}">−</button><span>${item.quantity}</span><button type="button" data-cart-change="1" data-cart-index="${index}" aria-label="Increase ${escapeHtml(product.name)}">+</button></div></div><button class="cart-remove" type="button" data-cart-remove="${index}" aria-label="Remove ${escapeHtml(product.name)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></article>`;
      }).join('');
    }
    const subtotal = cart.reduce((total,item) => total + effectivePrice(productById(item.id) || {}) * item.quantity, 0);
    document.querySelector('[data-cart-subtotal]').textContent = money(subtotal);
    const message = ['Hello Dejavu Decor, I would like to order:', ...cart.map(item => {
      const product = productById(item.id);
      const extra = item.customization ? ` (${Object.entries(item.customization).filter(([,value])=>value).map(([key,value])=>`${key}: ${value}`).join(', ')})` : '';
      return `- ${product?.name || item.id} x ${item.quantity}${extra} — ${money(effectivePrice(product || {}) * item.quantity)}`;
    }), `Subtotal: ${money(subtotal)}`].join('\n');
    document.querySelector('[data-checkout]').href = `https://wa.me/${data.brand.whatsapp}?text=${encodeURIComponent(message)}`;
  }

  function updateWishlist() {
    const wishlist = readStore(wishlistKey);
    document.querySelectorAll('[data-wishlist]').forEach(button => {
      const active = wishlist.includes(button.dataset.wishlist);
      button.setAttribute('aria-pressed', String(active));
      button.innerHTML = `<i class="${active ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>`;
    });
    document.querySelectorAll('[data-wishlist-count]').forEach(badge => { badge.textContent = wishlist.length; badge.hidden = wishlist.length === 0; });
  }

  function initEvents() {
    document.querySelectorAll('[data-filter]').forEach(control => control.addEventListener('change', () => {
      if (page === 'shop') renderShop();
    }));
    document.addEventListener('click', event => {
      const target = event.target.closest('button, a, [data-close-search]');
      if (!target) return;
      if (target.matches('[data-menu-toggle]')) {
        const nav = document.querySelector('.main-nav');
        const open = nav.classList.toggle('is-open');
        target.setAttribute('aria-expanded', String(open));
        target.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      }
      if (target.matches('[data-open-cart]')) openCart(true);
      if (target.matches('[data-close-cart], [data-drawer-backdrop]')) openCart(false);
      if (target.matches('[data-open-search]')) {
        const layer = document.querySelector('[data-search-layer]');
        layer.classList.add('is-open');
        layer.setAttribute('aria-hidden','false');
        document.querySelector('[data-search-input]').focus();
      }
      if (target.matches('[data-close-search]')) { document.querySelector('[data-search-layer]').classList.remove('is-open'); document.querySelector('[data-search-layer]').setAttribute('aria-hidden','true'); }
      if (target.matches('[data-quick-view]')) {
        const product = productById(target.dataset.quickView);
        if (product) {
          document.querySelector('[data-quick-view-content]').innerHTML = `<button class="drawer-close quick-view-close" type="button" data-quick-view-close aria-label="Close quick view"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><p class="eyebrow">${escapeHtml(product.category)}</p><h2 id="quick-view-title">${escapeHtml(product.name)}</h2><p class="product-price">${priceMarkup(product)}</p>${countdownMarkup(product)}<p class="product-description">${escapeHtml(product.description)}</p><div class="quick-view-actions"><button class="button button-light" type="button" data-quick-view-add="${escapeHtml(product.id)}">Add to bag</button><a class="button button-outline" href="product.html?id=${encodeURIComponent(product.id)}">View details</a></div></div>`;
          document.querySelector('[data-quick-view-dialog]').showModal();
        }
      }
      if (target.matches('[data-quick-view-close]')) document.querySelector('[data-quick-view-dialog]').close();
      if (target.matches('[data-account]')) showToast('Customer accounts will be available when the store backend is connected.');
      if (target.matches('[data-open-wishlist]')) showToast(`${readStore(wishlistKey).length} saved ${readStore(wishlistKey).length === 1 ? 'piece' : 'pieces'} in your wishlist.`);
      if (target.matches('[data-add-to-cart], [data-detail-add], [data-buy-now], [data-quick-view-add]')) {
        event.preventDefault();
        const id = target.dataset.addToCart || target.dataset.detailAdd || target.dataset.buyNow || target.dataset.quickViewAdd;
        const quantity = target.hasAttribute('data-detail-add') || target.hasAttribute('data-buy-now') ? Number(document.querySelector('[data-quantity]')?.textContent || 1) : 1;
        const customization = (page === 'product' && productById(id)?.customizable) ? collectCustomization() : null;
        addToCart(id, quantity, customization);
        if (target.hasAttribute('data-buy-now')) openCart(true);
        if (target.hasAttribute('data-quick-view-add')) document.querySelector('[data-quick-view-dialog]').close();
      }
      if (target.matches('[data-wishlist]')) {
        const wishlist = readStore(wishlistKey);
        const index = wishlist.indexOf(target.dataset.wishlist);
        if (index >= 0) wishlist.splice(index,1); else wishlist.push(target.dataset.wishlist);
        writeStore(wishlistKey,wishlist); updateWishlist();
      }
      if (target.matches('[data-cart-change]')) {
        const cart=readStore(cartKey); const item=cart[Number(target.dataset.cartIndex)];
        if (item) { item.quantity += Number(target.dataset.cartChange); if (item.quantity < 1) cart.splice(Number(target.dataset.cartIndex),1); writeStore(cartKey,cart); updateCart(); }
      }
      if (target.matches('[data-cart-remove]')) { const cart=readStore(cartKey); cart.splice(Number(target.dataset.cartRemove),1); writeStore(cartKey,cart); updateCart(); }
      if (target.matches('[data-quantity-step]')) { const quantity=document.querySelector('[data-quantity]'); quantity.textContent=Math.max(1,Math.min(20,Number(quantity.textContent)+Number(target.dataset.quantityStep))); }
      if (target.matches('[data-product-image]')) {
        document.querySelector('[data-main-product-image]').src=target.dataset.productImage;
        document.querySelectorAll('[data-product-image]').forEach(button=>button.setAttribute('aria-current',String(button===target)));
      }
      if (target.matches('[data-filter-toggle]')) document.querySelector('[data-filters]').classList.toggle('is-open');
      if (target.matches('[data-clear-filters]')) {
        document.querySelectorAll('[data-filter]').forEach(control=> { if (control.type==='checkbox') control.checked=false; else control.value='all'; });
        document.querySelector('[data-filter="sort"]').value='featured';
        renderShop();
      }
    });
    document.querySelector('[data-newsletter-form]')?.addEventListener('submit', event => {
      event.preventDefault();
      document.querySelector('[data-newsletter-note]').textContent='Thanks for your interest. Newsletter signup will be connected at launch.';
      event.currentTarget.reset();
    });
    document.querySelector('[data-search-form]')?.addEventListener('submit', event => {
      event.preventDefault();
      const query=document.querySelector('[data-search-input]').value.trim();
      if (query) location.href=`shop.html?q=${encodeURIComponent(query)}`;
    });
    document.addEventListener('keydown', event => {
      if (event.key==='Escape') {
        document.querySelector('[data-search-layer]')?.classList.remove('is-open');
        document.querySelector('[data-search-layer]')?.setAttribute('aria-hidden','true');
        openCart(false);
      }
    });
    document.querySelector('[data-drawer-backdrop]')?.addEventListener('click', () => openCart(false));
  }

  function collectCustomization() {
    const form=document.querySelector('.custom-fields');
    if (!form) return null;
    const values={};
    form.querySelectorAll('input:not([type="file"]),select,textarea').forEach(field=> { if (field.value.trim()) values[field.labels?.[0]?.textContent.trim() || field.name]=field.value.trim(); });
    const file=form.querySelector('input[type="file"]')?.files?.[0];
    if (file) values['Reference file']=file.name;
    return Object.keys(values).length ? values : null;
  }

  function openCart(open) {
    document.querySelector('[data-cart-drawer]').classList.toggle('is-open',open);
    document.querySelector('[data-cart-drawer]').setAttribute('aria-hidden',String(!open));
    document.querySelector('[data-drawer-backdrop]').classList.toggle('is-open',open);
    document.body.classList.toggle('cart-open',open);
  }

  function updateCountdowns() {
    let expired = false;
    document.querySelectorAll('[data-sale-countdown]').forEach(counter => {
      let remaining = new Date(counter.dataset.saleCountdown).getTime() - Date.now();
      if (remaining <= 0) {
        expired = true;
        counter.remove();
        return;
      }
      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      counter.querySelector('[data-count-days]').textContent = String(days).padStart(2, '0');
      counter.querySelector('[data-count-hours]').textContent = String(hours).padStart(2, '0');
      counter.querySelector('[data-count-minutes]').textContent = String(minutes).padStart(2, '0');
      counter.querySelector('[data-count-seconds]').textContent = String(seconds).padStart(2, '0');
    });
    if (expired) {
      document.querySelectorAll('.sale-ribbon').forEach(ribbon => ribbon.remove());
      clearInterval(window.__dejavuCountdownInterval);
      setTimeout(() => location.reload(), 300);
    }
  }

  function init() {
    renderHeader(); renderFooter(); ensureOverlays();
    if (page==='home') renderHome();
    if (page==='shop') renderShop();
    if (page==='product') renderProduct();
    initEvents(); updateCart(); updateWishlist();
    updateCountdowns();
    window.__dejavuCountdownInterval = setInterval(updateCountdowns, 1000);
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
})();