# Test Accounts Information

## 🔐 Test Accounts List

For development and testing convenience, the following accounts can be used to log in directly:

| Username | Email | Plaintext Password | Role | Premium Member | Notes |
|--------|------|----------|------|----------|------|
| admin | admin@topcare.com | admin123 | Admin | Yes | System administrator with access to all features |
| fashionista_emma | emma@example.com | password123 | User | Yes | Fashion-savvy user, for premium feature testing |
| vintage_hunter | vintage@gmail.com | password123 | User | No | Vintage clothing enthusiast, regular user |
| style_guru_alex | alex@fashion.co | password123 | User | Yes | Style consultant, premium seller |
| casual_buyer | buyer@email.com | password123 | User | No | Regular buyer, basic functionality testing |
| premium_seller | seller@pro.com | password123 | User | Yes | Professional seller, premium features testing |
| trend_setter | trends@style.net | password123 | User | No | Trend setter, social features testing |
| eco_warrior | eco@green.org | password123 | User | Yes | Sustainability advocate, sustainable fashion testing |
| budget_shopper | budget@student.edu | password123 | User | No | Budget shopper, student user |
| luxury_lover | luxury@designer.com | password123 | User | Yes | Luxury goods enthusiast, high-end market |

## 🧪 Recommended Test Scenarios

### Admin feature tests
- **Account**: admin / admin123
- **Test cases**:
  - User management
  - Feedback/recommendation management
  - Product review/approval
  - Data/statistics viewing
  - System configuration

### Premium member feature tests
- **Accounts**: fashionista_emma / password123 or style_guru_alex / password123
- **Test cases**:
  - Unlimited product listings
  - Unlimited Mix & Match AI usage
  - Promotional discounts (30% off)
  - Premium badges display
  - Lower commission rate (5%)

### Regular user feature tests
- **Accounts**: casual_buyer / password123 or vintage_hunter / password123
- **Test cases**:
  - Limited product listings (max 2)
  - Limited Mix & Match AI usage (3 times)
  - Standard promotion pricing
  - Standard commission rate (10%)

### Buy/sell transaction tests
- **Buyer**: casual_buyer / password123
- **Seller**: premium_seller / password123
- **Test cases**:
  - Browsing and purchasing products
  - Transaction flow
  - Review/rating system
  - Messaging/communication

## 🔄 Updating Passwords

The system uses SHA256 hashing (not bcrypt). If you need to reset passwords, use one of the following methods:

### Method 1: SQL commands
```sql
-- Update admin password to 'admin123' (SHA256 hash)
UPDATE users SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' 
WHERE username = 'admin';

-- Bulk update all test user passwords to 'password123' (SHA256 hash)
UPDATE users SET password_hash = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f' 
WHERE username IN ('fashionista_emma', 'vintage_hunter', 'style_guru_alex', 'casual_buyer', 'premium_seller', 'trend_setter', 'eco_warrior', 'budget_shopper', 'luxury_lover');
```

### Method 2: JavaScript to generate hashes
```javascript
const crypto = require('crypto');

// Generate password hash
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

console.log('admin123 hash:', hashPassword('admin123'));
console.log('password123 hash:', hashPassword('password123'));
```

## ⚠️ Security Notice

For development and testing use only!

- These passwords are for development/testing only
- Use strong passwords in production
- Rotate test environment passwords regularly
- Do not hard-code passwords into production code

## 🔧 Automatic setup for test passwords

Run the following command to automatically set all test account passwords:

```bash
cd web
node -e "
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function setTestPasswords() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'top_care_fashion'
  });
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  await connection.execute('UPDATE users SET password_hash = ? WHERE username = ?', [adminPassword, 'admin']);
  await connection.execute('UPDATE users SET password_hash = ? WHERE username != ?', [hashedPassword, 'admin']);
  
  console.log('✅ Test passwords set!');
  await connection.end();
}

setTestPasswords().catch(console.error);
"
```
