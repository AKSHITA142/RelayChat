const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

router.delete(
  "/delete-user/:id",
  authMiddleware,
  roleMiddleware("admin"),
  (req, res) => {
    res.json({ message: "User deleted (admin only)" });
  }
);

module.exports = router;
