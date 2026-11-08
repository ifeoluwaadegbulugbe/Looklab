// LookLab demo catalogue. Single source of truth for scripts/seed-catalog.mjs.
// Clothing only (tops, jackets, trousers/jeans, skirts): dresses failed safety screening and shoes
// aren't detected (docs/clothsy-notes.md). Every product is a demo item: no invented brands, prices or links.
// `file` is a local image under private/catalog/ (git-ignored), uploaded to the public `catalog` bucket.

export const CATEGORIES = [
  { slug: "tops", name: "Tops", sort_order: 1 },
  { slug: "jackets", name: "Jackets & coats", sort_order: 2 },
  { slug: "trousers", name: "Trousers & jeans", sort_order: 3 },
  { slug: "skirts", name: "Skirts", sort_order: 4 },
];

export const AESTHETICS = [
  { slug: "minimalist", name: "Minimalist", blurb: "Clean lines, quiet colours, nothing extra.", sort_order: 1 },
  { slug: "old-money", name: "Old Money", blurb: "Tailoring, heritage textures, understated polish.", sort_order: 2 },
  { slug: "streetwear", name: "Streetwear", blurb: "Relaxed fits, bold layers, off-duty energy.", sort_order: 3 },
  { slug: "y2k", name: "Y2K", blurb: "Low-rise, high-shine and a little bit extra.", sort_order: 4 },
  { slug: "clean-girl", name: "Clean Girl", blurb: "Sleek, neutral and effortlessly put together.", sort_order: 5 },
  { slug: "afro-inspired", name: "Afro-inspired", blurb: "Bold prints, rich colour and African craft.", sort_order: 6 },
  { slug: "preppy", name: "Preppy", blurb: "Pinstripes, pleats and collegiate details.", sort_order: 7 },
  { slug: "romantic", name: "Romantic", blurb: "Soft shapes, ruching and feminine details.", sort_order: 8 },
];

export const COLLECTIONS = [
  { slug: "old-money-edit", title: "The Old Money Edit", description: "Quiet luxury, tailored lines and rich textures.", sort_order: 1 },
  { slug: "streetwear-essentials", title: "Streetwear Essentials", description: "The relaxed pieces every fit is built on.", sort_order: 2 },
  { slug: "everyday-minimalist", title: "Everyday Minimalist", description: "Clean staples that go with everything.", sort_order: 3 },
  { slug: "y2k-revival", title: "Y2K Revival", description: "Shine, minis and early-2000s attitude.", sort_order: 4 },
  { slug: "weekend-fits", title: "Weekend Fits", description: "Easy pieces for brunch, errands and everything after.", sort_order: 5 },
  { slug: "afro-inspired-style", title: "Afro-inspired Style", description: "Colour, print and craft-led pieces.", sort_order: 6 },
];

export const PRODUCTS = [
  {
    slug: "navy-pinstripe-off-shoulder-top", title: "Navy pinstripe off-shoulder button top", category: "tops",
    section: "women", colour: "navy", file: "top.jpg",
    description: "Fold-over off-shoulder neckline, tortoiseshell buttons and a fitted, ruched waist.",
    aesthetics: ["preppy", "old-money", "romantic"], collections: ["old-money-edit"],
  },
  {
    slug: "burgundy-leather-cropped-bomber", title: "Burgundy leather cropped bomber jacket", category: "jackets",
    section: "women", colour: "burgundy", file: "jacket.jpg",
    description: "Cropped bomber with dramatic gathered sleeves and ribbed trims.",
    aesthetics: ["streetwear", "y2k"], collections: ["streetwear-essentials", "weekend-fits"],
  },
  {
    slug: "mid-blue-wide-leg-jeans", title: "Mid-blue wide-leg high-rise jeans", category: "trousers",
    section: "women", colour: "blue", file: "trousers.jpg",
    description: "High-rise, floor-grazing wide leg in a classic mid-blue wash.",
    aesthetics: ["minimalist", "streetwear", "clean-girl"], collections: ["everyday-minimalist", "weekend-fits"],
  },
  {
    slug: "black-faux-leather-mini-skirt", title: "Black faux-leather mini skirt", category: "skirts",
    section: "women", colour: "black", file: "skirt.jpg",
    description: "High-waisted mini with front darts and a soft sheen.",
    aesthetics: ["y2k", "minimalist"], collections: ["y2k-revival"],
  },

  // ---- Tops
  {
    slug: "black-mesh-football-jersey", title: "Black mesh oversized football jersey", category: "tops",
    section: "unisex", colour: "black", file: "black-mesh-football-jersey.jpg",
    description: "Airy mesh V-neck jersey with a bold varsity number and dropped shoulders.",
    aesthetics: ["streetwear", "y2k"], collections: ["streetwear-essentials", "y2k-revival"],
  },
  {
    slug: "navy-ribbed-henley-cami", title: "Navy ribbed henley cami", category: "tops",
    section: "women", colour: "navy", file: "navy-ribbed-henley-cami.jpg",
    description: "Fitted rib-knit cami with a buttoned notch neckline and skinny straps.",
    aesthetics: ["clean-girl", "minimalist"], collections: ["everyday-minimalist", "weekend-fits"],
    tryon_enabled: false, // failed Clothsy safety screening twice (Gate 2, 7 Nov)
  },
  {
    slug: "brown-cowl-halter-top", title: "Chocolate cowl halter top with gold collar", category: "tops",
    section: "women", colour: "brown", file: "brown-cowl-halter-top.jpg",
    description: "Liquid-drape cowl front held by a sculpted gold neck ring.",
    aesthetics: ["clean-girl", "romantic"], collections: [],
  },
  {
    slug: "cream-draped-applique-top", title: "Cream draped top with leaf appliqué", category: "tops",
    section: "women", colour: "cream", file: "cream-draped-applique-top.jpg",
    description: "Off-shoulder neckline, soft gathered drape and a raised leaf appliqué.",
    aesthetics: ["romantic", "old-money"], collections: ["old-money-edit"],
  },

  // ---- Trousers & jeans
  {
    slug: "dark-wash-wide-leg-jeans", title: "Dark-wash high-rise wide-leg jeans", category: "trousers",
    section: "women", colour: "blue", file: "dark-wash-wide-leg-jeans.jpg",
    description: "Classic five-pocket denim with a clean, straight wide leg.",
    aesthetics: ["minimalist", "old-money"], collections: ["everyday-minimalist", "old-money-edit"],
  },
  {
    slug: "washed-black-cargo-jeans", title: "Washed-black cargo jeans", category: "trousers",
    section: "unisex", colour: "black", file: "washed-black-cargo-jeans.jpg",
    description: "Relaxed denim cargos stacked with utility pockets.",
    aesthetics: ["streetwear", "y2k"], collections: ["streetwear-essentials", "y2k-revival"],
  },
  {
    slug: "light-wash-barrel-jeans", title: "Light-wash barrel-leg jeans", category: "trousers",
    section: "women", colour: "blue", file: "light-wash-barrel-jeans.jpg",
    description: "Faded mid-rise denim with a curved, roomy barrel leg.",
    aesthetics: ["streetwear", "minimalist"], collections: ["streetwear-essentials", "weekend-fits"],
  },
  {
    slug: "dark-wash-flare-jeans", title: "Dark-wash high-rise flare jeans", category: "trousers",
    section: "women", colour: "blue", file: "dark-wash-flare-jeans.jpg",
    description: "Sculpting high rise that kicks out into a dramatic flare.",
    aesthetics: ["y2k", "romantic"], collections: ["y2k-revival"],
  },

  // ---- Skirts
  {
    slug: "brown-plaid-bias-midi-skirt", title: "Brown plaid bias-cut midi skirt", category: "skirts",
    section: "women", colour: "brown", file: "brown-plaid-bias-midi-skirt.jpg",
    description: "Sheer-mesh plaid cut on the bias for a fluid slip-skirt swing.",
    aesthetics: ["old-money", "preppy"], collections: ["old-money-edit"],
  },
  {
    slug: "cream-polka-dot-midi-skirt", title: "Cream polka-dot midi skirt", category: "skirts",
    section: "women", colour: "cream", file: "cream-polka-dot-midi-skirt.jpg",
    description: "Satin-finish A-line midi scattered with classic black dots.",
    aesthetics: ["romantic", "preppy"], collections: ["weekend-fits"],
  },
  {
    slug: "brown-tiered-ruffle-maxi-skirt", title: "Brown tiered ruffle maxi skirt", category: "skirts",
    section: "women", colour: "brown", file: "brown-tiered-ruffle-maxi-skirt.jpg",
    description: "Ruched yoke, frilled tiers and a cream ribbon tie at the hip.",
    aesthetics: ["romantic"], collections: [],
  },
  {
    slug: "brown-lace-ruffle-mini-skirt", title: "Brown lace ruffle mini skirt", category: "skirts",
    section: "women", colour: "brown", file: "brown-lace-ruffle-mini-skirt.jpg",
    description: "Two flouncy layers of floral lace on an easy elastic waist.",
    aesthetics: ["y2k", "romantic"], collections: ["y2k-revival"],
  },
  {
    slug: "black-draped-buckle-mini-skirt", title: "Black draped mini skirt with gold buckle", category: "skirts",
    section: "women", colour: "black", file: "black-draped-buckle-mini-skirt.jpg",
    description: "Ruched wrap drape gathered through an organic gold buckle.",
    aesthetics: ["clean-girl", "minimalist"], collections: ["everyday-minimalist"],
  },
  {
    slug: "brown-faux-leather-wrap-mini-skirt", title: "Tan faux-leather wrap mini skirt", category: "skirts",
    section: "women", colour: "brown", file: "brown-faux-leather-wrap-mini-skirt.jpg",
    description: "Asymmetric wrap front twisted through a gold knot.",
    aesthetics: ["y2k", "old-money"], collections: ["y2k-revival"],
  },
  {
    slug: "brown-plaid-asymmetric-midi-skirt", title: "Brown plaid asymmetric draped midi skirt", category: "skirts",
    section: "women", colour: "brown", file: "brown-plaid-asymmetric-midi-skirt.jpg",
    description: "Heritage check with a cascading drape and handkerchief hem.",
    aesthetics: ["old-money", "preppy"], collections: ["old-money-edit"],
  },
  {
    slug: "burgundy-satin-draped-maxi-skirt", title: "Burgundy satin draped maxi skirt", category: "skirts",
    section: "women", colour: "burgundy", file: "burgundy-satin-draped-maxi-skirt.jpg",
    description: "Liquid satin with a cascading ruffle and gold brooch detail.",
    aesthetics: ["romantic", "old-money"], collections: [],
  },

  // ---- Jackets & coats
  {
    slug: "burgundy-leather-belted-cuff-jacket", title: "Burgundy leather jacket with belted cuffs", category: "jackets",
    section: "women", colour: "burgundy", file: "burgundy-leather-belted-cuff-jacket.jpg",
    description: "Oversized lapels, layered front and buckled cuffs in rich oxblood.",
    aesthetics: ["old-money"], collections: ["old-money-edit"],
  },
  {
    slug: "chocolate-leather-belted-jacket", title: "Chocolate leather belted jacket", category: "jackets",
    section: "women", colour: "brown", file: "chocolate-leather-belted-jacket.jpg",
    description: "Funnel collar, cinched belt and softly rounded sleeves.",
    aesthetics: ["old-money", "minimalist"], collections: ["old-money-edit", "everyday-minimalist"],
  },
  {
    slug: "black-cropped-leather-jacket", title: "Black cropped leather jacket", category: "jackets",
    section: "unisex", colour: "black", file: "black-cropped-leather-jacket.jpg",
    description: "Boxy cropped zip jacket with a point collar and seamed sleeves.",
    aesthetics: ["streetwear", "y2k"], collections: ["streetwear-essentials"],
  },
  {
    slug: "burgundy-faux-leather-belted-bomber", title: "Burgundy faux-leather belted bomber", category: "jackets",
    section: "women", colour: "burgundy", file: "burgundy-faux-leather-belted-bomber.jpg",
    description: "Relaxed collared bomber with a buckled hem.",
    aesthetics: ["streetwear", "minimalist"], collections: ["streetwear-essentials", "weekend-fits"],
  },

  // ---- Afro-inspired
  {
    slug: "green-mudcloth-wide-leg-culottes", title: "Green mudcloth-print wide-leg culottes", category: "trousers",
    section: "women", colour: "green", file: "green-mudcloth-wide-leg-culottes.jpg",
    description: "Flowing wide legs in a bold mudcloth-inspired print, finished with a tie waist.",
    aesthetics: ["afro-inspired", "romantic"], collections: ["afro-inspired-style", "weekend-fits"],
  },
  {
    slug: "indigo-tie-dye-corset-top", title: "Indigo tie-dye corset top with balloon sleeves", category: "tops",
    section: "women", colour: "navy", file: "indigo-tie-dye-corset-top.jpg",
    description: "Adire-style indigo dye, a structured corset waist and dramatic balloon sleeves.",
    aesthetics: ["afro-inspired", "romantic"], collections: ["afro-inspired-style"],
  },
  {
    slug: "rust-print-tiered-ruffle-midi-skirt", title: "Rust print tiered ruffle midi skirt", category: "skirts",
    section: "women", colour: "red", file: "rust-print-tiered-ruffle-midi-skirt.jpg",
    description: "Layer-on-layer ruffles in a rich rust and sage print with a tie waist.",
    aesthetics: ["afro-inspired", "romantic"], collections: ["afro-inspired-style"],
  },
  {
    slug: "mustard-mudcloth-wrap-peplum-top", title: "Mustard mudcloth-print wrap peplum top", category: "tops",
    section: "women", colour: "yellow", file: "mustard-mudcloth-wrap-peplum-top.jpg",
    description: "Black and mustard mudcloth print, an asymmetric wrap front and a gold statement button.",
    aesthetics: ["afro-inspired", "old-money"], collections: ["afro-inspired-style"],
  },
];
