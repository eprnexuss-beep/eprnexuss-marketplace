import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required. Please login or signup.",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required. Please login or signup.",
      });
    }

    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return res.status(500).json({
        success: false,
        message: "Authentication service is not configured",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded?.userId) {
      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid authentication token",
      });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User no longer exists",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message: "Your account has been disabled",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "Your session has expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      code: "INVALID_TOKEN",
      message: "Invalid authentication token",
    });
  }
};

// Optional authentication for public catalogue endpoints. A valid Bearer token
// enriches req.user; anonymous visitors continue normally.
export const optionalProtect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith("Bearer ")) return next();
    const token = authorization.slice(7).trim();
    if (!token || !JWT_SECRET) return next();
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.userId) return next();
    const user = await User.findById(decoded.userId).select("-password");
    if (user && user.isActive !== false) req.user = user;
    return next();
  } catch {
    return next();
  }
};
