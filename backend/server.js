require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
// Set larger payload limit for Base64 image/video uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize SQLite Database
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'menu_system.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('[SQLite] Connected to menu_system.db');
  }
});

// Setup DB Tables
db.serialize(() => {
  // 1. Tenants Table
  db.run(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      logo TEXT,
      theme TEXT NOT NULL, -- JSON String
      password TEXT DEFAULT 'admin123',
      workingTime TEXT DEFAULT '10:00 AM - 11:00 PM',
      phone TEXT DEFAULT '+91 98765 43210',
      description TEXT DEFAULT 'Delectable multi-cuisine dishes served hot.',
      socials TEXT DEFAULT '{"instagram":"","facebook":"","whatsapp":"","website":""}'
    )
  `, () => {
    // Run schema migrations to add new columns to tenants table if it was created in previous sessions without them
    db.run(`ALTER TABLE tenants ADD COLUMN password TEXT DEFAULT 'admin123'`, () => {});
    db.run(`ALTER TABLE tenants ADD COLUMN workingTime TEXT DEFAULT '10:00 AM - 11:00 PM'`, () => {});
    db.run(`ALTER TABLE tenants ADD COLUMN phone TEXT DEFAULT '+91 98765 43210'`, () => {});
    db.run(`ALTER TABLE tenants ADD COLUMN description TEXT DEFAULT 'Delectable multi-cuisine dishes served hot.'`, () => {});
    db.run(`ALTER TABLE tenants ADD COLUMN socials TEXT DEFAULT '{"instagram":"","facebook":"","whatsapp":"","website":""}'`, () => {});
  });

  // 2. Menu Items Table
  db.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      image TEXT,
      media TEXT, -- JSON String Array
      isVeg INTEGER DEFAULT 1, -- 1=True, 0=False
      available INTEGER DEFAULT 1, -- 1=True, 0=False
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `, () => {
    db.run(`ALTER TABLE menu_items ADD COLUMN media TEXT`, () => {});
  });

  // 3. Orders Table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tenantId TEXT NOT NULL,
      tableId TEXT NOT NULL,
      items TEXT NOT NULL, -- JSON String
      total REAL NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'Pending',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Seed default tenants if empty
  db.get("SELECT COUNT(*) as count FROM tenants", (err, row) => {
    if (row && row.count === 0) {
      console.log('[SQLite] Database empty. Seeding initial tenants...');

      // Seed resto-1 (Gourmet Garden)
      db.run(
        "INSERT INTO tenants (id, name, logo, theme, password, workingTime, phone, description, socials) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          'resto-1',
          'Gourmet Garden',
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop&q=80',
          JSON.stringify({
            primary: '#2d6a4f',
            primaryHover: '#1b4332',
            background: '#f4f9f4',
            accent: '#d8f3dc',
            text: '#1b4332'
          }),
          'garden123',
          '09:00 AM - 10:00 PM',
          '+91 98950 12345',
          'Fresh organic greens and premium chef-selected dishes.',
          JSON.stringify({ instagram: 'https://instagram.com', facebook: 'https://facebook.com', whatsapp: '+919895012345', website: 'https://google.com' })
        ]
      );

      // Seed items for resto-1
      const resto1Items = [
        ['gg-1', 'resto-1', 'Avocado Citrus Salad', 'Crisp organic greens, sliced avocado, orange segments, toasted pumpkin seeds, and citrus-herb vinaigrette.', 145.00, 'Starters', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80', JSON.stringify([{ type: 'image', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80' }]), 1, 1],
        ['gg-2', 'resto-1', 'Truffle Mushroom Gnocchi', 'Handmade potato gnocchi tossed in a creamy black truffle sauce with wild mushrooms and shaved pecorino.', 260.00, 'Mains', 'https://images.unsplash.com/photo-1621961424411-985194c5e8e6?w=600&q=80', JSON.stringify([{ type: 'image', url: 'https://images.unsplash.com/photo-1621961424411-985194c5e8e6?w=600&q=80' }]), 1, 1],
        ['gg-3', 'resto-1', 'Pan-Seared Salmon', 'Crispy skin salmon served over asparagus spears, heirloom tomatoes, and lemon-butter reduction.', 320.00, 'Mains', 'https://images.unsplash.com/photo-1485921325814-a532d8f49d7f?w=600&q=80', JSON.stringify([{ type: 'image', url: 'https://images.unsplash.com/photo-1485921325814-a532d8f49d7f?w=600&q=80' }]), 0, 1]
      ];

      resto1Items.forEach(item => {
        db.run(
          "INSERT INTO menu_items (id, tenantId, name, description, price, category, image, media, isVeg, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          item
        );
      });

      // Seed resto-2 (Sizzle & Stone)
      db.run(
        "INSERT INTO tenants (id, name, logo, theme, password, workingTime, phone, description, socials) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          'resto-2',
          'Sizzle & Stone',
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=100&h=100&fit=crop&q=80',
          JSON.stringify({
            primary: '#d97706',
            primaryHover: '#b45309',
            background: '#fdfbf7',
            accent: '#fef3c7',
            text: '#78350f'
          }),
          'sizzle123',
          '11:00 AM - 11:00 PM',
          '+91 98460 67890',
          'Artisanal charcoal grills and volcanic stone specialties.',
          JSON.stringify({ instagram: 'https://instagram.com', facebook: 'https://facebook.com', whatsapp: '+919846067890', website: 'https://google.com' })
        ]
      );

      // Seed items for resto-2
      const resto2Items = [
        ['ss-1', 'resto-2', 'Spiced Calamari Fritti', 'Crispy baby squid seasoned with volcanic sea salt, cracked pepper, served with charred lemon aioli.', 165.00, 'Starters', 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80', JSON.stringify([{ type: 'image', url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80' }]), 0, 1],
        ['ss-2', 'resto-2', 'Smoked Oak Wagyu Burger', 'Aged Wagyu patty, maple glazed bacon, melted sharp cheddar, caramelized onions, house BBQ sauce.', 285.00, 'Mains', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80', JSON.stringify([{ type: 'image', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80' }]), 0, 1]
      ];

      resto2Items.forEach(item => {
        db.run(
          "INSERT INTO menu_items (id, tenantId, name, description, price, category, image, media, isVeg, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          item
        );
      });

      console.log('[SQLite] Seeding completed.');
    }
  });
});

// WebSocket Handler
io.on('connection', (socket) => {
  socket.on('join-tenant', (tenantId) => {
    socket.join(tenantId);
  });
});

// ─── Super Admin REST Endpoints ─────────────────────────────────────────────

// Super Admin Authentication
app.post('/api/super/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
  const adminPass = process.env.SUPER_ADMIN_PASSWORD || 'adminpassword123';
  
  if (username === adminUser && password === adminPass) {
    res.json({ success: true, token: 'super-admin-jwt-token-sim' });
  } else {
    res.status(401).json({ error: 'Invalid Super Admin credentials' });
  }
});

// Get all tenants with statistics
app.get('/api/super/tenants', (req, res) => {
  const query = `
    SELECT 
      t.id, 
      t.name, 
      t.logo, 
      t.theme,
      (SELECT COUNT(*) FROM menu_items WHERE tenantId = t.id) as totalItems,
      (SELECT COUNT(*) FROM orders WHERE tenantId = t.id) as totalOrders
    FROM tenants t
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Parse themes back to objects
    const parsedRows = rows.map(r => ({
      ...r,
      theme: JSON.parse(r.theme)
    }));
    res.json(parsedRows);
  });
});

// Onboard a new tenant
app.post('/api/super/tenants', (req, res) => {
  const { id, name, logo, theme, password } = req.body;
  if (!id || !name || !logo || !theme || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const insertTenant = "INSERT INTO tenants (id, name, logo, theme, password, workingTime, phone, description, socials) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  const defaultSocials = JSON.stringify({ instagram: '', facebook: '', whatsapp: '', website: '' });
  db.run(insertTenant, [id, name, logo, JSON.stringify(theme), password, '10:00 AM - 11:00 PM', '+91 98765 43210', 'Premium culinary experiences.', defaultSocials], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: 'Restaurant slug already exists.' });
      }
      return res.status(500).json({ error: err.message });
    }

    // Seed default items for this brand so it's fully populated and functional
    const defaultItems = [
      [`item-${id}-1`, id, 'Signature House Specialty', 'Premium chef selection curated using hand-picked farm ingredients.', 180.00, 'Mains', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80', JSON.stringify([{ type: 'image', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80' }]), 1, 1],
      [`item-${id}-2`, id, 'Fresh Harvest Mocktail', 'Fresh organic seasonal fruits blended with carbonated sparkling water.', 75.00, 'Drinks', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80', JSON.stringify([{ type: 'image', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80' }]), 1, 1]
    ];

    const stmt = db.prepare("INSERT INTO menu_items (id, tenantId, name, description, price, category, image, media, isVeg, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    defaultItems.forEach(item => stmt.run(item));
    stmt.finalize();

    res.status(201).json({ id, name, logo, theme });
  });
});

// Delete tenant
app.delete('/api/super/tenants/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  db.run("DELETE FROM tenants WHERE id = ?", [tenantId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Clean up menu items and orders cascade
    db.run("DELETE FROM menu_items WHERE tenantId = ?", [tenantId]);
    db.run("DELETE FROM orders WHERE tenantId = ?", [tenantId]);
    
    res.json({ success: true, message: 'Tenant successfully deleted' });
  });
});

// ─── Standard Multi-tenant Endpoints (SQLite Refactored) ────────────────────

// Tenant login
app.post('/api/tenants/:tenantId/login', (req, res) => {
  const { password } = req.body;
  db.get("SELECT password FROM tenants WHERE id = ?", [req.params.tenantId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Restaurant not found' });
    
    if (row.password === password) {
      res.json({ success: true, token: `token-resto-${req.params.tenantId}` });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  });
});

// Update tenant settings
app.put('/api/tenants/:tenantId/settings', (req, res) => {
  const { name, logo, workingTime, phone, description, socials, theme } = req.body;
  const query = "UPDATE tenants SET name = ?, logo = ?, workingTime = ?, phone = ?, description = ?, socials = ?, theme = ? WHERE id = ?";
  db.run(query, [name, logo, workingTime, phone, description, JSON.stringify(socials || {}), JSON.stringify(theme || {}), req.params.tenantId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Get tenant details
app.get('/api/tenants/:tenantId', (req, res) => {
  db.get("SELECT * FROM tenants WHERE id = ?", [req.params.tenantId], (err, tenant) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!tenant) return res.status(404).json({ error: 'Restaurant not found' });
    
    res.json({
      id: tenant.id,
      name: tenant.name,
      logo: tenant.logo,
      theme: JSON.parse(tenant.theme),
      workingTime: tenant.workingTime || '10:00 AM - 11:00 PM',
      phone: tenant.phone || '+91 98765 43210',
      description: tenant.description || 'Premium culinary experience.',
      socials: tenant.socials ? JSON.parse(tenant.socials) : { instagram: '', facebook: '', whatsapp: '', website: '' }
    });
  });
});

// Get menu catalog
app.get('/api/tenants/:tenantId/menu', (req, res) => {
  db.all("SELECT * FROM menu_items WHERE tenantId = ?", [req.params.tenantId], (err, items) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Map SQLite numeric values back to booleans and parse media
    const mapped = items.map(i => {
      let mediaParsed = [];
      try {
        mediaParsed = i.media ? JSON.parse(i.media) : [{ type: 'image', url: i.image }];
      } catch (err) {
        mediaParsed = [{ type: 'image', url: i.image }];
      }
      return {
        ...i,
        isVeg: !!i.isVeg,
        available: !!i.available,
        media: mediaParsed
      };
    });
    res.json(mapped);
  });
});

// Get orders list
app.get('/api/tenants/:tenantId/orders', (req, res) => {
  db.all("SELECT * FROM orders WHERE tenantId = ? ORDER BY createdAt DESC", [req.params.tenantId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const parsed = rows.map(r => ({
      ...r,
      items: JSON.parse(r.items)
    }));
    res.json(parsed);
  });
});

// Submit a new order
app.post('/api/tenants/:tenantId/orders', (req, res) => {
  const { tenantId } = req.params;
  const { tableId, items, total, notes } = req.body;

  if (!tableId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Invalid order payload' });
  }

  const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const createdAt = new Date().toISOString();

  const query = "INSERT INTO orders (id, tenantId, tableId, items, total, notes, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  const params = [orderId, tenantId, tableId, JSON.stringify(items), total, notes || '', 'Pending', createdAt];

  db.run(query, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });

    const newOrder = {
      id: orderId,
      tenantId,
      tableId,
      items,
      total,
      notes: notes || '',
      status: 'Pending',
      createdAt
    };

    // Broadcast in real-time
    io.to(tenantId).emit('new-order', newOrder);

    res.status(201).json(newOrder);
  });
});

// Update order status
app.put('/api/tenants/:tenantId/orders/:orderId', (req, res) => {
  const { status } = req.body;
  if (!['Pending', 'Preparing', 'Served'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const query = "UPDATE orders SET status = ? WHERE id = ? AND tenantId = ?";
  db.run(query, [status, req.params.orderId, req.params.tenantId], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    // Fetch the updated order to broadcast
    db.get("SELECT * FROM orders WHERE id = ?", [req.params.orderId], (err, order) => {
      if (err || !order) return;
      
      const updated = {
        ...order,
        items: JSON.parse(order.items)
      };

      io.to(req.params.tenantId).emit('order-updated', updated);
      res.json(updated);
    });
  });
});

// Update item availability
app.put('/api/tenants/:tenantId/menu/:itemId', (req, res) => {
  const { available } = req.body;
  const numericAvailable = available ? 1 : 0;

  const query = "UPDATE menu_items SET available = ? WHERE id = ? AND tenantId = ?";
  db.run(query, [numericAvailable, req.params.itemId, req.params.tenantId], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    // Fetch full updated menu to broadcast
    db.all("SELECT * FROM menu_items WHERE tenantId = ?", [req.params.tenantId], (err, items) => {
      if (err || !items) return;

      const mapped = items.map(i => {
        let mediaParsed = [];
        try {
          mediaParsed = i.media ? JSON.parse(i.media) : [{ type: 'image', url: i.image }];
        } catch (err) {
          mediaParsed = [{ type: 'image', url: i.image }];
        }
        return {
          ...i,
          isVeg: !!i.isVeg,
          available: !!i.available,
          media: mediaParsed
        };
      });

      io.to(req.params.tenantId).emit('menu-updated', mapped);
      res.json({ id: req.params.itemId, available: !!available });
    });
  });
});

// Create new menu item
app.post('/api/tenants/:tenantId/menu', (req, res) => {
  const { tenantId } = req.params;
  const { name, description, price, image, category, media, isVeg } = req.body;
  
  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }

  const itemId = `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const numericIsVeg = isVeg ? 1 : 0;
  const query = "INSERT INTO menu_items (id, tenantId, name, description, price, category, image, media, isVeg, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)";
  
  db.run(query, [
    itemId,
    tenantId,
    name,
    description || '',
    parseFloat(price),
    category,
    image || '',
    JSON.stringify(media || []),
    numericIsVeg
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    // Fetch full updated menu to broadcast
    db.all("SELECT * FROM menu_items WHERE tenantId = ?", [tenantId], (err, items) => {
      if (err || !items) return res.status(500).json({ error: 'Failed to retrieve menu list' });

      const mapped = items.map(i => {
        let mediaParsed = [];
        try {
          mediaParsed = i.media ? JSON.parse(i.media) : [{ type: 'image', url: i.image }];
        } catch (err) {
          mediaParsed = [{ type: 'image', url: i.image }];
        }
        return {
          ...i,
          isVeg: !!i.isVeg,
          available: !!i.available,
          media: mediaParsed
        };
      });

      io.to(tenantId).emit('menu-updated', mapped);
      res.status(201).json(mapped);
    });
  });
});

// Delete menu item (password protected)
app.post('/api/tenants/:tenantId/menu/:itemId/delete', (req, res) => {
  const { tenantId, itemId } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required to delete products.' });
  }

  // Get tenant password
  db.get("SELECT password FROM tenants WHERE id = ?", [tenantId], (err, tenantRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!tenantRow) return res.status(404).json({ error: 'Restaurant not found' });

    if (tenantRow.password !== password) {
      return res.status(401).json({ error: 'Incorrect portal admin password.' });
    }

    // Delete item
    db.run("DELETE FROM menu_items WHERE id = ? AND tenantId = ?", [itemId, tenantId], function(err) {
      if (err) return res.status(500).json({ error: err.message });

      // Fetch full updated menu to broadcast
      db.all("SELECT * FROM menu_items WHERE tenantId = ?", [tenantId], (err, items) => {
        if (err || !items) return res.status(500).json({ error: 'Failed to retrieve menu list' });

        const mapped = items.map(i => {
          let mediaParsed = [];
          try {
            mediaParsed = i.media ? JSON.parse(i.media) : [{ type: 'image', url: i.image }];
          } catch (err) {
            mediaParsed = [{ type: 'image', url: i.image }];
          }
          return {
            ...i,
            isVeg: !!i.isVeg,
            available: !!i.available,
            media: mediaParsed
          };
        });

        io.to(tenantId).emit('menu-updated', mapped);
        res.json({ success: true, menu: mapped });
      });
    });
  });
});

// Update item details
app.put('/api/tenants/:tenantId/menu/:itemId/details', (req, res) => {
  const { name, description, price, image, category, media, isVeg } = req.body;
  const numericIsVeg = isVeg ? 1 : 0;
  const query = "UPDATE menu_items SET name = ?, description = ?, price = ?, image = ?, category = ?, media = ?, isVeg = ? WHERE id = ? AND tenantId = ?";
  db.run(query, [name, description, parseFloat(price), image, category, JSON.stringify(media || []), numericIsVeg, req.params.itemId, req.params.tenantId], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    // Fetch full updated menu to broadcast
    db.all("SELECT * FROM menu_items WHERE tenantId = ?", [req.params.tenantId], (err, items) => {
      if (err || !items) return;

      const mapped = items.map(i => {
        let mediaParsed = [];
        try {
          mediaParsed = i.media ? JSON.parse(i.media) : [{ type: 'image', url: i.image }];
        } catch (err) {
          mediaParsed = [{ type: 'image', url: i.image }];
        }
        return {
          ...i,
          isVeg: !!i.isVeg,
          available: !!i.available,
          media: mediaParsed
        };
      });

      io.to(req.params.tenantId).emit('menu-updated', mapped);
      res.json(mapped);
    });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'SQLite', online: true });
});

// Start Server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SQLITE PERSISTENCE ACTIVE: QR MENU SaaS Online`);
  console.log(`   Host Address binding: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
