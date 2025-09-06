const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let db;

// Inicializar banco de dados
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database('beta_masas_edenilde.db', (err) => {
      if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
        reject(err);
        return;
      }
      console.log('Conectado ao banco de dados SQLite.');
      
      // Criar tabelas
      const createTables = `
        CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          price REAL NOT NULL,
          unit_type TEXT DEFAULT 'unidade',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER,
          product_id INTEGER,
          quantity REAL NOT NULL,
          unit_type TEXT NOT NULL,
          total_value REAL NOT NULL,
          payment_method TEXT NOT NULL,
          sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id),
          FOREIGN KEY (product_id) REFERENCES products (id)
        );
        
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER,
          amount REAL NOT NULL,
          description TEXT,
          payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients (id)
        );
        
        CREATE TABLE IF NOT EXISTS admin_settings (
          id INTEGER PRIMARY KEY,
          admin_password TEXT DEFAULT 'admin123',
          admin_name TEXT DEFAULT 'Administrador'
        );
      `;
      
      db.exec(createTables, (err) => {
        if (err) {
          console.error('Erro ao criar tabelas:', err.message);
          reject(err);
          return;
        }
        
        // Verificar se é a primeira execução
        db.get('SELECT * FROM admin_settings WHERE id = 1', (err, row) => {
          if (err) {
            console.error('Erro ao verificar configurações do admin:', err.message);
            reject(err);
            return;
          }
          
          if (!row) {
            // Primeira execução - não inserir configurações padrão
            console.log('Primeira execução detectada. Configuração inicial necessária.');
            resolve({ firstRun: true });
          } else {
            console.log('Banco de dados inicializado com sucesso.');
            resolve({ firstRun: false });
          }
        });
      });
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('closed', () => {
    if (db) {
      db.close();
    }
  });
}

app.whenReady().then(async () => {
  await initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-clients', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM clients ORDER BY name', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('get-products', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM products ORDER BY name', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('search-clients', (event, query) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM clients WHERE name LIKE ? ORDER BY name', [`%${query}%`], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('search-products', (event, query) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM products WHERE name LIKE ? ORDER BY name', [`%${query}%`], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('add-client', (event, name) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO clients (name) VALUES (?)', [name], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, id: this.lastID });
      }
    });
  });
});

ipcMain.handle('add-product', (event, product) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO products (name, price, unit_type) VALUES (?, ?, ?)', [product.name, product.price, product.unitType], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, id: this.lastID });
      }
    });
  });
});

ipcMain.handle('register-sale', (event, sale) => {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO sales (client_id, product_id, quantity, unit_type, total_value, payment_method, sale_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [sale.clientId, sale.productId, sale.quantity, sale.unitType, sale.totalValue, sale.paymentMethod, sale.saleDate], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, id: this.lastID });
      }
    });
  });
});

ipcMain.handle('get-general-extract', () => {
  return new Promise((resolve, reject) => {
    const salesSql = `SELECT s.*, c.name as client_name, p.name as product_name, p.price as product_price
                      FROM sales s
                      JOIN clients c ON s.client_id = c.id
                      JOIN products p ON s.product_id = p.id
                      ORDER BY s.sale_date DESC`;
    
    const paymentsSql = `SELECT p.*, c.name as client_name
                         FROM payments p
                         JOIN clients c ON p.client_id = c.id
                         ORDER BY p.payment_date DESC`;
    
    db.all(salesSql, (err, sales) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.all(paymentsSql, (err, payments) => {
        if (err) {
          reject(err);
        } else {
          resolve({ sales, payments });
        }
      });
    });
  });
});

ipcMain.handle('get-client-extract', (event, clientId) => {
  return new Promise((resolve, reject) => {
    const salesSql = `SELECT s.*, p.name as product_name, p.price as product_price
                      FROM sales s
                      JOIN products p ON s.product_id = p.id
                      WHERE s.client_id = ?
                      ORDER BY s.sale_date DESC`;
    
    const paymentsSql = `SELECT * FROM payments WHERE client_id = ? ORDER BY payment_date DESC`;
    
    db.all(salesSql, [clientId], (err, sales) => {
      if (err) {
        reject(err);
        return;
      }
      
      db.all(paymentsSql, [clientId], (err, payments) => {
        if (err) {
          reject(err);
        } else {
          resolve({ sales, payments });
        }
      });
    });
  });
});

ipcMain.handle('register-payment', (event, payment) => {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO payments (client_id, amount, description, payment_date)
                 VALUES (?, ?, ?, ?)`;
    db.run(sql, [payment.clientId, payment.amount, payment.description, payment.paymentDate], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, id: this.lastID });
      }
    });
  });
});

ipcMain.handle('delete-sale', (event, saleId) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM sales WHERE id = ?', [saleId], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('verify-admin-password', (event, password) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT admin_password FROM admin_settings WHERE id = 1', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row && row.admin_password === password);
      }
    });
  });
});

ipcMain.handle('update-admin-settings', (event, settings) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE admin_settings SET admin_password = ?, admin_name = ? WHERE id = 1', [settings.password, settings.name], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('export-data', async () => {
  return new Promise((resolve, reject) => {
    const exportData = {
      export_date: new Date().toISOString(),
      clients: [],
      products: [],
      sales: [],
      payments: [],
      settings: []
    };
    
    // Buscar clients
    db.all('SELECT * FROM clients', (err, clients) => {
      if (err) {
        resolve({ success: false, error: err.message });
        return;
      }
      exportData.clients = clients;
      
      // Buscar products
      db.all('SELECT * FROM products', (err, products) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }
        exportData.products = products;
        
        // Buscar sales
        const salesSql = `SELECT s.*, c.name as client_name, p.name as product_name
                          FROM sales s
                          JOIN clients c ON s.client_id = c.id
                          JOIN products p ON s.product_id = p.id`;
        db.all(salesSql, (err, sales) => {
          if (err) {
            resolve({ success: false, error: err.message });
            return;
          }
          exportData.sales = sales;
          
          // Buscar payments
          const paymentsSql = `SELECT p.*, c.name as client_name
                               FROM payments p
                               JOIN clients c ON p.client_id = c.id`;
          db.all(paymentsSql, (err, payments) => {
            if (err) {
              resolve({ success: false, error: err.message });
              return;
            }
            exportData.payments = payments;
            
            // Buscar settings
            db.all('SELECT * FROM admin_settings', (err, settings) => {
              if (err) {
                resolve({ success: false, error: err.message });
                return;
              }
              exportData.settings = settings;
              
              resolve({ success: true, data: exportData });
            });
          });
        });
      });
    });
  });
});

ipcMain.handle('reset-all-data', () => {
  return new Promise((resolve, reject) => {
    // Delete all data from all tables
    const deleteQueries = [
      'DELETE FROM sales',
      'DELETE FROM payments', 
      'DELETE FROM clients',
      'DELETE FROM products',
      'DELETE FROM admin_settings'
    ];
    
    let completed = 0;
    let hasError = false;
    
    deleteQueries.forEach((query, index) => {
      db.run(query, (err) => {
        if (err) {
          console.error(`Error deleting from table ${index}:`, err.message);
          hasError = true;
        }
        completed++;
        
        if (completed === deleteQueries.length) {
          if (hasError) {
            resolve({ success: false, error: 'Erro ao deletar alguns dados' });
            return;
          }
          
          // Don't recreate admin settings - let user configure again
          console.log('All data reset successfully');
          resolve({ success: true });
        }
      });
    });
  });
});

ipcMain.handle('setup-admin', (event, adminData) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO admin_settings (id, admin_password, admin_name) VALUES (?, ?, ?)', 
           [1, adminData.password, adminData.name], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.handle('check-first-run', () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM admin_settings WHERE id = 1', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve({ isFirstRun: !row });
      }
    });
  });
});

ipcMain.handle('delete-client', (event, clientId) => {
  return new Promise((resolve, reject) => {
    // First check if client has any sales or payments
    db.get('SELECT COUNT(*) as count FROM sales WHERE client_id = ?', [clientId], (err, salesCount) => {
      if (err) {
        resolve({ success: false, error: err.message });
        return;
      }
      
      db.get('SELECT COUNT(*) as count FROM payments WHERE client_id = ?', [clientId], (err, paymentsCount) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }
        
        if (salesCount.count > 0 || paymentsCount.count > 0) {
          resolve({ success: false, error: 'Não é possível excluir cliente com vendas ou pagamentos registrados' });
          return;
        }
        
        // Delete client if no related records
        db.run('DELETE FROM clients WHERE id = ?', [clientId], function(err) {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true });
          }
        });
      });
    });
  });
});

ipcMain.handle('delete-product', (event, productId) => {
  return new Promise((resolve, reject) => {
    // First check if product has any sales
    db.get('SELECT COUNT(*) as count FROM sales WHERE product_id = ?', [productId], (err, salesCount) => {
      if (err) {
        resolve({ success: false, error: err.message });
        return;
      }
      
      if (salesCount.count > 0) {
        resolve({ success: false, error: 'Não é possível excluir produto com vendas registradas' });
        return;
      }
      
      // Delete product if no related sales
      db.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
        if (err) {
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  });
});
