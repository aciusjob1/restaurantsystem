INSERT INTO roles (name, description) VALUES
  ('ADMIN', 'Restaurant administrator'),
  ('MANAGER', 'Operations manager'),
  ('CASHIER', 'Cash register operator'),
  ('WAITER', 'Waiter / sales agent');

INSERT INTO users (email, password_hash, full_name, phone, role_id)
SELECT 'admin@citysquare.local', '$2a$10$0e3j3M3FQz8zOxg5m5v4vOP5M8gCF5r/5c87j88Yv5eMtx4aRSwvG', 'City Square Admin', '+255700000001', id
FROM roles WHERE name = 'ADMIN';

INSERT INTO tables (table_code, table_name, seats, status, location)
VALUES
  ('T01', 'Table 01', 4, 'AVAILABLE', 'Main hall'),
  ('T02', 'Table 02', 4, 'AVAILABLE', 'Main hall'),
  ('T03', 'Table 03', 2, 'AVAILABLE', 'Garden'),
  ('T04', 'Table 04', 6, 'AVAILABLE', 'VIP area');

INSERT INTO categories (name, description)
VALUES
  ('Food', 'Main food dishes'),
  ('Drinks', 'Beverages and juices'),
  ('Desserts', 'Sweet options');

INSERT INTO products (sku, name, description, category_id, selling_price, cost_price, preparation_station)
SELECT 'FOOD-001', 'Rice and Stew', 'Classic local meal', id, 12000, 6500, 'KITCHEN'
FROM categories WHERE name = 'Food';

INSERT INTO products (sku, name, description, category_id, selling_price, cost_price, preparation_station)
SELECT 'FOOD-002', 'Chicken Curry', 'Spicy chicken plate', id, 18000, 9500, 'KITCHEN'
FROM categories WHERE name = 'Food';

INSERT INTO products (sku, name, description, category_id, selling_price, cost_price, preparation_station)
SELECT 'DRINK-001', 'Fresh Juice', 'Fruit juice', id, 5000, 1800, 'BAR'
FROM categories WHERE name = 'Drinks';

INSERT INTO products (sku, name, description, category_id, selling_price, cost_price, preparation_station)
SELECT 'DRINK-002', 'Soda', 'Carbonated soft drink', id, 3000, 1200, 'BAR'
FROM categories WHERE name = 'Drinks';

INSERT INTO payment_methods (name, code)
VALUES
  ('Cash', 'CASH'),
  ('M-Pesa', 'MPESA'),
  ('Card', 'CARD');

INSERT INTO printers (name, type, ip_address, port, model, location)
VALUES
  ('Kitchen Printer', 'KITCHEN', '192.168.1.50', 9100, 'ESC/POS', 'Kitchen'),
  ('Bar Printer', 'BAR', '192.168.1.51', 9100, 'ESC/POS', 'Bar'),
  ('Receipt Printer', 'RECEIPT', '192.168.1.52', 9100, 'ESC/POS', 'Cashier');
