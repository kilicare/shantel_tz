import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // ========================================
  // ROLES
  // ========================================

  console.log('📋 Creating roles...');

  try {
    const roleCount = await prisma.role.count();
    if (roleCount === 0) {
      await prisma.role.createMany({
        data: [
          { id: uuidv4(), name: 'Super Administrator', description: 'Full system access', status: 'ACTIVE' },
          { id: uuidv4(), name: 'Administrator', description: 'Operational admin', status: 'ACTIVE' },
          { id: uuidv4(), name: 'Manager', description: 'Management & approval authority', status: 'ACTIVE' },
          { id: uuidv4(), name: 'Salesperson', description: 'Sales operations', status: 'ACTIVE' },
          { id: uuidv4(), name: 'Storekeeper', description: 'Inventory operations', status: 'ACTIVE' },
          { id: uuidv4(), name: 'Purchaser', description: 'Procurement operations', status: 'ACTIVE' },
          { id: uuidv4(), name: 'Accountant/Finance', description: 'Financial operations', status: 'ACTIVE' },
        ],
      });
      console.log('✅ Roles created');
    } else {
      console.log(`ℹ️  ${roleCount} roles already exist, skipping`);
    }
  } catch (error) {
    console.error('❌ Error creating roles:', error);
  }

  // ========================================
  // PERMISSIONS
  // ========================================

  console.log('📋 Creating permissions...');

  try {
    const permissionCount = await prisma.permission.count();
    if (permissionCount === 0) {
      const permissions = [
        // AUTH
        { id: uuidv4(), code: 'auth.login', name: 'Login', module: 'auth' },
        { id: uuidv4(), code: 'auth.logout', name: 'Logout', module: 'auth' },
        { id: uuidv4(), code: 'auth.change_password', name: 'Change Password', module: 'auth' },
        // USERS
        { id: uuidv4(), code: 'users.view', name: 'View Users', module: 'users' },
        { id: uuidv4(), code: 'users.create', name: 'Create User', module: 'users' },
        { id: uuidv4(), code: 'users.edit', name: 'Edit User', module: 'users' },
        { id: uuidv4(), code: 'users.deactivate', name: 'Deactivate User', module: 'users' },
        // PRODUCTS
        { id: uuidv4(), code: 'products.view', name: 'View Products', module: 'products' },
        { id: uuidv4(), code: 'products.create', name: 'Create Product', module: 'products' },
        { id: uuidv4(), code: 'products.edit', name: 'Edit Product', module: 'products' },
        { id: uuidv4(), code: 'products.view_cost', name: 'View Cost Price', module: 'products' },
        // CUSTOMERS
        { id: uuidv4(), code: 'customers.view', name: 'View Customers', module: 'customers' },
        { id: uuidv4(), code: 'customers.create', name: 'Create Customer', module: 'customers' },
        { id: uuidv4(), code: 'customers.edit', name: 'Edit Customer', module: 'customers' },
        // SALES
        { id: uuidv4(), code: 'quotations.view', name: 'View Quotations', module: 'sales' },
        { id: uuidv4(), code: 'quotations.create', name: 'Create Quotation', module: 'sales' },
        { id: uuidv4(), code: 'quotations.edit', name: 'Edit Quotation', module: 'sales' },
        { id: uuidv4(), code: 'sales_orders.view', name: 'View Sales Orders', module: 'sales' },
        { id: uuidv4(), code: 'sales_orders.create', name: 'Create Sales Order', module: 'sales' },
        { id: uuidv4(), code: 'sales_orders.approve', name: 'Approve Sales Order', module: 'sales' },
        { id: uuidv4(), code: 'invoices.view', name: 'View Invoices', module: 'sales' },
        { id: uuidv4(), code: 'invoices.create', name: 'Create Invoice', module: 'sales' },
        { id: uuidv4(), code: 'invoices.post', name: 'Post Invoice', module: 'sales' },
        { id: uuidv4(), code: 'invoices.approve', name: 'Approve Invoice', module: 'sales' },
        { id: uuidv4(), code: 'payments.view', name: 'View Payments', module: 'sales' },
        { id: uuidv4(), code: 'payments.record', name: 'Record Payment', module: 'sales' },
        { id: uuidv4(), code: 'sales_returns.view', name: 'View Sales Returns', module: 'sales' },
        { id: uuidv4(), code: 'sales_returns.create', name: 'Create Sales Return', module: 'sales' },
        { id: uuidv4(), code: 'sales_returns.approve', name: 'Approve Sales Return', module: 'sales' },
        // INVENTORY
        { id: uuidv4(), code: 'inventory.view', name: 'View Inventory', module: 'inventory' },
        { id: uuidv4(), code: 'inventory.adjust', name: 'Adjust Stock', module: 'inventory' },
        { id: uuidv4(), code: 'inventory.approve_adjust', name: 'Approve Adjustment', module: 'inventory' },
        { id: uuidv4(), code: 'inventory.transfer', name: 'Transfer Stock', module: 'inventory' },
        { id: uuidv4(), code: 'inventory.audit', name: 'Perform Audit', module: 'inventory' },
        // PURCHASING
        { id: uuidv4(), code: 'purchase_orders.view', name: 'View Purchase Orders', module: 'purchasing' },
        { id: uuidv4(), code: 'purchase_orders.create', name: 'Create PO', module: 'purchasing' },
        { id: uuidv4(), code: 'purchase_orders.approve', name: 'Approve PO', module: 'purchasing' },
        { id: uuidv4(), code: 'grns.view', name: 'View GRNs', module: 'purchasing' },
        { id: uuidv4(), code: 'grns.create', name: 'Create GRN', module: 'purchasing' },
        { id: uuidv4(), code: 'grns.post', name: 'Post GRN', module: 'purchasing' },
        { id: uuidv4(), code: 'purchase_returns.create', name: 'Create Purchase Return', module: 'purchasing' },
        // REPORTS
        { id: uuidv4(), code: 'dashboard.view', name: 'View Dashboard', module: 'dashboard' },
        { id: uuidv4(), code: 'reports.view', name: 'View Reports', module: 'reports' },
        { id: uuidv4(), code: 'reports.export', name: 'Export Reports', module: 'reports' },
        // DOCUMENTS
        { id: uuidv4(), code: 'documents.view', name: 'View Documents', module: 'documents' },
        { id: uuidv4(), code: 'documents.print', name: 'Print Documents', module: 'documents' },
        { id: uuidv4(), code: 'documents.configure', name: 'Configure Document Numbering', module: 'documents' },
        // AUDIT
        { id: uuidv4(), code: 'audit.view', name: 'View Audit Logs', module: 'audit' },
      ];

      await prisma.permission.createMany({ data: permissions });
      console.log(`✅ ${permissions.length} permissions created`);
    } else {
      console.log(`ℹ️  ${permissionCount} permissions already exist, skipping`);
    }

    const requiredPermissionCodes = [
      'approvals.view', 'approvals.create', 'approvals.approve',
      'expenses.view', 'expenses.create', 'expenses.approve',
      'locations.view', 'locations.create', 'locations.edit',
      'suppliers.view', 'suppliers.create', 'suppliers.edit',
      'projects.view', 'projects.create', 'projects.edit',
      'serial_numbers.view', 'serial_numbers.create', 'serial_numbers.edit',
      'assets.view', 'assets.create', 'assets.edit', 'purchase_returns.view',
    ];
    for (const code of requiredPermissionCodes) {
      await prisma.permission.upsert({
        where: { code },
        update: {},
        create: { id: uuidv4(), code, name: code.split('.').map((part) => part.charAt(0).toUpperCase() + part.slice(1).replace('_', ' ')).join(' '), module: code.split('.')[0] },
      });
    }
  } catch (error) {
    console.error('❌ Error creating permissions:', error);
  }

  // ========================================
  // ASSIGN PERMISSIONS TO SUPER ADMIN
  // ========================================

  console.log('🔐 Assigning permissions to Super Admin...');

  try {
    const superAdminRole = await prisma.role.findFirst({ where: { name: 'Super Administrator' } });
    const allPermissions = await prisma.permission.findMany();

    if (superAdminRole && allPermissions.length > 0) {
      for (const permission of allPermissions) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: superAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            id: uuidv4(),
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        });
      }
      console.log('✅ Permissions reconciled for Super Admin');
    }

    const rolePermissionMap: Record<string, string[]> = {
      Administrator: allPermissions.map((permission) => permission.code),
      Manager: [
        'dashboard.view', 'reports.view', 'reports.export', 'audit.view',
        'approvals.view', 'approvals.approve',
        'users.view', 'products.view', 'customers.view', 'suppliers.view', 'locations.view',
        'quotations.view', 'sales_orders.view', 'sales_orders.approve', 'invoices.view', 'invoices.approve', 'invoices.post',
        'payments.view', 'payments.record', 'sales_returns.view', 'sales_returns.approve',
        'purchase_orders.view', 'purchase_orders.approve', 'grns.view', 'grns.post',
        'inventory.view', 'inventory.approve_adjust', 'inventory.transfer', 'inventory.audit',
        'documents.view', 'documents.print',
      ],
      Salesperson: [
        'dashboard.view', 'products.view', 'customers.view', 'customers.create', 'customers.edit',
        'locations.view',
        'quotations.view', 'quotations.create', 'quotations.edit', 'sales_orders.view', 'sales_orders.create',
        'invoices.view', 'invoices.create', 'invoices.post', 'payments.view', 'sales_returns.view', 'sales_returns.create',
        'documents.view', 'documents.print',
      ],
      Storekeeper: [
        'dashboard.view', 'products.view', 'locations.view', 'inventory.view', 'inventory.adjust',
        'inventory.approve_adjust', 'inventory.transfer', 'inventory.audit', 'purchase_orders.view',
        'grns.view', 'grns.create', 'grns.post', 'sales_returns.view', 'audit.view',
        'documents.view', 'documents.print',
      ],
      Purchaser: [
        'dashboard.view', 'products.view', 'products.create', 'products.edit', 'suppliers.view', 'suppliers.create', 'suppliers.edit',
        'purchase_orders.view', 'purchase_orders.create', 'purchase_orders.approve', 'grns.view', 'grns.create', 'grns.post',
        'purchase_returns.create', 'inventory.view', 'documents.view', 'documents.print',
      ],
      'Accountant/Finance': [
        'dashboard.view', 'reports.view', 'reports.export', 'audit.view', 'customers.view', 'suppliers.view',
        'invoices.view', 'payments.view', 'payments.record', 'expenses.view', 'expenses.create', 'expenses.approve',
        'documents.view', 'documents.print',
      ],
    };

    for (const [roleName, permissionCodes] of Object.entries(rolePermissionMap)) {
      const role = await prisma.role.findFirst({ where: { name: roleName } });
      if (!role) continue;
      const permissionsByCode = new Map(allPermissions.map((permission) => [permission.code, permission]));
      for (const code of permissionCodes) {
        const permission = permissionsByCode.get(code);
        if (!permission) continue;
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { id: uuidv4(), roleId: role.id, permissionId: permission.id },
        });
      }
    }
    console.log('✅ Operational role permissions reconciled');
  } catch (error) {
    console.error('❌ Error assigning permissions:', error);
  }

  // ========================================
  // CREATE ADMIN USER
  // ========================================

  console.log('👤 Creating admin user...');

  try {
    const existingAdmin = await prisma.user.findFirst({ where: { email: 'admin@shantel.local' } });
    if (!existingAdmin) {
      const superAdminRole = await prisma.role.findFirst({ where: { name: 'Super Administrator' } });
      
      const adminUser = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'admin@shantel.local',
          username: 'admin',
          name: 'System Administrator',
          passwordHash: await bcrypt.hash('Admin@123456', 10),
          status: 'ACTIVE',
          phone: '+255123456789',
        },
      });

      // Assign Super Admin role
      if (superAdminRole) {
        await prisma.userRole.create({
          data: {
            id: uuidv4(),
            userId: adminUser.id,
            roleId: superAdminRole.id,
          },
        });
      }

      console.log('✅ Admin user created');
      console.log(`   Email: admin@shantel.local`);
      console.log(`   Password: Admin@123456`);
    } else {
      console.log('ℹ️  Admin user already exists, skipping');
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }

  // ========================================
  // CREATE ROLE TEST USERS
  // ========================================

  console.log('👥 Creating role test users...');

  try {
    const roleTestUsers = [
      { email: 'administrator@shantel.local', username: 'administrator', name: 'Operations Administrator', role: 'Administrator' },
      { email: 'manager@shantel.local', username: 'manager', name: 'Operations Manager', role: 'Manager' },
      { email: 'salesperson@shantel.local', username: 'salesperson', name: 'Salesperson User', role: 'Salesperson' },
      { email: 'storekeeper@shantel.local', username: 'storekeeper', name: 'Storekeeper User', role: 'Storekeeper' },
      { email: 'purchaser@shantel.local', username: 'purchaser', name: 'Purchaser User', role: 'Purchaser' },
      { email: 'accountant@shantel.local', username: 'accountant', name: 'Accountant Finance User', role: 'Accountant/Finance' },
    ];

    for (const testUser of roleTestUsers) {
      const role = await prisma.role.findFirst({ where: { name: testUser.role } });
      if (!role) continue;

      let user = await prisma.user.findFirst({ where: { email: testUser.email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            id: uuidv4(),
            email: testUser.email,
            username: testUser.username,
            name: testUser.name,
            passwordHash: await bcrypt.hash('Role@123456', 10),
            status: 'ACTIVE',
          },
        });
      }

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { id: uuidv4(), userId: user.id, roleId: role.id },
      });
    }

    console.log('✅ Role test users reconciled');
  } catch (error) {
    console.error('❌ Error creating role test users:', error);
  }

  // ========================================
  // COMPANY SETTINGS
  // ========================================

  console.log('🏢 Creating company settings...');

  try {
    const existingCompanySettings = await prisma.companySetting.findFirst();
    if (!existingCompanySettings) {
      await prisma.companySetting.create({
        data: {
          id: uuidv4(),
          companyName: 'SHANTEL SALES & STORE',
          address: 'Dar es Salaam, Tanzania',
          phone: '+255123456789',
          email: 'info@shantel.local',
          tinNumber: 'TIN123456789',
          currency: 'TZS',
          timezone: 'Africa/Dar_es_Salaam',
        },
      });
      console.log('✅ Company settings created');
    } else {
      console.log('ℹ️  Company settings already exist, skipping');
    }
  } catch (error) {
    console.error('❌ Error creating company settings:', error);
  }

  // ========================================
  // SYSTEM SETTINGS
  // ========================================

  console.log('⚙️  Creating system settings...');

  try {
    const existingSystemSettings = await prisma.systemSetting.count();
    if (existingSystemSettings === 0) {
      const systemSettings = [
        { id: uuidv4(), key: 'ALLOW_NEGATIVE_STOCK', value: 'false', valueType: 'boolean' },
        { id: uuidv4(), key: 'INVOICE_NUMBERING_PREFIX', value: 'INV', valueType: 'string' },
        { id: uuidv4(), key: 'QUOTATION_NUMBERING_PREFIX', value: 'QT', valueType: 'string' },
        { id: uuidv4(), key: 'PO_NUMBERING_PREFIX', value: 'PO', valueType: 'string' },
        { id: uuidv4(), key: 'GRN_NUMBERING_PREFIX', value: 'GRN', valueType: 'string' },
        { id: uuidv4(), key: 'DEFAULT_TAX_RATE', value: '18', valueType: 'number' },
        { id: uuidv4(), key: 'DEFAULT_CREDIT_DAYS', value: '30', valueType: 'number' },
        { id: uuidv4(), key: 'DEFAULT_CREDIT_LIMIT', value: '10000000', valueType: 'number' },
        { id: uuidv4(), key: 'SALESPERSON_DISCOUNT_LIMIT', value: '5', valueType: 'number' },
        { id: uuidv4(), key: 'INVOICE_POSTING_LIMIT_SALESMAN', value: '1000000', valueType: 'number' },
        { id: uuidv4(), key: 'INVOICE_POSTING_LIMIT_MANAGER', value: '10000000', valueType: 'number' },
        { id: uuidv4(), key: 'PO_LIMIT_PURCHASER', value: '5000000', valueType: 'number' },
      ];

      await prisma.systemSetting.createMany({ data: systemSettings });
      console.log(`✅ ${systemSettings.length} system settings created`);
    } else {
      console.log('ℹ️  System settings already exist, skipping');
    }
  } catch (error) {
    console.error('❌ Error creating system settings:', error);
  }

  // ========================================
  // DOCUMENT SEQUENCES
  // ========================================

  console.log('🔢 Reconciling document sequences...');

  try {
    const documentSequences = [
      ['REQUISITION', 'REQ'],
      ['PURCHASE_ORDER', 'PO'],
      ['GRN', 'GRN'],
      ['STOCK_TRANSFER', 'TRF'],
      ['STOCK_ADJUSTMENT', 'ADJ'],
      ['STOCK_AUDIT', 'AUD'],
      ['PAYMENT', 'PAY'],
    ];

    for (const [documentType, prefix] of documentSequences) {
      await prisma.documentSequence.upsert({
        where: { documentType },
        update: {},
        create: { id: uuidv4(), documentType, prefix, currentNumber: 0, padding: 6, year: 2026, status: 'ACTIVE' },
      });
    }

    console.log('✅ Document sequences reconciled');
  } catch (error) {
    console.error('❌ Error creating document sequences:', error);
  }

  // ========================================
  // MASTER DATA
  // ========================================

  console.log('📦 Creating master data...');

  // Categories
  try {
    const categoryCount = await prisma.category.count();
    if (categoryCount === 0) {
      await prisma.category.createMany({
        data: [
          { id: uuidv4(), name: 'Electronics', status: 'ACTIVE' },
          { id: uuidv4(), name: 'Furniture', status: 'ACTIVE' },
          { id: uuidv4(), name: 'Stationery', status: 'ACTIVE' },
          { id: uuidv4(), name: 'Services', status: 'ACTIVE' },
        ],
      });
      console.log('✅ Categories created');
    } else {
      console.log('ℹ️  Categories already exist, skipping');
    }
  } catch (error) {
    console.error('❌ Error creating categories:', error);
  }

  // Brands
  try {
    const brandCount = await prisma.brand.count();
    if (brandCount === 0) {
      await prisma.brand.createMany({
        data: [
          { id: uuidv4(), name: 'Generic', status: 'ACTIVE' },
          { id: uuidv4(), name: 'Premium', status: 'ACTIVE' },
          { id: uuidv4(), name: 'Budget', status: 'ACTIVE' },
        ],
      });
      console.log('✅ Brands created');
    } else {
      console.log('ℹ️  Brands already exist, skipping');
    }
  } catch (error) {
    console.error('❌ Error creating brands:', error);
  }

  // Units
  try {
    const unitCount = await prisma.unit.count();
    if (unitCount === 0) {
      await prisma.unit.createMany({
        data: [
          { id: uuidv4(), name: 'Pieces', code: 'PCS' },
          { id: uuidv4(), name: 'Box', code: 'BOX' },
          { id: uuidv4(), name: 'Kilogram', code: 'KG' },
          { id: uuidv4(), name: 'Liter', code: 'LTR' },
          { id: uuidv4(), name: 'Meter', code: 'MTR' },
        ],
      });
      console.log('✅ Units created');
    } else {
      console.log('ℹ️  Units already exist, skipping');
    }
  } catch (error) {
    console.error('❌ Error creating units:', error);
  }

  // Locations
  try {
    const locationCount = await prisma.location.count();
    if (locationCount === 0) {
      await prisma.location.createMany({
        data: [
          { id: uuidv4(), name: 'Main Store', code: 'MAIN', locationType: 'MAIN_STORE' },
          { id: uuidv4(), name: 'Branch A', code: 'BRANCH_A', locationType: 'BRANCH' },
          { id: uuidv4(), name: 'Project Store', code: 'PROJECT', locationType: 'PROJECT_STORE' },
        ],
      });
      console.log('✅ Locations created');
    } else {
      console.log('ℹ️  Locations already exist, skipping');
    }
  } catch (error) {
    console.error('❌ Error creating locations:', error);
  }

  // Payment Methods
  try {
    const paymentMethodCount = await prisma.paymentMethod.count();
    if (paymentMethodCount === 0) {
      await prisma.paymentMethod.createMany({
        data: [
          { id: uuidv4(), name: 'Cash', code: 'CASH' },
          { id: uuidv4(), name: 'Bank Transfer', code: 'BANK_TRANSFER' },
          { id: uuidv4(), name: 'Mobile Money', code: 'MOBILE_MONEY' },
          { id: uuidv4(), name: 'Check', code: 'CHECK' },
        ],
      });
      console.log('✅ Payment methods created');
    } else {
      console.log('ℹ️  Payment methods already exist, skipping');
    }
  } catch (error) {
    console.error('❌ Error creating payment methods:', error);
  }

  // Expense Categories
  try {
    const expenseCategoryCount = await prisma.expenseCategory.count();
    if (expenseCategoryCount === 0) {
      await prisma.expenseCategory.createMany({
        data: [
          { id: uuidv4(), name: 'Transportation', code: 'TRANSPORT' },
          { id: uuidv4(), name: 'Utilities', code: 'UTILITIES' },
          { id: uuidv4(), name: 'Office Supplies', code: 'OFFICE' },
          { id: uuidv4(), name: 'Maintenance', code: 'MAINTENANCE' },
        ],
      });
      console.log('✅ Expense categories created');
    } else {
      console.log('ℹ️  Expense categories already exist, skipping');
    }
  } catch (error) {
    console.error('❌ Error creating expense categories:', error);
  }

  // Sample Products
  try {
    const productCount = await prisma.product.count();
    if (productCount === 0) {
      const categories = await prisma.category.findMany();
      const brands = await prisma.brand.findMany();
      const units = await prisma.unit.findMany();

      await prisma.product.createMany({
        data: [
          {
            id: uuidv4(),
            name: 'Laptop Computer',
            sku: 'LAPTOP-001',
            barcode: '1234567890001',
            productType: 'SERIALIZED_ITEM',
            categoryId: categories[0].id,
            brandId: brands[1].id,
            unitId: units[0].id,
            costPrice: 800000,
            sellingPrice: 1200000,
            minimumStockLevel: 5,
            tax: 18,
            status: 'ACTIVE',
          },
          {
            id: uuidv4(),
            name: 'Office Chair',
            sku: 'CHAIR-001',
            productType: 'STOCK_ITEM',
            categoryId: categories[1].id,
            brandId: brands[0].id,
            unitId: units[0].id,
            costPrice: 150000,
            sellingPrice: 250000,
            minimumStockLevel: 10,
            status: 'ACTIVE',
          },
          {
            id: uuidv4(),
            name: 'A4 Paper (500 sheets)',
            sku: 'PAPER-A4-500',
            productType: 'STOCK_ITEM',
            categoryId: categories[2].id,
            brandId: brands[0].id,
            unitId: units[1].id,
            costPrice: 15000,
            sellingPrice: 25000,
            minimumStockLevel: 20,
            status: 'ACTIVE',
          },
        ],
      });
      console.log('✅ Sample products created');
    } else {
      console.log('ℹ️  Products already exist, skipping');
    }
  } catch (error) {
    console.error('❌ Error creating products:', error);
  }

  // Sample Customers
  try {
    const customerCount = await prisma.customer.count();
    if (customerCount === 0) {
      await prisma.customer.createMany({
        data: [
          {
            id: uuidv4(),
            name: 'Acme Corporation',
            email: 'info@acme.tz',
            phone: '+255712345678',
            tinNumber: 'TIN-ACME-001',
            customerType: 'BUSINESS',
            creditLimit: 50000000,
            creditDays: 30,
            status: 'ACTIVE',
          },
          {
            id: uuidv4(),
            name: 'John Doe',
            email: 'john@example.tz',
            phone: '+255712345679',
            customerType: 'INDIVIDUAL',
            creditLimit: 5000000,
            creditDays: 0,
            status: 'ACTIVE',
          },
        ],
      });
      console.log('✅ Sample customers created');
    } else {
      console.log('ℹ️  Customers already exist, skipping');
    }
  } catch (error) {
    console.error('❌ Error creating customers:', error);
  }

  // Sample Suppliers
  try {
    const supplierCount = await prisma.supplier.count();
    if (supplierCount === 0) {
      await prisma.supplier.createMany({
        data: [
          {
            id: uuidv4(),
            name: 'Tech Wholesale Ltd',
            email: 'supply@techwholesale.tz',
            phone: '+255712345680',
            tinNumber: 'TIN-TECH-001',
            status: 'ACTIVE',
          },
          {
            id: uuidv4(),
            name: 'Office Furniture Co',
            email: 'sales@officefurn.tz',
            phone: '+255712345681',
            status: 'ACTIVE',
          },
        ],
      });
      console.log('✅ Sample suppliers created');
    } else {
      console.log('ℹ️  Suppliers already exist, skipping');
    }
  } catch (error) {
    console.error('❌ Error creating suppliers:', error);
  }

  // Initialize Stock Balances
  try {
    const stockBalanceCount = await prisma.stockBalance.count();
    if (stockBalanceCount === 0) {
      const products = await prisma.product.findMany();
      const locations = await prisma.location.findMany();

      if (products.length > 0 && locations.length > 0) {
        const stockBalances = [];
        for (const product of products) {
          for (const location of locations) {
            stockBalances.push({
              id: uuidv4(),
              productId: product.id,
              locationId: location.id,
              quantity: 0,
            });
          }
        }
        await prisma.stockBalance.createMany({ data: stockBalances });
        console.log('✅ Stock balances initialized');
      }
    } else {
      console.log('ℹ️  Stock balances already exist, skipping');
    }
  } catch (error) {
    console.error('❌ Error initializing stock balances:', error);
  }

  console.log('\n✅ Database seeding completed successfully!\n');
  console.log('📝 Test Credentials:');
  console.log('   Email: admin@shantel.local');
  console.log('   Password: Admin@123456');
  console.log('   Role: Super Administrator\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });