const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dataFile = path.join(__dirname, 'data.js');
const csvFile = path.resolve(args.find(arg => arg.startsWith('--file='))?.split('=')[1] || path.join(__dirname, 'new-products.csv'));
const incomingDir = path.resolve(args.find(arg => arg.startsWith('--images='))?.split('=')[1] || path.join(__dirname, 'incoming'));
const assetsDir = path.resolve(__dirname, '..', 'assets');
const dryRun = args.includes('--dry-run');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"' && quoted && text[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field !== '' || row.length) {
    row.push(field.trim());
    if (row.some(value => value !== '')) rows.push(row);
  }

  return rows;
}

function booleanValue(value, fallback = false) {
  if (value === undefined || value.trim() === '') return fallback;
  return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase());
}

function escapeJs(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' ');
}

if (!fs.existsSync(csvFile)) {
  console.error(`CSV not found: ${csvFile}`);
  process.exit(1);
}

const rows = parseCsv(fs.readFileSync(csvFile, 'utf8'));
if (rows.length < 2) {
  console.error('CSV must contain a header row and at least one product row.');
  process.exit(1);
}

const headers = rows[0].map(header => header.trim());
const required = ['id', 'name', 'category', 'categoryId', 'description', 'price', 'material', 'style', 'dimensions', 'image'];
const missingHeaders = required.filter(header => !headers.includes(header));
if (missingHeaders.length) {
  console.error(`Missing CSV columns: ${missingHeaders.join(', ')}`);
  process.exit(1);
}

const dataSource = fs.readFileSync(dataFile, 'utf8');
const existingIds = new Set([...dataSource.matchAll(/^\s*id:\s*'([^']+)'/gm)].map(match => match[1]));
const additions = [];
const copiedImages = [];

for (const values of rows.slice(1)) {
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  if (!row.id || !row.name) continue;
  if (existingIds.has(row.id)) {
    console.error(`Skipped duplicate product id: ${row.id}`);
    continue;
  }

  const price = Number(row.price);
  if (!Number.isFinite(price) || price < 0) {
    console.error(`Skipped ${row.id}: invalid price "${row.price}"`);
    continue;
  }

  const sourceImage = path.resolve(incomingDir, row.image);
  if (!fs.existsSync(sourceImage)) {
    console.error(`Skipped ${row.id}: image not found "${sourceImage}"`);
    continue;
  }

  const destinationName = `dejavu-${path.basename(row.image).replace(/^dejavu-/, '')}`;
  const destinationImage = path.join(assetsDir, destinationName);
  const relativeImage = `../assets/${destinationName}`;

  if (!dryRun) fs.copyFileSync(sourceImage, destinationImage);
  copiedImages.push(destinationName);
  existingIds.add(row.id);

  additions.push(`    {
      id: '${escapeJs(row.id)}', name: '${escapeJs(row.name)}', category: '${escapeJs(row.category)}', categoryId: '${escapeJs(row.categoryId)}',
      description: '${escapeJs(row.description)}',
      price: ${price}, material: '${escapeJs(row.material)}', style: '${escapeJs(row.style)}', dimensions: '${escapeJs(row.dimensions)}',
      image: '${relativeImage}', available: ${booleanValue(row.available, true)}, featured: ${booleanValue(row.featured)}, bestseller: ${booleanValue(row.bestseller)}, customizable: ${booleanValue(row.customizable)}
    }`);
}

if (!additions.length) {
  console.log('No valid new products to import.');
  process.exit(0);
}

if (!dryRun) {
  const insertionPoint = dataSource.indexOf('\n  ],\n  testimonials:');
  if (insertionPoint === -1) {
    console.error('Could not locate the products array in data.js.');
    process.exit(1);
  }

  const before = dataSource.slice(0, insertionPoint);
  const after = dataSource.slice(insertionPoint);
  const needsComma = /,\s*$/.test(before);
  const separator = needsComma ? '\n    ,' : ',';
  const updated = `${before}${separator}\n${additions.join(',\n')}${after}`;
  fs.writeFileSync(dataFile, updated, 'utf8');
}

console.log(`${dryRun ? 'Dry run:' : 'Imported'} ${additions.length} product(s).`);
console.log(`Images: ${copiedImages.join(', ')}`);
