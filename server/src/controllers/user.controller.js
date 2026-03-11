const User = require("../models/User");

const getProfile = async (req, res) => {
  try {
     const user = await User.findById(req.user.id).select("-password");

    res.status(200).json({
      message: "User profile fetched",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error"
    });
  }
};

const searchUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { name: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(keyword).find({ _id: { $ne: req.user.id } }).select("-password");
    res.send(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getProfile, searchUsers };
