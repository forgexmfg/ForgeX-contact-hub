# Dejavu Decor Storefront

An independent static storefront for Dejavu Decor. Open `index.html` for the homepage, `shop.html` for the catalog, and `product.html?id=modern-leaf-trio` for a product detail example.

## Editable areas

- `data.js`: logo path, contact links, announcement text, navigation, homepage copy, categories, products, prices, images, and testimonials.
- `store.css`: centralized palette, typography, spacing, radii, and shadows in `:root`.
- `index.html`, `shop.html`, and `product.html`: page structure and section order.
- `store.js`: shared header/footer, filters, cart, wishlist, search, product customization, and WhatsApp handoff.

The official Dejavu logo is `../assets/dejavu-logo.png` and is used unchanged in the header and footer. If the logo file changes, update its path in `data.js`.

## Store capabilities

The cart and wishlist are stored in the visitor's browser. The cart builds an order summary for WhatsApp, including product, quantity, and customization text. If a reference file is selected, the customer is prompted to send it in the WhatsApp chat. Online payments, accounts, inventory synchronization, and newsletter subscriptions require a backend and are not connected in this static preview.

The catalog includes 16 additional product photos stored in `../assets/dejavu-*.jpg`; each image is connected to its product in `data.js`. Prices for these new listings are starter values and should be confirmed before taking orders.