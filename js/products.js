/**
 * DRIFTLINE — Product catalogue & image registry
 *
 * IMAGES is the single list of photography used across the whole site.
 * Swap any photo by changing its Unsplash ID here; every page picks it up.
 * Unsplash IDs are the part after "photo-" in an images.unsplash.com URL.
 */

/* ==========================================================================
   1. Image registry
   ========================================================================== */
export const IMAGES = {
  /* --- Shoes --- */
  voltRunner: '1606107557195-0e29a4b5b4aa',
  crimsonKnit: '1542291026-7eec264c27ff',
  courtClassic: '1600269452121-4f2416e55c28',
  desertForce: '1549298916-b41d501d3772',
  heritageHigh: '1552346154-21d32810aba3',
  heritageStreet: '1516478177764-9fe5bd7e9717',
  sunsetAir: '1514989940723-e8e51635b782',
  pastelDrift: '1595950653106-6c9ebd614d3a',
  oliveTrail: '1539185441755-769473a23570',
  canvasRed: '1607522370275-f14206abe5d3',
  canvasSand: '1556048219-bb6978360b84',
  chunkyRunner: '1560769629-975ec94e6a86',
  greyStreet: '1460353581641-37baddab0fa2',
  floatingBlack: '1491553895911-0055eca6402d',
  whiteRunner: '1600185365483-26d7a4cc7519',
  pinkRunner: '1551107696-a4b0c5a0d9a2',
  blushRs: '1608667508764-33cf0726b13a',
  blueProto: '1520256862855-398228c41684',
  midCourt: '1597045566677-8cf032ed6634',
  sneakersStreet: '1556906781-9a412961c28c',

  /* --- Clothing --- */
  hoodieFog: '1556821840-3a63f95609a7',
  teeWhite: '1521572163474-6864f9cf17ab',
  teeWhiteHanger: '1581655353564-df123a1eb820',
  teeWhiteFlat: '1529374255404-311a2a4f1fd9',
  teePeace: '1503341504253-dff4815485f1',
  teeOriginal: '1576566588028-4147f3842f27',
  teeBlackHanger: '1618354691373-d851c5c3a990',
  jacketLeather: '1551028719-00167b16eac5',
  bomberRust: '1591047139829-d91aecb6caea',
  trousersNight: '1624378439575-d8705ad7ae80',
  chinosSand: '1473966968600-fa801b869a1a',
  denimTrucker: '1611312449408-fcece27cdbb7',
  crewCloud: '1620799140408-edc6dcb6d633',
  crewOrange: '1578587018452-892bacefd3f2',
  joggersBlush: '1594633312681-425c7b97ccd1',

  /* --- Accessories --- */
  capWashed: '1521369909029-2afed882baee',
  capChalk: '1588850561407-ed78c282e89b',
  capSun: '1575428652377-a2d80e2277fc',
  packCommuter: '1553062407-98eeb64c6a62',
  packSaddle: '1622560480605-d83c853bc5c3',
  bagSand: '1612902456551-333ac5afa26e',
  socksLips: '1586350977771-b3b0abd50c82',
  socksPattern: '1582966772680-860e372bb558',
  shadesWayfarer: '1572635196237-14b3f281503f',
  shadesRound: '1511499767150-a48a237f0083',
  watchField: '1524592094714-0f0654e20314',
  watchMidnight: '1434056886845-dac89ffe9b56',
  wallet: '1627123424574-724758594e93',

  /* --- Editorial / lifestyle --- */
  lookTeal: '1509631179647-0177331693ae',
  lookYellow: '1515886657613-9f3515b0c78f',
  lookRed: '1529139574466-a303027c1d8b',
  lookCity: '1483985988355-763728e1935b',
  lookJacket: '1617114919297-3c8ddb01f599',
  lookBlackTee: '1622519407650-3df9883f76a5',
  lookFlatlay: '1544441893-675973e31985',
  lookOrange: '1578587018452-892bacefd3f2',
  rackJackets: '1495121605193-b116b5b9c5fe',
  rackBlack: '1576871337622-98d48d1cf531',
  rackStudio: '1490481651871-ab68de25d43d',
  foldedTees: '1562157873-818bc0726f68',
  hangersGreen: '1523381210434-271e8be1f52b',
};

/**
 * Build an Unsplash CDN URL.
 * @param {string|object} image  key from IMAGES, or { key, zoom, x, y } for a detail crop
 * @param {number} w             width in px
 * @param {number} [h]           height in px (crops to fill when given)
 */
export function imageUrl(image, w = 800, h) {
  const { key, zoom, x = 0.5, y = 0.5 } = typeof image === 'string' ? { key: image } : image;
  const id = IMAGES[key] || key; // allow raw IDs too
  const params = new URLSearchParams({ w: String(w), q: '75', auto: 'format' });
  if (h) {
    params.set('h', String(h));
    params.set('fit', 'crop');
  }
  if (zoom && h) {
    params.set('crop', 'focalpoint');
    params.set('fp-x', String(x));
    params.set('fp-y', String(y));
    params.set('fp-z', String(zoom));
  }
  return `https://images.unsplash.com/photo-${id}?${params.toString()}`;
}

/** Responsive srcset for a given aspect ratio (h / w). */
export function imageSrcset(image, ratio, widths = [400, 700, 1000, 1400]) {
  return widths
    .map((w) => `${imageUrl(image, w, ratio ? Math.round(w * ratio) : undefined)} ${w}w`)
    .join(', ');
}

/** Tiny blurred placeholder for blur-up loading. */
export const imageLqip = (image, ratio = 1.25) => imageUrl(image, 24, Math.round(24 * ratio));

/* ==========================================================================
   2. Option sets
   ========================================================================== */
export const COLORS = {
  Volt: '#c6ff3d',
  Black: '#111112',
  White: '#f3f2ee',
  Crimson: '#b3122e',
  Tan: '#b8834a',
  Bone: '#e6dccb',
  Grey: '#9a9a9a',
  Orange: '#f07a1a',
  Pastel: '#c9c3f2',
  Blush: '#f2b8b0',
  Olive: '#6f6d45',
  Red: '#d0202e',
  Sand: '#d8c7a3',
  Navy: '#1f2a44',
  Rust: '#b5562a',
  Indigo: '#2e3c63',
  Brown: '#6b4128',
  Gold: '#c9a54b',
  Silver: '#c4c6c8',
};

export const SIZES = {
  shoes: ['39', '40', '41', '42', '43', '44', '45', '46'],
  apparel: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  one: ['One Size'],
};

export const CATEGORIES = [
  { id: 'shoes', label: 'Shoes', image: 'sneakersStreet', blurb: 'Runners, courts & hi-tops' },
  { id: 'clothing', label: 'Clothing', image: 'lookOrange', blurb: 'Hoodies, tees, jackets & trousers' },
  { id: 'accessories', label: 'Accessories', image: 'watchField', blurb: 'Caps, bags, socks, shades & watches' },
];

/* ==========================================================================
   3. Products
   price: in CONFIG.currency  · rating: 0–5 · popularity: higher = more popular
   images: first is the card/hero image, second is shown on card hover
   ========================================================================== */
export const PRODUCTS = [
  /* ------------------------------ SHOES ------------------------------ */
  {
    id: 'dl-001',
    name: 'Volt Runner 01',
    category: 'shoes',
    type: 'Sneakers',
    price: 145000,
    colors: ['Volt', 'Black'],
    sizes: SIZES.shoes,
    images: ['voltRunner', { key: 'voltRunner', zoom: 2.2, x: 0.6, y: 0.55 }, 'sneakersStreet'],
    description:
      'Our loudest runner yet. A breathable mesh upper over a sculpted foam midsole that rebounds every step — tuned for city miles and late-night errands alike.',
    tags: ['running', 'mesh', 'lightweight', 'drop'],
    isNew: true,
    featured: true,
    rating: 4.9,
    reviews: 214,
    popularity: 98,
    createdAt: '2026-11-01',
  },
  {
    id: 'dl-002',
    name: 'Crimson Knit Racer',
    category: 'shoes',
    type: 'Sneakers',
    price: 128000,
    colors: ['Crimson', 'Black'],
    sizes: SIZES.shoes,
    images: ['crimsonKnit', { key: 'crimsonKnit', zoom: 2, x: 0.45, y: 0.6 }, 'greyStreet'],
    description:
      'A sock-like knit upper that hugs the foot, paired with a flexible grooved outsole. Ships in a colour you can hear from across the street.',
    tags: ['running', 'knit', 'flexible'],
    isNew: false,
    featured: true,
    rating: 4.7,
    reviews: 186,
    popularity: 90,
    createdAt: '2026-06-14',
  },
  {
    id: 'dl-003',
    name: 'Court Classic Low',
    category: 'shoes',
    type: 'Sneakers',
    price: 98000,
    colors: ['White', 'Black'],
    sizes: SIZES.shoes,
    images: ['courtClassic', { key: 'courtClassic', zoom: 2, x: 0.5, y: 0.55 }, 'midCourt'],
    description:
      'The everyday court silhouette, rebuilt with tumbled leather and a cupsole that softens with wear. Clean enough for anything, tough enough for everything.',
    tags: ['leather', 'court', 'everyday'],
    isNew: false,
    featured: false,
    rating: 4.8,
    reviews: 402,
    popularity: 96,
    createdAt: '2025-11-20',
  },
  {
    id: 'dl-004',
    name: 'Desert Force Low',
    category: 'shoes',
    type: 'Sneakers',
    price: 112000,
    colors: ['Tan', 'Bone'],
    sizes: SIZES.shoes,
    images: ['desertForce', { key: 'desertForce', zoom: 2, x: 0.5, y: 0.5 }, 'lookFlatlay'],
    description:
      'Wheat-toned nubuck, gum-tinted sole, padded collar. A warm take on a cold classic that pairs with everything from cargos to raw denim.',
    tags: ['nubuck', 'earth tones', 'court'],
    isNew: false,
    featured: true,
    rating: 4.6,
    reviews: 129,
    popularity: 78,
    createdAt: '2026-02-10',
  },
  {
    id: 'dl-005',
    name: "Heritage High '85",
    category: 'shoes',
    type: 'Sneakers',
    price: 175000,
    colors: ['Red', 'Black', 'White'],
    sizes: SIZES.shoes,
    images: ['heritageHigh', 'heritageStreet', 'sneakersStreet'],
    description:
      'The hi-top that started it all, re-cut in premium full-grain leather with a cushioned insole for all-day wear. Numbered pairs, limited run.',
    tags: ['hi-top', 'leather', 'limited'],
    isNew: true,
    featured: true,
    rating: 5,
    reviews: 88,
    popularity: 99,
    createdAt: '2026-11-15',
  },
  {
    id: 'dl-006',
    name: 'Sunset Air 90',
    category: 'shoes',
    type: 'Sneakers',
    price: 135000,
    colors: ['Orange', 'White'],
    sizes: SIZES.shoes,
    images: ['sunsetAir', { key: 'sunsetAir', zoom: 1.8, x: 0.5, y: 0.45 }],
    description:
      'Layered suede and mesh in a golden-hour colourway, sat on a visible air unit for responsive cushioning. Built to be seen.',
    tags: ['air', 'suede', 'retro'],
    isNew: false,
    featured: false,
    rating: 4.7,
    reviews: 156,
    popularity: 84,
    createdAt: '2026-04-02',
  },
  {
    id: 'dl-007',
    name: 'Pastel Drift',
    category: 'shoes',
    type: 'Sneakers',
    price: 118000,
    colors: ['Pastel', 'White'],
    sizes: SIZES.shoes,
    images: ['pastelDrift', { key: 'pastelDrift', zoom: 2, x: 0.5, y: 0.45 }, 'blushRs'],
    description:
      'Stacked panels in soft lilac, mint and peach on a platform midsole. Easy on the eye, easier on the feet.',
    tags: ['platform', 'pastel', 'layered'],
    isNew: true,
    featured: true,
    rating: 4.5,
    reviews: 64,
    popularity: 80,
    createdAt: '2026-10-20',
  },
  {
    id: 'dl-008',
    name: 'Olive Trail 247',
    category: 'shoes',
    type: 'Sneakers',
    price: 105000,
    colors: ['Olive', 'Black'],
    sizes: SIZES.shoes,
    images: ['oliveTrail', { key: 'oliveTrail', zoom: 2, x: 0.5, y: 0.6 }],
    description:
      'A neoprene-lined sock fit with a lugged outsole. Made for uneven pavements, wet weekends and spontaneous detours.',
    tags: ['trail', 'neoprene', 'grip'],
    isNew: false,
    featured: false,
    rating: 4.4,
    reviews: 97,
    popularity: 66,
    createdAt: '2025-09-12',
  },
  {
    id: 'dl-009',
    name: 'Canvas Hi-Top',
    category: 'shoes',
    type: 'Sneakers',
    price: 58000,
    colors: ['Red', 'Sand'],
    sizes: SIZES.shoes,
    images: ['canvasRed', 'canvasSand'],
    description:
      'Heavyweight canvas, vulcanised rubber, contrast stitching. The forever shoe — gets better the more you beat it up.',
    tags: ['canvas', 'vulcanised', 'classic'],
    isNew: false,
    featured: false,
    rating: 4.6,
    reviews: 312,
    popularity: 88,
    createdAt: '2025-07-01',
  },

  /* ----------------------------- CLOTHING ---------------------------- */
  {
    id: 'dl-010',
    name: 'Fog Heavyweight Hoodie',
    category: 'clothing',
    type: 'Hoodies',
    price: 65000,
    colors: ['Grey', 'Black'],
    sizes: SIZES.apparel,
    images: ['hoodieFog', { key: 'hoodieFog', zoom: 1.8, x: 0.5, y: 0.35 }, 'rackBlack'],
    description:
      '480gsm brushed-back fleece, dropped shoulders and a double-layer hood. Garment-dyed for a lived-in tone from day one.',
    tags: ['fleece', 'heavyweight', 'oversized'],
    isNew: true,
    featured: true,
    rating: 4.9,
    reviews: 341,
    popularity: 97,
    createdAt: '2026-10-28',
  },
  {
    id: 'dl-011',
    name: 'Essential Tee — White',
    category: 'clothing',
    type: 'Tees',
    price: 22000,
    colors: ['White', 'Black'],
    sizes: SIZES.apparel,
    images: ['teeWhite', 'teeWhiteHanger', 'teeWhiteFlat'],
    description:
      'Our signature boxy tee in 240gsm combed cotton. Ribbed collar that holds its shape, wash after wash after wash.',
    tags: ['cotton', 'boxy', 'essential'],
    isNew: false,
    featured: false,
    rating: 4.8,
    reviews: 690,
    popularity: 95,
    createdAt: '2025-05-05',
  },
  {
    id: 'dl-012',
    name: 'Peace Sign Graphic Tee',
    category: 'clothing',
    type: 'Tees',
    price: 28000,
    colors: ['Black'],
    sizes: SIZES.apparel,
    images: ['teePeace', { key: 'teePeace', zoom: 2, x: 0.5, y: 0.4 }, 'teeBlackHanger'],
    description:
      'Screen-printed skeleton peace hand on a washed black tee. Soft-hand ink, relaxed fit, zero chill.',
    tags: ['graphic', 'print', 'washed'],
    isNew: false,
    featured: false,
    rating: 4.6,
    reviews: 143,
    popularity: 74,
    createdAt: '2026-03-18',
  },
  {
    id: 'dl-013',
    name: 'Rider Leather Jacket',
    category: 'clothing',
    type: 'Jackets',
    price: 185000,
    colors: ['Black'],
    sizes: SIZES.apparel,
    images: ['jacketLeather', { key: 'jacketLeather', zoom: 2, x: 0.5, y: 0.4 }, 'lookJacket'],
    description:
      'Buttery lambskin, asymmetric zip, quilted lining. A forever piece built to age with you — and look better for it.',
    tags: ['leather', 'outerwear', 'premium'],
    isNew: false,
    featured: true,
    rating: 4.9,
    reviews: 77,
    popularity: 86,
    createdAt: '2025-12-01',
  },
  {
    id: 'dl-014',
    name: 'Rust Satin Bomber',
    category: 'clothing',
    type: 'Jackets',
    price: 89000,
    colors: ['Rust', 'Black'],
    sizes: SIZES.apparel,
    images: ['bomberRust', { key: 'bomberRust', zoom: 1.9, x: 0.5, y: 0.45 }, 'rackJackets'],
    description:
      'Lightweight satin shell, ribbed cuffs and a utility sleeve pocket. The between-seasons jacket you will reach for first.',
    tags: ['bomber', 'satin', 'lightweight'],
    isNew: true,
    featured: false,
    rating: 4.7,
    reviews: 58,
    popularity: 72,
    createdAt: '2026-11-08',
  },
  {
    id: 'dl-015',
    name: 'Night Cargo Trousers',
    category: 'clothing',
    type: 'Trousers',
    price: 48000,
    colors: ['Navy', 'Black'],
    sizes: SIZES.apparel,
    images: ['trousersNight', { key: 'trousersNight', zoom: 1.8, x: 0.5, y: 0.4 }],
    description:
      'Ripstop cotton with articulated knees, six pockets and an adjustable hem. Utility without the bulk.',
    tags: ['cargo', 'ripstop', 'utility'],
    isNew: false,
    featured: false,
    rating: 4.5,
    reviews: 121,
    popularity: 70,
    createdAt: '2026-01-22',
  },
  {
    id: 'dl-016',
    name: 'Sand Tapered Chinos',
    category: 'clothing',
    type: 'Trousers',
    price: 42000,
    colors: ['Sand', 'Olive'],
    sizes: SIZES.apparel,
    images: ['chinosSand', { key: 'chinosSand', zoom: 1.8, x: 0.5, y: 0.6 }],
    description:
      'Stretch twill chinos with a tapered leg and elastic cuff option. Smart enough for dinner, easy enough for the bus.',
    tags: ['chino', 'stretch', 'tapered'],
    isNew: false,
    featured: false,
    rating: 4.4,
    reviews: 89,
    popularity: 60,
    createdAt: '2025-08-30',
  },
  {
    id: 'dl-017',
    name: 'Raw Denim Trucker',
    category: 'clothing',
    type: 'Jackets',
    price: 76000,
    colors: ['Indigo'],
    sizes: SIZES.apparel,
    images: ['denimTrucker', { key: 'denimTrucker', zoom: 2, x: 0.5, y: 0.3 }],
    description:
      '14oz selvedge denim with a corduroy collar. Unwashed, so it fades to the exact shape of your life.',
    tags: ['denim', 'selvedge', 'outerwear'],
    isNew: false,
    featured: false,
    rating: 4.8,
    reviews: 102,
    popularity: 76,
    createdAt: '2026-05-11',
  },
  {
    id: 'dl-018',
    name: 'Cloud Crewneck',
    category: 'clothing',
    type: 'Hoodies',
    price: 45000,
    colors: ['White', 'Orange'],
    sizes: SIZES.apparel,
    images: ['crewCloud', 'crewOrange'],
    description:
      'Loopback French terry crewneck in a relaxed cut. Light enough for Lagos evenings, warm enough for London mornings.',
    tags: ['crewneck', 'french terry', 'relaxed'],
    isNew: true,
    featured: false,
    rating: 4.6,
    reviews: 47,
    popularity: 68,
    createdAt: '2026-11-12',
  },

  /* ---------------------------- ACCESSORIES -------------------------- */
  {
    id: 'dl-019',
    name: 'Washed Dad Cap',
    category: 'accessories',
    type: 'Caps',
    price: 15000,
    colors: ['Grey', 'Black'],
    sizes: SIZES.one,
    images: ['capWashed', { key: 'capWashed', zoom: 1.8, x: 0.55, y: 0.5 }],
    description:
      'Unstructured six-panel cap in stone-washed cotton twill with an antique brass buckle. Broken in before you are.',
    tags: ['cap', 'washed', 'adjustable'],
    isNew: false,
    featured: false,
    rating: 4.7,
    reviews: 228,
    popularity: 82,
    createdAt: '2025-06-18',
  },
  {
    id: 'dl-020',
    name: 'Trucker Cap — Chalk',
    category: 'accessories',
    type: 'Caps',
    price: 14000,
    colors: ['White', 'Volt'],
    sizes: SIZES.one,
    images: ['capChalk', 'capSun'],
    description:
      'Foam-front trucker with breathable mesh back and snapback closure. The summer staple, in our cleanest colourway.',
    tags: ['trucker', 'snapback', 'mesh'],
    isNew: true,
    featured: false,
    rating: 4.5,
    reviews: 41,
    popularity: 62,
    createdAt: '2026-10-30',
  },
  {
    id: 'dl-021',
    name: 'Commuter Backpack 22L',
    category: 'accessories',
    type: 'Bags',
    price: 55000,
    colors: ['Navy', 'Black'],
    sizes: SIZES.one,
    images: ['packCommuter', { key: 'packCommuter', zoom: 1.8, x: 0.5, y: 0.5 }],
    description:
      'Water-resistant shell, padded 16" laptop sleeve and a hidden back pocket for your passport. Your daily carry, sorted.',
    tags: ['backpack', 'laptop', 'water-resistant'],
    isNew: false,
    featured: true,
    rating: 4.8,
    reviews: 167,
    popularity: 85,
    createdAt: '2026-01-05',
  },
  {
    id: 'dl-022',
    name: 'Saddle Leather Pack',
    category: 'accessories',
    type: 'Bags',
    price: 95000,
    colors: ['Tan', 'Brown'],
    sizes: SIZES.one,
    images: ['packSaddle', { key: 'packSaddle', zoom: 1.8, x: 0.5, y: 0.45 }, 'bagSand'],
    description:
      'Full-grain leather backpack hand-finished in Lagos. Develops a rich patina with every commute.',
    tags: ['leather', 'handmade', 'backpack'],
    isNew: false,
    featured: false,
    rating: 4.9,
    reviews: 53,
    popularity: 71,
    createdAt: '2025-10-14',
  },
  {
    id: 'dl-023',
    name: 'Lip Service Socks (3-Pack)',
    category: 'accessories',
    type: 'Socks',
    price: 6500,
    colors: ['White', 'Black'],
    sizes: SIZES.one,
    images: ['socksLips', 'socksPattern'],
    description:
      'Combed cotton crew socks with a cushioned sole and loud jacquard prints. Three pairs, zero boring days.',
    tags: ['socks', 'cotton', 'jacquard'],
    isNew: false,
    featured: false,
    rating: 4.6,
    reviews: 380,
    popularity: 79,
    createdAt: '2025-04-09',
  },
  {
    id: 'dl-024',
    name: 'Wayfarer Shades',
    category: 'accessories',
    type: 'Sunglasses',
    price: 32000,
    colors: ['Black'],
    sizes: SIZES.one,
    images: ['shadesWayfarer', { key: 'shadesWayfarer', zoom: 1.8, x: 0.5, y: 0.5 }],
    description:
      'Acetate frames with polarised UV400 lenses. Sharp lines, deep tint, built for harsh Harmattan sun.',
    tags: ['sunglasses', 'polarised', 'acetate'],
    isNew: false,
    featured: false,
    rating: 4.7,
    reviews: 132,
    popularity: 75,
    createdAt: '2025-12-20',
  },
  {
    id: 'dl-025',
    name: 'Round Gold Shades',
    category: 'accessories',
    type: 'Sunglasses',
    price: 35000,
    colors: ['Gold'],
    sizes: SIZES.one,
    images: ['shadesRound', { key: 'shadesRound', zoom: 1.8, x: 0.5, y: 0.5 }],
    description:
      'Featherlight metal round frames with green-tinted mineral lenses. Retro shape, modern weight.',
    tags: ['sunglasses', 'metal', 'retro'],
    isNew: true,
    featured: false,
    rating: 4.5,
    reviews: 36,
    popularity: 58,
    createdAt: '2026-11-04',
  },
  {
    id: 'dl-026',
    name: 'Minimal Field Watch',
    category: 'accessories',
    type: 'Watches',
    price: 120000,
    colors: ['Brown', 'Silver'],
    sizes: SIZES.one,
    images: ['watchField', { key: 'watchField', zoom: 2, x: 0.5, y: 0.5 }],
    description:
      '38mm brushed steel case, sapphire crystal and a quick-release Italian leather strap. Tells time. Tells stories.',
    tags: ['watch', 'sapphire', 'leather'],
    isNew: false,
    featured: true,
    rating: 4.8,
    reviews: 94,
    popularity: 81,
    createdAt: '2026-02-26',
  },
  {
    id: 'dl-027',
    name: 'Midnight Chrono',
    category: 'accessories',
    type: 'Watches',
    price: 145000,
    colors: ['Black'],
    sizes: SIZES.one,
    images: ['watchMidnight', { key: 'watchMidnight', zoom: 1.8, x: 0.5, y: 0.5 }, 'wallet'],
    description:
      'Matte black dial with volt seconds hand, 100m water resistance and a mesh steel bracelet. Night mode, always on.',
    tags: ['watch', 'chronograph', 'steel'],
    isNew: false,
    featured: false,
    rating: 4.7,
    reviews: 61,
    popularity: 69,
    createdAt: '2026-07-07',
  },
];

/* ==========================================================================
   4. Query helpers
   ========================================================================== */
export const getProductById = (id) => PRODUCTS.find((p) => p.id === id) || null;

export const getProductsByCategory = (category) =>
  PRODUCTS.filter((p) => p.category === category);

export const getFeaturedProducts = () => PRODUCTS.filter((p) => p.featured);

/** Related = same category first, then shared tags; never the product itself. */
export function getRelatedProducts(product, limit = 4) {
  return PRODUCTS.filter((p) => p.id !== product.id)
    .map((p) => ({
      p,
      score:
        (p.category === product.category ? 10 : 0) +
        p.tags.filter((t) => product.tags.includes(t)).length * 3 +
        p.popularity / 100,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p);
}

export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
