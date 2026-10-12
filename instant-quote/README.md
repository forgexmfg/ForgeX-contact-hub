# FORGEX Instant Quote — Client Interface

Customer-facing static quotation page for FORGEX Laser Cutting and 3D Printing.

## Automatic analysis in this build
- STL: binary and ASCII triangle-mesh volume + bounding box.
- OBJ: vertex/face mesh volume + bounding box.
- DXF: LINE, LWPOLYLINE, CIRCLE and ARC path-length analysis + basic bounding box.
- SVG: basic path/line/circle path-length analysis.
- 3MF: accepted for manual engineering review in this static build.

## Pricing
`FORGEX_Pricing.xlsx` is the editable catalog and pricing-rule source used to prepare the embedded client configuration.

IMPORTANT: A purely static website cannot read a local Excel file at runtime on a customer's device. The current HTML therefore contains an embedded copy of the catalog. If prices change, regenerate/sync the embedded catalog, or move the pricing catalog to a secure backend/database before production use.

The displayed amount is the configured FORGEX customer price. Laser pricing uses the sheet's material density/price, part length x width x thickness, cutting speed and piercing allowance. Printing uses the analyzed file weight plus surface area x face count / print speed for the production-time estimate. Backend/server-side recalculation is still recommended before accepting payment in a production deployment.

## WhatsApp
The client flow prepares a structured WhatsApp message containing the customer's selections, file name, material, dimensions, quantity, estimated weight/time, lead time and customer price. On browsers that support `navigator.share` with files, the original uploaded file is included in the device share sheet. Desktop WhatsApp web links cannot receive a file attachment automatically, so the page opens the complete message and asks the customer to attach the uploaded file manually.

The WhatsApp number is configured in `index.html` as `FORGEX_WHATSAPP`. Replace it with the official FORGEX business number before deployment.

## Deployment
The page is static and can be hosted on GitHub Pages, Netlify, Vercel static hosting, or normal web hosting without `localhost`.

For a production payment flow, use a backend for:
- live pricing
- secure file storage
- payment verification
- order IDs
- database records
- audit logs
