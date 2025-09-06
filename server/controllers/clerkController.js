const pool = require("../config/db");

exports.saveClerkUser = async (req, res) => {
  console.log("🔥 /api/save-user request received");
  
  try {
    // 1. Validate authentication
    if (!req.auth) {
      console.error("❌ No auth data in request");
      return res.status(401).json({ error: "Unauthorized - Missing authentication" });
    }

    const { userId, sessionId } = req.auth;
    const { name, email } = req.body;

    console.log("🔑 Auth Data:", { userId, sessionId });
    console.log("📦 Request Body:", { name, email });

    // 2. Validate required fields
    if (!userId || !email) {
      console.error("❌ Missing required fields");
      return res.status(400).json({ 
        error: "Bad Request",
        details: {
          missing: {
            userId: !userId,
            email: !email
          }
        }
      });
    }

    // 3. Verify database connection
    try {
      const [dbTest] = await pool.query("SELECT 1+1 AS test");
      console.log("✅ Database connection test:", dbTest[0].test === 2 ? "OK" : "UNEXPECTED RESULT");
      if (dbTest[0].test !== 2) {
    throw new Error("Database connection test failed");
    }console.log("✅ Database connection test passed");
    } catch (dbErr) {
      console.error("❌ Database connection failed:", dbErr.message);
      return res.status(500).json({ 
        error: "Database Connection Failed",
        details: dbErr.message
      });
    }

    // 4. Check for existing user by Clerk ID
    const [userByClerk] = await pool.query(
      "SELECT id, username, email FROM users WHERE clerk_id = ? LIMIT 1", 
      [userId]
    );

    if (userByClerk.length > 0) {
      console.log("🔄 Existing user found by Clerk ID:", userByClerk[0]);
      
      // Update if name/email changed
      if (userByClerk[0].username !== name || userByClerk[0].email !== email) {
        await pool.query(
          "UPDATE users SET username = ?, email = ?, updated_at = NOW() WHERE clerk_id = ?",
          [name, email, userId]
        );
        console.log("📝 Updated user details");
        return res.status(200).json({ 
          status: "updated",
          changes: {
            name: userByClerk[0].username !== name,
            email: userByClerk[0].email !== email
          }
        });
      }
      
      return res.status(200).json({ status: "no_changes_needed" });
    }

    // 5. Check for existing user by email (case-insensitive)
    const [userByEmail] = await pool.query(
      "SELECT id, clerk_id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
      [email]
    );

    if (userByEmail.length > 0) {
      console.log("📧 Existing user found by email:", userByEmail[0]);
      
      // Link Clerk ID to existing account
      await pool.query(
        "UPDATE users SET clerk_id = ?, username = ?, updated_at = NOW() WHERE id = ?",
        [userId, name, userByEmail[0].id]
      );
      return res.status(200).json({ status: "linked_existing_account" });
    }

    // 6. Create new user
    console.log("🆕 Creating new user");
    const [result] = await pool.query(
      `INSERT INTO users 
       (username, email, password_hash, provider, clerk_id, created_at, updated_at) 
       VALUES (?, ?, NULL, 'clerk', ?, NOW(), NOW())`,
      [name, email, userId]
    );

    console.log("✨ New user created with ID:", result.insertId);
    return res.status(201).json({ 
      status: "created",
      userId: result.insertId
    });

  } catch (err) {
    console.error("💥 CRITICAL ERROR:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      details: process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'Contact support'
    });
  }
};