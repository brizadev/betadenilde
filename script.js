const { ipcRenderer } = require('electron');

// Global variables
let clients = [];
let products = [];
let currentClientId = null;
let currentProductId = null;
let isAdminLoggedIn = false;
let generalExtract = { sales: [], payments: [] };

// DOM Elements
const salesSection = document.getElementById('salesSection');
const adminSection = document.getElementById('adminSection');
const adminLogin = document.getElementById('adminLogin');
const adminDashboard = document.getElementById('adminDashboard');
const salesForm = document.getElementById('salesForm');
const clientNameInput = document.getElementById('clientName');
const productNameInput = document.getElementById('productName');
const clientSuggestions = document.getElementById('clientSuggestions');
const productSuggestions = document.getElementById('productSuggestions');
const productNotFound = document.getElementById('productNotFound');
const addClientBtn = document.getElementById('addClientBtn');
const addProductBtn = document.getElementById('addProductBtn');
const adminBtn = document.getElementById('adminBtn');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const grossSalesValue = document.getElementById('grossSalesValue');
const paidSalesValue = document.getElementById('paidSalesValue');
const toggleGrossSales = document.getElementById('toggleGrossSales');
const togglePaidSales = document.getElementById('togglePaidSales');
const generalExtractDiv = document.getElementById('generalExtract');
const clientProfileSearch = document.getElementById('clientProfileSearch');
const clientProfileSuggestions = document.getElementById('clientProfileSuggestions');
const clientProfile = document.getElementById('clientProfile');
const modalOverlay = document.getElementById('modalOverlay');
const confirmModal = document.getElementById('confirmModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
    setCurrentDateTime();
    updateSalesValues();
});

// Load initial data
async function loadData() {
    try {
        clients = await ipcRenderer.invoke('get-clients');
        products = await ipcRenderer.invoke('get-products');
        generalExtract = await ipcRenderer.invoke('get-general-extract');
        updateGeneralExtract();
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Erro ao carregar dados', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Sales form
    salesForm.addEventListener('submit', handleSaleSubmit);
    
    // Client search
    clientNameInput.addEventListener('input', handleClientSearch);
    clientNameInput.addEventListener('focus', () => showClientSuggestions());
    clientNameInput.addEventListener('blur', () => {
        setTimeout(() => hideSuggestions(clientSuggestions), 200);
    });
    
    // Product search
    productNameInput.addEventListener('input', handleProductSearch);
    productNameInput.addEventListener('focus', () => showProductSuggestions());
    productNameInput.addEventListener('blur', () => {
        setTimeout(() => hideSuggestions(productSuggestions), 200);
    });
    
    // Quantity and price calculation
    document.getElementById('quantity').addEventListener('input', calculateTotalValue);
    document.getElementById('productValue').addEventListener('input', calculateTotalValue);
    document.getElementById('unitType').addEventListener('change', calculateTotalValue);
    
    // Add buttons
    addClientBtn.addEventListener('click', showAddClientModal);
    addProductBtn.addEventListener('click', showAddProductModal);
    
    // Admin
    adminBtn.addEventListener('click', showAdminSection);
    loginForm.addEventListener('submit', handleAdminLogin);
    logoutBtn.addEventListener('click', handleAdminLogout);
    
    // Sales toggles
    toggleGrossSales.addEventListener('click', () => toggleSalesVisibility('gross'));
    togglePaidSales.addEventListener('click', () => toggleSalesVisibility('paid'));
    
    
    // Modals
    closeModal.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) hideModal();
    });
    
    // Admin actions
    document.getElementById('manageClientsBtn').addEventListener('click', () => showManageClientsModal());
    document.getElementById('manageProductsBtn').addEventListener('click', () => showManageProductsModal());
    document.getElementById('searchProfileBtn').addEventListener('click', () => showSearchProfileModal());
    document.getElementById('settingsBtn').addEventListener('click', () => showSettingsModal());
    document.getElementById('exportDataBtn').addEventListener('click', handleExportData);
    
    // Confirmation modal
    document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
    document.getElementById('cancelDelete').addEventListener('click', hideConfirmModal);
    
    // Reset modal
    document.getElementById('confirmReset').addEventListener('click', confirmReset);
    document.getElementById('cancelReset').addEventListener('click', hideResetModal);
    
    // Setup modal
    document.getElementById('confirmSetup').addEventListener('click', confirmSetup);
}

// Set current date and time
function setCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const dateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById('saleDate').value = dateTimeString;
}

// Calculate total value automatically
function calculateTotalValue() {
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const unitPrice = parseFloat(document.getElementById('productValue').value) || 0;
    
    if (quantity > 0 && unitPrice > 0) {
        const totalValue = quantity * unitPrice;
        document.getElementById('totalValue').value = totalValue.toFixed(2);
        console.log(`Cálculo: ${quantity} × R$ ${unitPrice.toFixed(2)} = R$ ${totalValue.toFixed(2)}`);
    } else {
        document.getElementById('totalValue').value = '0.00';
    }
}

// Handle sale form submission
async function handleSaleSubmit(e) {
    e.preventDefault();
    
    if (!currentClientId) {
        showNotification('Selecione um cliente válido', 'error');
        return;
    }
    
    if (!currentProductId) {
        showNotification('Selecione um produto válido', 'error');
        return;
    }
    
    const quantity = parseFloat(document.getElementById('quantity').value);
    const unitPrice = parseFloat(document.getElementById('productValue').value);
    const totalValue = parseFloat(document.getElementById('totalValue').value);
    
    const saleData = {
        clientId: currentClientId,
        productId: currentProductId,
        quantity: quantity,
        unitType: document.getElementById('unitType').value,
        totalValue: totalValue,
        paymentMethod: document.getElementById('paymentMethod').value,
        saleDate: document.getElementById('saleDate').value
    };
    
    try {
        const result = await ipcRenderer.invoke('register-sale', saleData);
        if (result.success) {
            showNotification('Venda registrada com sucesso!', 'success');
            salesForm.reset();
            setCurrentDateTime();
            currentClientId = null;
            currentProductId = null;
            await loadData();
            updateSalesValues();
        } else {
            showNotification('Erro ao registrar venda: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error registering sale:', error);
        showNotification('Erro ao registrar venda', 'error');
    }
}

// Handle client search
async function handleClientSearch(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        hideSuggestions(clientSuggestions);
        addClientBtn.style.display = 'none';
        currentClientId = null;
        return;
    }
    
    try {
        const results = await ipcRenderer.invoke('search-clients', query);
        showClientSuggestions(results);
        
        // Check if exact match exists
        const exactMatch = results.find(client => 
            client.name.toLowerCase() === query.toLowerCase()
        );
        
        if (exactMatch) {
            currentClientId = exactMatch.id;
            addClientBtn.style.display = 'none';
        } else {
            currentClientId = null;
            addClientBtn.style.display = 'block';
        }
    } catch (error) {
        console.error('Error searching clients:', error);
    }
}

// Handle product search
async function handleProductSearch(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        hideSuggestions(productSuggestions);
        productNotFound.style.display = 'none';
        addProductBtn.style.display = 'none';
        currentProductId = null;
        return;
    }
    
    try {
        const results = await ipcRenderer.invoke('search-products', query);
        showProductSuggestions(results);
        
        // Check if exact match exists
        const exactMatch = results.find(product => 
            product.name.toLowerCase() === query.toLowerCase()
        );
        
        if (exactMatch) {
            currentProductId = exactMatch.id;
            productNotFound.style.display = 'none';
            addProductBtn.style.display = 'none';
        } else {
            currentProductId = null;
            productNotFound.style.display = 'block';
            addProductBtn.style.display = 'block';
        }
    } catch (error) {
        console.error('Error searching products:', error);
    }
}

// Show client suggestions
function showClientSuggestions(results = []) {
    clientSuggestions.innerHTML = '';
    
    if (results.length === 0) {
        clientSuggestions.style.display = 'none';
        return;
    }
    
    results.forEach(client => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = client.name;
        item.addEventListener('click', () => {
            clientNameInput.value = client.name;
            currentClientId = client.id;
            hideSuggestions(clientSuggestions);
            addClientBtn.style.display = 'none';
        });
        clientSuggestions.appendChild(item);
    });
    
    clientSuggestions.style.display = 'block';
}

// Show product suggestions
function showProductSuggestions(results = []) {
    productSuggestions.innerHTML = '';
    
    if (results.length === 0) {
        productSuggestions.style.display = 'none';
        return;
    }
    
    results.forEach(product => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
            <div>${product.name}</div>
            <div style="font-size: 0.85rem; color: #718096;">
                R$ ${product.price.toFixed(2)} - ${product.unit_type}
            </div>
        `;
        item.addEventListener('click', () => {
            productNameInput.value = product.name;
            currentProductId = product.id;
            document.getElementById('productValue').value = product.price;
            hideSuggestions(productSuggestions);
            productNotFound.style.display = 'none';
            addProductBtn.style.display = 'none';
            // Calcular valor total automaticamente
            calculateTotalValue();
        });
        productSuggestions.appendChild(item);
    });
    
    productSuggestions.style.display = 'block';
}

// Hide suggestions
function hideSuggestions(suggestionsElement) {
    suggestionsElement.style.display = 'none';
}

// Show add client modal
async function showAddClientModal() {
    const name = clientNameInput.value.trim();
    if (!name) {
        showNotification('Digite o nome do cliente primeiro', 'error');
        return;
    }
    
    try {
        const result = await ipcRenderer.invoke('add-client', name);
        if (result.success) {
            showNotification('Cliente registrado com sucesso!', 'success');
            await loadData();
            currentClientId = result.id;
            addClientBtn.style.display = 'none';
        } else {
            showNotification('Erro ao registrar cliente: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error adding client:', error);
        showNotification('Erro ao registrar cliente', 'error');
    }
}

// Show add product modal
async function showAddProductModal() {
    const name = productNameInput.value.trim();
    const price = parseFloat(document.getElementById('productValue').value);
    const unitType = document.getElementById('unitType').value;
    
    if (!name) {
        showNotification('Digite o nome do produto primeiro', 'error');
        return;
    }
    
    if (!price || price <= 0) {
        showNotification('Digite um valor válido para o produto', 'error');
        return;
    }
    
    const product = {
        name: name,
        price: price,
        unitType: unitType
    };
    
    try {
        const result = await ipcRenderer.invoke('add-product', product);
        if (result.success) {
            showNotification('Produto registrado com sucesso!', 'success');
            await loadData();
            currentProductId = result.id;
            productNotFound.style.display = 'none';
            addProductBtn.style.display = 'none';
            // Calcular valor total após registrar produto
            calculateTotalValue();
        } else {
            showNotification('Erro ao registrar produto: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error adding product:', error);
        showNotification('Erro ao registrar produto', 'error');
    }
}

// Show admin section
async function showAdminSection() {
    salesSection.style.display = 'none';
    adminSection.style.display = 'block';
    
    // Check if it's first run
    try {
        const result = await ipcRenderer.invoke('check-first-run');
        if (result.isFirstRun) {
            // Show setup modal instead of login
            showSetupModal();
        } else {
            // Show normal login
            adminLogin.style.display = 'block';
            adminDashboard.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking first run:', error);
        // Fallback to normal login
        adminLogin.style.display = 'block';
        adminDashboard.style.display = 'none';
    }
}

// Handle admin login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('adminPassword').value;
    
    try {
        const isValid = await ipcRenderer.invoke('verify-admin-password', password);
        if (isValid) {
            isAdminLoggedIn = true;
            adminLogin.style.display = 'none';
            adminDashboard.style.display = 'block';
            await loadData();
            updateGeneralExtract();
            updateSalesValues();
        } else {
            showNotification('Senha incorreta', 'error');
        }
    } catch (error) {
        console.error('Error verifying password:', error);
        showNotification('Erro ao verificar senha', 'error');
    }
}

// Handle admin logout
function handleAdminLogout() {
    isAdminLoggedIn = false;
    adminSection.style.display = 'none';
    salesSection.style.display = 'block';
    document.getElementById('adminPassword').value = '';
}

// Update sales values
async function updateSalesValues() {
    try {
        const extract = await ipcRenderer.invoke('get-general-extract');
        let totalGrossSales = 0;
        let totalPaidSales = 0;
        
        // Calcular vendas brutas (todas as vendas)
        extract.sales.forEach(sale => {
            totalGrossSales += sale.total_value;
        });
        
        // Calcular vendas pagas (vendas no dinheiro + pagamentos de fiado)
        extract.sales.forEach(sale => {
            if (sale.payment_method === 'dinheiro') {
                totalPaidSales += sale.total_value;
            }
        });
        
        extract.payments.forEach(payment => {
            totalPaidSales += payment.amount;
        });
        
        // Garantir que os valores não sejam negativos
        totalGrossSales = Math.max(0, totalGrossSales);
        totalPaidSales = Math.max(0, totalPaidSales);
        
        grossSalesValue.textContent = `R$ ${totalGrossSales.toFixed(2)}`;
        paidSalesValue.textContent = `R$ ${totalPaidSales.toFixed(2)}`;
    } catch (error) {
        console.error('Error updating sales values:', error);
    }
}

// Toggle sales visibility
function toggleSalesVisibility(type) {
    const valueElement = type === 'gross' ? grossSalesValue : paidSalesValue;
    const toggleElement = type === 'gross' ? toggleGrossSales : togglePaidSales;
    const currentValue = valueElement.textContent;
    const icon = toggleElement.querySelector('i');
    
    if (currentValue === 'R$ ***,***') {
        updateSalesValues();
        icon.className = 'fas fa-eye';
    } else {
        valueElement.textContent = 'R$ ***,***';
        icon.className = 'fas fa-eye-slash';
    }
}

// Update general extract
function updateGeneralExtract() {
    generalExtractDiv.innerHTML = '';
    
    const allTransactions = [
        ...generalExtract.sales.map(sale => ({ ...sale, type: 'sale' })),
        ...generalExtract.payments.map(payment => ({ ...payment, type: 'payment' }))
    ].sort((a, b) => {
        // Sort by date descending (most recent first)
        const dateA = new Date(a.sale_date || a.payment_date);
        const dateB = new Date(b.sale_date || b.payment_date);
        return dateB - dateA;
    });
    
    allTransactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = `extract-item ${transaction.type}`;
        
        if (transaction.type === 'sale') {
            item.className = `extract-item ${transaction.type} ${transaction.payment_method}`;
            item.innerHTML = `
                <div class="extract-info">
                    <div class="extract-date">${formatDateTime(transaction.sale_date)}</div>
                    <div class="extract-description">
                        Venda: ${transaction.product_name} para ${transaction.client_name}
                        <span class="payment-method">(${transaction.payment_method === 'fiado' ? 'Fiado' : 'Dinheiro'})</span>
                    </div>
                    <div class="extract-value">+R$ ${transaction.total_value.toFixed(2)}</div>
                </div>
                <div class="extract-actions">
                    <button class="delete-btn" onclick="showDeleteConfirm(${transaction.id}, 'sale')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        } else {
            item.innerHTML = `
                <div class="extract-info">
                    <div class="extract-date">${formatDateTime(transaction.payment_date)}</div>
                    <div class="extract-description">
                        Pagamento: ${transaction.client_name}
                        ${transaction.description ? ` - ${transaction.description}` : ''}
                    </div>
                    <div class="extract-value">-R$ ${transaction.amount.toFixed(2)}</div>
                </div>
                <div class="extract-actions">
                    <button class="delete-btn" onclick="showDeleteConfirm(${transaction.id}, 'payment')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }
        
        generalExtractDiv.appendChild(item);
    });
}


// Show payment modal
async function showPaymentModal(clientId) {
    // Calculate current debt first
    const currentDebt = await calculateClientDebt(clientId);
    
    modalTitle.textContent = 'Registrar Pagamento';
    modalContent.innerHTML = `
        <div class="debt-info">
            <p><strong>Dívida Atual:</strong> R$ ${currentDebt.toFixed(2)}</p>
        </div>
        <div class="form-group">
            <label for="paymentDate">Data/Hora:</label>
            <input type="datetime-local" id="paymentDate" required>
        </div>
        <div class="form-group">
            <label for="paymentDescription">Descrição (opcional):</label>
            <input type="text" id="paymentDescription" placeholder="Ex: Pagamento parcial">
        </div>
        <div class="form-group">
            <label for="paymentAmount">Valor (R$):</label>
            <input type="number" id="paymentAmount" step="0.01" min="0" max="${currentDebt}" required>
            <small class="help-text">Máximo: R$ ${currentDebt.toFixed(2)}</small>
        </div>
        <div class="modal-actions">
            <button id="savePayment" class="register-btn">Registrar Pagamento</button>
            <button id="cancelPayment" class="btn-secondary">Cancelar</button>
        </div>
    `;
    
    // Set current date and time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const dateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById('paymentDate').value = dateTimeString;
    
    showModal();
    
    document.getElementById('savePayment').addEventListener('click', async () => {
        const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
        
        // Validate payment amount
        if (paymentAmount <= 0) {
            showNotification('Valor deve ser maior que zero', 'error');
            return;
        }
        
        if (paymentAmount > currentDebt) {
            showNotification(`Valor não pode ser maior que a dívida atual (R$ ${currentDebt.toFixed(2)})`, 'error');
            return;
        }
        
        const payment = {
            clientId: clientId,
            amount: paymentAmount,
            description: document.getElementById('paymentDescription').value.trim(),
            paymentDate: document.getElementById('paymentDate').value
        };
        
        try {
            const result = await ipcRenderer.invoke('register-payment', payment);
            if (result.success) {
                showNotification('Pagamento registrado com sucesso!', 'success');
                await loadData();
                updateGeneralExtract();
                updateSalesValues();
                loadClientProfile(clientId);
                hideModal();
            } else {
                showNotification('Erro ao registrar pagamento: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error registering payment:', error);
            showNotification('Erro ao registrar pagamento', 'error');
        }
    });
    
    document.getElementById('cancelPayment').addEventListener('click', hideModal);
}

// Show delete confirmation
function showDeleteConfirm(id, type) {
    confirmModal.style.display = 'flex';
    document.getElementById('confirmPassword').value = '';
    
    // Store the ID and type for deletion
    confirmModal.dataset.id = id;
    confirmModal.dataset.type = type;
}

// Show delete client confirmation
function showDeleteClientConfirm(clientId, clientName) {
    confirmModal.style.display = 'flex';
    document.getElementById('confirmPassword').value = '';
    
    // Update modal title and content
    document.querySelector('#confirmModal .modal-header h3').textContent = 'Excluir Cliente';
    document.querySelector('#confirmModal .modal-content p').textContent = `Tem certeza que deseja excluir o cliente "${clientName}"?`;
    
    // Store the ID and type for deletion
    confirmModal.dataset.id = clientId;
    confirmModal.dataset.type = 'client';
}

// Show delete product confirmation
function showDeleteProductConfirm(productId, productName) {
    confirmModal.style.display = 'flex';
    document.getElementById('confirmPassword').value = '';
    
    // Update modal title and content
    document.querySelector('#confirmModal .modal-header h3').textContent = 'Excluir Produto';
    document.querySelector('#confirmModal .modal-content p').textContent = `Tem certeza que deseja excluir o produto "${productName}"?`;
    
    // Store the ID and type for deletion
    confirmModal.dataset.id = productId;
    confirmModal.dataset.type = 'product';
}

// Confirm delete
async function confirmDelete() {
    const id = confirmModal.dataset.id;
    const type = confirmModal.dataset.type;
    const password = document.getElementById('confirmPassword').value;
    
    try {
        const isValid = await ipcRenderer.invoke('verify-admin-password', password);
        if (!isValid) {
            showNotification('Senha incorreta', 'error');
            return;
        }
        
        if (type === 'sale') {
            const result = await ipcRenderer.invoke('delete-sale', id);
            if (result.success) {
                showNotification('Venda excluída com sucesso!', 'success');
                await loadData();
                updateGeneralExtract();
                updateSalesValues();
                hideConfirmModal();
            } else {
                showNotification('Erro ao excluir venda', 'error');
            }
        } else if (type === 'client') {
            const result = await ipcRenderer.invoke('delete-client', id);
            if (result.success) {
                showNotification('Cliente excluído com sucesso!', 'success');
                await loadData();
                hideConfirmModal();
                // Refresh the manage clients modal
                showManageClientsModal();
            } else {
                showNotification('Erro ao excluir cliente: ' + result.error, 'error');
            }
        } else if (type === 'product') {
            const result = await ipcRenderer.invoke('delete-product', id);
            if (result.success) {
                showNotification('Produto excluído com sucesso!', 'success');
                await loadData();
                hideConfirmModal();
                // Refresh the manage products modal
                showManageProductsModal();
            } else {
                showNotification('Erro ao excluir produto: ' + result.error, 'error');
            }
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        showNotification('Erro ao excluir registro', 'error');
    }
}

// Hide confirm modal
function hideConfirmModal() {
    confirmModal.style.display = 'none';
    document.getElementById('confirmPassword').value = '';
    
    // Reset modal title and content to default
    document.querySelector('#confirmModal .modal-header h3').textContent = 'Confirmar Exclusão';
    document.querySelector('#confirmModal .modal-content p').textContent = 'Tem certeza que deseja excluir este registro?';
}

// Show reset modal
function showResetModal() {
    const resetModal = document.getElementById('resetModal');
    resetModal.style.display = 'flex';
    
    // Clear all fields
    document.getElementById('resetPassword1').value = '';
    document.getElementById('resetPassword2').value = '';
    document.getElementById('resetConfirmation').value = '';
}

// Hide reset modal
function hideResetModal() {
    const resetModal = document.getElementById('resetModal');
    resetModal.style.display = 'none';
    
    // Clear all fields
    document.getElementById('resetPassword1').value = '';
    document.getElementById('resetPassword2').value = '';
    document.getElementById('resetConfirmation').value = '';
}

// Confirm reset
async function confirmReset() {
    const password1 = document.getElementById('resetPassword1').value;
    const password2 = document.getElementById('resetPassword2').value;
    const confirmation = document.getElementById('resetConfirmation').value;
    
    // Validate inputs
    if (!password1 || !password2 || !confirmation) {
        showNotification('Todos os campos são obrigatórios', 'error');
        return;
    }
    
    if (password1 !== password2) {
        showNotification('As senhas não coincidem', 'error');
        return;
    }
    
    if (confirmation.toUpperCase() !== 'RESETAR') {
        showNotification('Digite exatamente "RESETAR" para confirmar', 'error');
        return;
    }
    
    // Verify admin password
    try {
        const isValid = await ipcRenderer.invoke('verify-admin-password', password1);
        if (!isValid) {
            showNotification('Senha de administrador incorreta', 'error');
            return;
        }
        
        // Confirm final action
        const finalConfirm = confirm('⚠️ ATENÇÃO: Esta ação irá apagar TODOS os dados do sistema e NÃO pode ser desfeita!\n\nTem certeza absoluta que deseja continuar?');
        if (!finalConfirm) {
            return;
        }
        
        // Execute reset
        const result = await ipcRenderer.invoke('reset-all-data');
        if (result.success) {
            showNotification('Todos os dados foram resetados com sucesso!', 'success');
            hideResetModal();
            
            // Reload the application data
            await loadData();
            updateGeneralExtract();
            updateSalesValues();
            
            // Show setup modal again (since admin settings were deleted)
            setTimeout(() => {
                handleAdminLogout();
                showSetupModal();
            }, 2000);
        } else {
            showNotification('Erro ao resetar dados: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error resetting data:', error);
        showNotification('Erro ao resetar dados', 'error');
    }
}

// Show setup modal
function showSetupModal() {
    const setupModal = document.getElementById('setupModal');
    setupModal.style.display = 'flex';
    
    // Clear all fields
    document.getElementById('setupAdminName').value = '';
    document.getElementById('setupPassword').value = '';
    document.getElementById('setupConfirmPassword').value = '';
    
    // Focus on first field
    setTimeout(() => {
        document.getElementById('setupAdminName').focus();
    }, 100);
}

// Hide setup modal
function hideSetupModal() {
    const setupModal = document.getElementById('setupModal');
    setupModal.style.display = 'none';
    
    // Clear all fields
    document.getElementById('setupAdminName').value = '';
    document.getElementById('setupPassword').value = '';
    document.getElementById('setupConfirmPassword').value = '';
}

// Confirm setup
async function confirmSetup() {
    const name = document.getElementById('setupAdminName').value.trim();
    const password = document.getElementById('setupPassword').value;
    const confirmPassword = document.getElementById('setupConfirmPassword').value;
    
    // Validate inputs
    if (!name || !password || !confirmPassword) {
        showNotification('Todos os campos são obrigatórios', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('As senhas não coincidem', 'error');
        return;
    }
    
    if (password.length < 4) {
        showNotification('A senha deve ter pelo menos 4 caracteres', 'error');
        return;
    }
    
    try {
        const result = await ipcRenderer.invoke('setup-admin', { name, password });
        if (result.success) {
            showNotification('Sistema configurado com sucesso!', 'success');
            hideSetupModal();
            
            // Show admin dashboard
            adminLogin.style.display = 'none';
            adminDashboard.style.display = 'block';
            isAdminLoggedIn = true;
            
            // Load data
            await loadData();
            updateGeneralExtract();
            updateSalesValues();
        } else {
            showNotification('Erro ao configurar sistema: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error setting up admin:', error);
        showNotification('Erro ao configurar sistema', 'error');
    }
}

// Calculate client debt
async function calculateClientDebt(clientId) {
    try {
        const extract = await ipcRenderer.invoke('get-client-extract', clientId);
        
        let totalDebt = 0;
        let totalPaid = 0;
        
        // Calculate debt from fiado sales only
        extract.sales.forEach(sale => {
            if (sale.payment_method === 'fiado') {
                totalDebt += sale.total_value;
            }
        });
        
        // Calculate total payments
        extract.payments.forEach(payment => {
            totalPaid += payment.amount;
        });
        
        const remainingDebt = totalDebt - totalPaid;
        return Math.max(0, remainingDebt); // Never return negative debt
    } catch (error) {
        console.error('Error calculating client debt:', error);
        return 0;
    }
}

// Show search profile modal
function showSearchProfileModal() {
    modalTitle.textContent = 'Buscar Perfil do Cliente';
    modalContent.innerHTML = `
        <div class="form-group">
            <label for="clientProfileSearchModal">Nome do Cliente:</label>
            <div class="search-container">
                <input type="text" id="clientProfileSearchModal" placeholder="Digite o nome do cliente">
                <div id="clientProfileSuggestionsModal" class="suggestions"></div>
            </div>
        </div>
        <div class="modal-actions">
            <button id="searchClientProfile" class="register-btn">Buscar</button>
            <button id="cancelSearchProfile" class="btn-secondary">Cancelar</button>
        </div>
    `;
    
    showModal();
    
    // Setup search functionality
    const searchInput = document.getElementById('clientProfileSearchModal');
    const suggestions = document.getElementById('clientProfileSuggestionsModal');
    
    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            hideSuggestions(suggestions);
            return;
        }
        
        try {
            const results = await ipcRenderer.invoke('search-clients', query);
            showClientProfileSuggestionsModal(results, suggestions);
        } catch (error) {
            console.error('Error searching clients:', error);
        }
    });
    
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.length >= 2) {
            showClientProfileSuggestionsModal([], suggestions);
        }
    });
    
    searchInput.addEventListener('blur', () => {
        setTimeout(() => hideSuggestions(suggestions), 200);
    });
    
    document.getElementById('searchClientProfile').addEventListener('click', async () => {
        const clientName = searchInput.value.trim();
        if (!clientName) {
            showNotification('Digite o nome do cliente', 'error');
            return;
        }
        
        try {
            const results = await ipcRenderer.invoke('search-clients', clientName);
            const exactMatch = results.find(client => 
                client.name.toLowerCase() === clientName.toLowerCase()
            );
            
            if (exactMatch) {
                hideModal();
                showClientExtractModal(exactMatch);
            } else {
                showNotification('Cliente não encontrado', 'error');
            }
        } catch (error) {
            console.error('Error searching client:', error);
            showNotification('Erro ao buscar cliente', 'error');
        }
    });
    
    document.getElementById('cancelSearchProfile').addEventListener('click', hideModal);
}

// Show client profile suggestions in modal
function showClientProfileSuggestionsModal(results = [], suggestionsElement) {
    suggestionsElement.innerHTML = '';
    
    if (results.length === 0) {
        suggestionsElement.style.display = 'none';
        return;
    }
    
    results.forEach(client => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = client.name;
        item.addEventListener('click', () => {
            document.getElementById('clientProfileSearchModal').value = client.name;
            hideSuggestions(suggestionsElement);
        });
        suggestionsElement.appendChild(item);
    });
    
    suggestionsElement.style.display = 'block';
}

// Show client extract modal
function showClientExtractModal(client) {
    modalTitle.textContent = `Extrato Pessoal - ${client.name}`;
    modalContent.innerHTML = `
        <div id="clientExtractContent">
            <div class="loading">Carregando extrato...</div>
        </div>
    `;
    
    showModal();
    loadClientExtractData(client.id, client.name);
}

// Load client extract data
async function loadClientExtractData(clientId, clientName) {
    try {
        const extract = await ipcRenderer.invoke('get-client-extract', clientId);
        
        let totalDebt = 0;
        let totalPaid = 0;
        let totalSales = 0;
        
        // Calcular apenas vendas no fiado como dívida
        extract.sales.forEach(sale => {
            totalSales += sale.total_value;
            if (sale.payment_method === 'fiado') {
                totalDebt += sale.total_value;
            }
        });
        
        extract.payments.forEach(payment => {
            totalPaid += payment.amount;
        });
        
        const remainingDebt = totalDebt - totalPaid;
        
        // Combine and sort all transactions by date (most recent first)
        const allClientTransactions = [
            ...extract.sales.map(sale => ({ ...sale, type: 'sale' })),
            ...extract.payments.map(payment => ({ ...payment, type: 'payment' }))
        ].sort((a, b) => {
            const dateA = new Date(a.sale_date || a.payment_date);
            const dateB = new Date(b.sale_date || b.payment_date);
            return dateB - dateA; // Most recent first
        });

        const content = document.getElementById('clientExtractContent');
        content.innerHTML = `
            <div class="client-debt-info">
                <div class="debt-summary">
                    <h4>Resumo da Dívida</h4>
                    <div class="debt-item">
                        <span>Total em Vendas:</span>
                        <span class="debt-value">R$ ${totalSales.toFixed(2)}</span>
                    </div>
                    <div class="debt-item">
                        <span>Vendas no Fiado:</span>
                        <span class="debt-value">R$ ${totalDebt.toFixed(2)}</span>
                    </div>
                    <div class="debt-item">
                        <span>Total Pago:</span>
                        <span class="debt-value paid">R$ ${totalPaid.toFixed(2)}</span>
                    </div>
                    <div class="debt-item total">
                        <span>Saldo Devedor:</span>
                        <span class="debt-value ${remainingDebt > 0 ? 'debt' : 'paid'}">R$ ${remainingDebt.toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="debt-actions">
                    <button id="registerPayment" class="register-btn">
                        <i class="fas fa-credit-card"></i> Registrar Pagamento
                    </button>
                </div>
            </div>
            
            <div class="extract-details">
                <h4>Histórico de Transações</h4>
                <div class="extract-list-modal">
                    ${allClientTransactions.map(transaction => {
                        if (transaction.type === 'sale') {
                            return `
                                <div class="extract-item-modal sale ${transaction.payment_method}">
                                    <div class="extract-info">
                                        <div class="extract-date">${formatDateTime(transaction.sale_date)}</div>
                                        <div class="extract-description">
                                            Venda: ${transaction.product_name} 
                                            <span class="payment-method">(${transaction.payment_method === 'fiado' ? 'Fiado' : 'Dinheiro'})</span>
                                        </div>
                                        <div class="extract-value">+R$ ${transaction.total_value.toFixed(2)}</div>
                                    </div>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="extract-item-modal payment">
                                    <div class="extract-info">
                                        <div class="extract-date">${formatDateTime(transaction.payment_date)}</div>
                                        <div class="extract-description">Pagamento${transaction.description ? `: ${transaction.description}` : ''}</div>
                                        <div class="extract-value">-R$ ${transaction.amount.toFixed(2)}</div>
                                    </div>
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
            </div>
        `;
        
        // Add payment button event listener
        document.getElementById('registerPayment').addEventListener('click', () => {
            hideModal();
            showPaymentModal(clientId);
        });
        
    } catch (error) {
        console.error('Error loading client extract:', error);
        document.getElementById('clientExtractContent').innerHTML = 
            '<div class="error">Erro ao carregar extrato do cliente</div>';
    }
}

// Show manage clients modal
function showManageClientsModal() {
    modalTitle.textContent = 'Gerenciar Clientes';
    modalContent.innerHTML = `
        <div class="form-group">
            <label for="newClientNameManage">Nome do Cliente:</label>
            <input type="text" id="newClientNameManage" required>
        </div>
        <div class="modal-actions">
            <button id="addClientManage" class="register-btn">Adicionar Cliente</button>
        </div>
        <div id="clientsList" class="clients-list" style="margin-top: 1rem;">
            ${clients.map(client => `
                <div class="client-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 0.5rem;">
                    <span>${client.name}</span>
                    <button class="delete-btn" onclick="showDeleteClientConfirm(${client.id}, '${client.name}')" style="padding: 0.25rem 0.5rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
    
    showModal();
    
    document.getElementById('addClientManage').addEventListener('click', async () => {
        const name = document.getElementById('newClientNameManage').value.trim();
        if (!name) {
            showNotification('Nome é obrigatório', 'error');
            return;
        }
        
        try {
            const result = await ipcRenderer.invoke('add-client', name);
            if (result.success) {
                showNotification('Cliente adicionado com sucesso!', 'success');
                await loadData();
                showManageClientsModal(); // Refresh the modal
            } else {
                showNotification('Erro ao adicionar cliente: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error adding client:', error);
            showNotification('Erro ao adicionar cliente', 'error');
        }
    });
}

// Show manage products modal
function showManageProductsModal() {
    modalTitle.textContent = 'Gerenciar Produtos';
    modalContent.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label for="newProductNameManage">Nome do Produto:</label>
                <input type="text" id="newProductNameManage" required>
            </div>
            <div class="form-group">
                <label for="newProductPriceManage">Preço (R$):</label>
                <input type="number" id="newProductPriceManage" step="0.01" min="0" required>
            </div>
            <div class="form-group">
                <label for="newProductUnitTypeManage">Tipo de Unidade:</label>
                <select id="newProductUnitTypeManage">
                    <option value="unidade">Unidade</option>
                    <option value="kg">Kg</option>
                </select>
            </div>
        </div>
        <div class="modal-actions">
            <button id="addProductManage" class="register-btn">Adicionar Produto</button>
        </div>
        <div id="productsList" class="products-list" style="margin-top: 1rem;">
            ${products.map(product => `
                <div class="product-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 0.5rem;">
                    <div>
                        <span>${product.name}</span>
                        <span style="margin-left: 1rem; color: #718096;">R$ ${product.price.toFixed(2)} - ${product.unit_type}</span>
                    </div>
                    <button class="delete-btn" onclick="showDeleteProductConfirm(${product.id}, '${product.name}')" style="padding: 0.25rem 0.5rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
    
    showModal();
    
    document.getElementById('addProductManage').addEventListener('click', async () => {
        const product = {
            name: document.getElementById('newProductNameManage').value.trim(),
            price: parseFloat(document.getElementById('newProductPriceManage').value),
            unitType: document.getElementById('newProductUnitTypeManage').value
        };
        
        if (!product.name || product.price < 0) {
            showNotification('Dados inválidos', 'error');
            return;
        }
        
        try {
            const result = await ipcRenderer.invoke('add-product', product);
            if (result.success) {
                showNotification('Produto adicionado com sucesso!', 'success');
                await loadData();
                showManageProductsModal(); // Refresh the modal
            } else {
                showNotification('Erro ao adicionar produto: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error adding product:', error);
            showNotification('Erro ao adicionar produto', 'error');
        }
    });
}

// Show settings modal
function showSettingsModal() {
    modalTitle.textContent = 'Configurações';
    modalContent.innerHTML = `
        <div class="form-group">
            <label for="adminName">Nome do Administrador:</label>
            <input type="text" id="adminName" value="Administrador">
        </div>
        <div class="form-group">
            <label for="newPassword">Nova Senha:</label>
            <input type="password" id="newPassword" required>
        </div>
        <div class="form-group">
            <label for="confirmPasswordSettings">Confirmar Nova Senha:</label>
            <input type="password" id="confirmPasswordSettings" required>
        </div>
        <div class="modal-actions">
            <button id="saveSettings" class="register-btn">Salvar Configurações</button>
        </div>
        
        <div class="danger-zone">
            <h4><i class="fas fa-exclamation-triangle"></i> Zona de Perigo</h4>
            <p>As ações abaixo são irreversíveis e apagarão todos os dados do sistema.</p>
            <button id="resetDataBtn" class="btn-danger">
                <i class="fas fa-trash-alt"></i> Resetar Todos os Dados
            </button>
        </div>
    `;
    
    showModal();
    
    document.getElementById('saveSettings').addEventListener('click', async () => {
        const name = document.getElementById('adminName').value.trim();
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPasswordSettings').value;
        
        if (!name || !password) {
            showNotification('Todos os campos são obrigatórios', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showNotification('Senhas não coincidem', 'error');
            return;
        }
        
        try {
            const result = await ipcRenderer.invoke('update-admin-settings', { name, password });
            if (result.success) {
                showNotification('Configurações salvas com sucesso!', 'success');
                hideModal();
            } else {
                showNotification('Erro ao salvar configurações: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            showNotification('Erro ao salvar configurações', 'error');
        }
    });
    
    // Reset data button
    document.getElementById('resetDataBtn').addEventListener('click', () => {
        hideModal();
        showResetModal();
    });
}

// Handle export data
async function handleExportData() {
    try {
        const result = await ipcRenderer.invoke('export-data');
        if (result.success) {
            const dataStr = JSON.stringify(result.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `beta_masas_edenilde_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showNotification('Dados exportados com sucesso!', 'success');
        } else {
            showNotification('Erro ao exportar dados: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Erro ao exportar dados', 'error');
    }
}

// Show modal
function showModal() {
    modalOverlay.style.display = 'flex';
}

// Hide modal
function hideModal() {
    modalOverlay.style.display = 'none';
    modalContent.innerHTML = '';
}

// Format date and time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 3000;
        animation: slideIn 0.15s ease-out;
        max-width: 300px;
        word-wrap: break-word;
        border: 2px solid rgba(255, 255, 255, 0.3);
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #38a169, #2f855a)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #e53e3e, #c53030)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove notification after 2 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.15s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 150);
    }, 2000);
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
