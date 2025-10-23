import bcrypt from 'bcrypt';
import { db } from '../database';

const changePassword = async () => {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('Usage: npm run change-password -- <email> <new-password>');
    process.exit(1);
  }

  const [email, newPassword] = args;

  console.log(`Attempting to change password for user: ${email}`);

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = 'UPDATE users SET password_hash = ? WHERE email = ?';

    db.run(sql, [hashedPassword, email], function (err) {
      if (err) {
        console.error('Database error:', err.message);
        process.exit(1);
      }
      if (this.changes === 0) {
        console.log(`Error: No user found with email '${email}'.`);
      } else {
        console.log(`Successfully changed password for user '${email}'.`);
      }
      db.close();
    });
  } catch (error) {
    console.error('Error hashing password:', error);
    process.exit(1);
  }
};

changePassword();
