const bcrypt = require('bcrypt');

// Fungsi untuk meng-hash password
async function hashPassword(plainPassword) {
    try {
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        return hashedPassword; // Mengembalikan hashed password
    } catch (error) {
        console.error('Error hashing password:', error);
    }
}

module.exports = { hashPassword };
