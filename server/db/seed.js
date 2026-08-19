const bcrypt = require("bcryptjs");
const db = require("./index");

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const categories = [
  ["Fresh Fruits", "🍎"],
  ["Fresh Vegetables", "🥕"],
  ["Chicken & Poultry", "🍗"],
  ["Beef & Mutton", "🥩"],
  ["Fish & Seafood", "🐟"],
  ["Bakery", "🍞"],
  ["Dairy & Eggs", "🥛"],
  ["Rice & Pulses", "🌾"],
  ["Cooking Oil & Ghee", "🫙"],
  ["Spices & Masala", "🌶️"],
  ["Flour & Baking", "🥖"],
  ["Breakfast & Cereals", "🥣"],
  ["Tea & Coffee", "☕"],
  ["Beverages & Juices", "🧃"],
  ["Snacks & Confectionery", "🍪"],
  ["Frozen Foods", "🧊"],
  ["Pickles & Sauces", "🥫"],
  ["Household & Cleaning", "🧼"],
  ["Personal Care", "🧴"],
  ["Baby Care", "🍼"],
  ["Pet Care", "🐾"],
  ["Stationery & Home", "📎"],
];

const productBank = {
  "Fresh Fruits": [
    ["Red Apples", 320, "1kg"],
    ["Bananas", 140, "dozen"],
    ["Seedless Grapes", 450, "500g"],
    ["Mangoes (Chaunsa)", 280, "1kg"],
    ["Oranges", 220, "1kg"],
  ],
  "Fresh Vegetables": [
    ["Potatoes", 90, "1kg"],
    ["Onions", 110, "1kg"],
    ["Tomatoes", 130, "1kg"],
    ["Spinach", 60, "bunch"],
    ["Green Chillies", 80, "250g"],
  ],
  "Chicken & Poultry": [
    ["Whole Chicken (Skinless)", 480, "1kg"],
    ["Chicken Breast Boneless", 620, "1kg"],
    ["Chicken Mince (Qeema)", 560, "1kg"],
  ],
  "Beef & Mutton": [
    ["Beef Boneless", 980, "1kg"],
    ["Mutton Curry Cut", 1850, "1kg"],
    ["Beef Mince (Qeema)", 940, "1kg"],
  ],
  "Fish & Seafood": [
    ["Rahu Fish", 620, "1kg"],
    ["Prawns Medium", 1450, "500g"],
  ],
  "Bakery": [
    ["White Sandwich Bread", 150, "1 loaf"],
    ["Brown Bread", 170, "1 loaf"],
    ["Butter Croissant", 90, "pack of 4"],
  ],
  "Dairy & Eggs": [
    ["Fresh Milk", 260, "1.5L"],
    ["Farm Eggs", 320, "dozen"],
    ["Yogurt (Dahi)", 180, "1kg"],
    ["Cheddar Cheese Slices", 540, "200g"],
  ],
  "Rice & Pulses": [
    ["Basmati Rice Super Kernel", 620, "5kg"],
    ["Masoor Daal", 320, "1kg"],
    ["Chana Daal", 280, "1kg"],
  ],
  "Cooking Oil & Ghee": [
    ["Sunflower Cooking Oil", 950, "5L"],
    ["Banaspati Ghee", 780, "2.5kg"],
    ["Extra Virgin Olive Oil", 1650, "1L"],
  ],
  "Spices & Masala": [
    ["Red Chilli Powder", 220, "200g"],
    ["Turmeric Powder", 160, "200g"],
    ["Chicken Karahi Masala", 190, "100g"],
  ],
  "Flour & Baking": [
    ["Chakki Atta", 780, "10kg"],
    ["All-Purpose Flour (Maida)", 210, "2kg"],
    ["Baking Powder", 90, "100g"],
  ],
  "Breakfast & Cereals": [
    ["Corn Flakes", 590, "500g"],
    ["Instant Oats", 480, "1kg"],
    ["Honey", 650, "500g"],
  ],
  "Tea & Coffee": [
    ["Premium Black Tea", 680, "950g"],
    ["Instant Coffee", 890, "200g"],
  ],
  "Beverages & Juices": [
    ["Cola 1.5L", 180, "1.5L"],
    ["Mixed Fruit Juice", 220, "1L"],
    ["Mineral Water (6-pack)", 360, "6x1.5L"],
  ],
  "Snacks & Confectionery": [
    ["Potato Chips", 100, "family pack"],
    ["Chocolate Cookies", 220, "300g"],
    ["Milk Chocolate Bar", 150, "100g"],
  ],
  "Frozen Foods": [
    ["Frozen Chicken Nuggets", 690, "800g"],
    ["Frozen Mixed Vegetables", 340, "1kg"],
    ["Frozen French Fries", 420, "1kg"],
  ],
  "Pickles & Sauces": [
    ["Mixed Pickle", 260, "1kg"],
    ["Tomato Ketchup", 280, "800g"],
    ["Soy Sauce", 320, "300ml"],
  ],
  "Household & Cleaning": [
    ["Dish Wash Liquid", 250, "750ml"],
    ["Laundry Detergent", 720, "3kg"],
    ["Toilet Cleaner", 280, "500ml"],
    ["Air Freshener", 350, "300ml"],
  ],
  "Personal Care": [
    ["Herbal Shampoo", 480, "400ml"],
    ["Moisturizing Soap (3-pack)", 260, "3x100g"],
    ["Toothpaste", 220, "150g"],
  ],
  "Baby Care": [
    ["Baby Diapers (Medium)", 1450, "pack of 44"],
    ["Baby Wipes", 320, "80 sheets"],
    ["Baby Lotion", 480, "200ml"],
  ],
  "Pet Care": [
    ["Adult Dog Food", 3200, "3kg"],
    ["Cat Food (Ocean Fish)", 1250, "1.5kg"],
  ],
  "Stationery & Home": [
    ["A4 Notebook Set", 350, "pack of 5"],
    ["Ball Point Pens", 150, "pack of 10"],
    ["LED Bulb 12W", 380, "each"],
  ],
};

const stores = [
  ["Khalid Super Store - Mozang", "34 Jalal Din Street, Mozang", "Lahore"],
];

function run() {
  const insertCategory = db.prepare(
    "INSERT OR IGNORE INTO categories (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)"
  );
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products
      (category_id, name, slug, description, price, compare_at_price, unit, image, stock, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertStore = db.prepare(
    "INSERT OR IGNORE INTO stores (name, address, city) VALUES (?, ?, ?)"
  );
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `);

  const txn = db.transaction(() => {
    categories.forEach(([name, icon], idx) => {
      insertCategory.run(name, slugify(name), icon, idx);
    });

    const catRows = db.prepare("SELECT id, name FROM categories").all();
    const catIdByName = Object.fromEntries(catRows.map((c) => [c.name, c.id]));

    let featuredCount = 0;
    Object.entries(productBank).forEach(([catName, products]) => {
      const categoryId = catIdByName[catName];
      products.forEach(([name, price, unit], i) => {
        const isFeatured = featuredCount < 8 && i === 0 ? 1 : 0;
        if (isFeatured) featuredCount++;
        const compareAt = i === 0 ? Math.round(price * 1.15) : null;
        insertProduct.run(
          categoryId,
          name,
          slugify(`${catName}-${name}`),
          `Fresh, quality-checked ${name.toLowerCase()} sourced for Khalid Super Store shoppers.`,
          price,
          compareAt,
          unit,
          "",
          100,
          isFeatured
        );
      });
    });

    stores.forEach(([name, address, city]) => insertStore.run(name, address, city));

    const adminPasswordHash = bcrypt.hashSync("Admin@12345", 10);
    insertUser.run("Store Admin", "admin@khalidsuperstore.pk", adminPasswordHash, "admin");
  });

  txn();
  console.log("Seed complete.");
  console.log("Admin login -> email: admin@khalidsuperstore.pk / password: Admin@12345");
}

run();
