import bcrypt from "bcryptjs";
import crypto from "crypto";

import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { GOOGLE_CLIENT_ID } from "../config/env.js";
import {
  sendEmailVerification,
  sendPasswordResetEmail,
} from "../services/email.service.js";

const publicUserFields = (user) => ({
  id: user._id,
  name: user.name,
  company: user.company || "",
  email: user.email,
  phone: user.phone || "",
  role: user.role,
  authProvider: user.authProvider,
  emailVerified: Boolean(user.emailVerified),
  kycStatus: user.kycStatus,
  kycRejectionReason: user.kycRejectionReason || "",
  kycSubmittedAt: user.kycSubmittedAt || null,
  verifiedBadge: Boolean(user.verifiedBadge),
});

const createVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return { rawToken, tokenHash };
};

const createSignupSessionToken = () => createVerificationToken();

const createEmailVerificationForUser = async (user) => {
  const { rawToken, tokenHash } = createVerificationToken();

  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpires = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  );

  await user.save();

  return sendEmailVerification({
    email: user.email,
    name: user.name,
    token: rawToken,
  });
};

const createSignupSessionForUser = async (user) => {
  const { rawToken, tokenHash } = createSignupSessionToken();

  user.signupSessionTokenHash = tokenHash;
  user.signupSessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  return rawToken;
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

const verifyGoogleCredential = async (credential) => {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google authentication is not configured on the server");
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
  );

  if (!response.ok) {
    throw new Error("Invalid Google credential");
  }

  const profile = await response.json();

  if (profile.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("Google credential was issued for another application");
  }

  if (
    profile.iss !== "https://accounts.google.com" &&
    profile.iss !== "accounts.google.com"
  ) {
    throw new Error("Invalid Google issuer");
  }

  if (profile.email_verified !== "true") {
    throw new Error("Google email is not verified");
  }

  if (!profile.sub || !profile.email) {
    throw new Error("Google account information is incomplete");
  }

  return {
    googleId: profile.sub,
    email: profile.email.toLowerCase().trim(),
    name: profile.name || profile.email.split("@")[0],
  };
};

const issueLoginResponse = (user, res, message = "Login successful") => {
  const token = generateToken(user._id.toString());

  return res.status(200).json({
    success: true,
    message,
    token,
    user: publicUserFields(user),
  });
};

//------------------------------------------REGISTER USER---------------------------------------------

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body || {};

    if (!name?.trim() || !email?.trim() || !password || !phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, phone number, email and password are required",
      });
    }

    const normalizedRole = role || "buyer";

    if (!["buyer", "seller"].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "You can only register as a buyer or seller",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please login instead.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone.trim(),
      role: normalizedRole,
      authProvider: "local",
      emailVerified: false,
      kycStatus: "pending",
    });

    const signupSessionToken = await createSignupSessionForUser(user);

    // Do not send the verification email automatically. The pending-email
    // screen gives the user an explicit "Send Verification Email" action.
    return res.status(201).json({
      success: true,
      message:
        "Account created successfully. Please verify your email before logging in.",
      emailVerificationSent: false,
      signupSessionToken,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("Register error:", error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map((item) => item.message)
          .join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong while registering",
    });
  }
};

//-------------------------------------------LOGIN USER -----------------------------------------

export const loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body || {};

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password and login role are required",
      });
    }

    if (!["buyer", "seller", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Please use the appropriate customer portal",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled",
      });
    }

    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `These credentials belong to a ${user.role} account. Please use the ${user.role} portal.`,
      });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(403).json({
        success: false,
        message: "This account uses Google Sign-In. Please continue with Google.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password || "",
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.role !== "admin" && !user.emailVerified) {
      // The credentials are valid, but the email is not verified yet. Create
      // a short-lived, restricted signup session so the user can reach the
      // pending-email page and explicitly request a fresh verification email.
      const signupSessionToken = await createSignupSessionForUser(user);

      return res.status(403).json({
        success: false,
        code: "EMAIL_VERIFICATION_REQUIRED",
        message: "Your email address is not verified yet.",
        signupSessionToken,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerificationSent: false,
      });
    }

    return issueLoginResponse(user, res, "Login successful");
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while logging in",
    });
  }
};

//-------------------------------------------GOOGLE AUTH-----------------------------------------

export const googleAuth = async (req, res) => {
  try {
    const { credential, role, phone } = req.body || {};

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    const googleProfile = await verifyGoogleCredential(credential);

    let user = await User.findOne({
      $or: [
        { googleId: googleProfile.googleId },
        { email: googleProfile.email },
      ],
    }).select("+password");

    // Existing user: Google login should be frictionless. We infer the role,
    // so the login screen never needs to ask for phone or role.
    if (user) {
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your account has been disabled",
        });
      }

      if (user.role === "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin accounts cannot use Google Sign-In",
        });
      }

      if (user.googleId && user.googleId !== googleProfile.googleId) {
        return res.status(409).json({
          success: false,
          message: "This email is already linked to another Google account",
        });
      }

      user.googleId = googleProfile.googleId;
      user.emailVerified = true;

      // If this was previously a local account, keep the local provider so
      // password login continues to work as well.
      if (!user.authProvider) {
        user.authProvider = "google";
      }

      if (!user.phone?.trim()) {
        return res.status(200).json({
          success: true,
          needsPhone: true,
          existingUser: true,
          googleProfile: {
            name: user.name || googleProfile.name,
            email: user.email,
          },
          message: "Phone number is required to complete your account",
        });
      }

      await user.save();

      return issueLoginResponse(
        user,
        res,
        "Google authentication successful",
      );
    }

    // New Google account: do NOT ask for phone on the login page. Tell the
    // client this is a new signup and let the signup flow collect phone/role.
    return res.status(200).json({
      success: true,
      needsSignup: true,
      googleProfile: {
        name: googleProfile.name,
        email: googleProfile.email,
      },
      message: "This Google account is new. Please sign up to continue.",
    });
  } catch (error) {
    console.error("Google auth error:", error);

    return res.status(401).json({
      success: false,
      message: error.message || "Google authentication failed",
    });
  }
};

export const completeGoogleSignup = async (req, res) => {
  try {
    const { credential, role, phone } = req.body || {};

    if (!credential || !phone?.trim() || !["buyer", "seller"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Google account, role and phone number are required",
      });
    }

    const googleProfile = await verifyGoogleCredential(credential);

    let user = await User.findOne({
      $or: [
        { googleId: googleProfile.googleId },
        { email: googleProfile.email },
      ],
    }).select("+password");

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your account has been disabled",
        });
      }

      if (user.role === "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin accounts cannot use Google Sign-In",
        });
      }

      if (user.role !== role) {
        return res.status(403).json({
          success: false,
          message: `This email is already registered as a ${user.role}. Please use the ${user.role} account type.`,
        });
      }

      user.googleId = googleProfile.googleId;
      user.emailVerified = true;
      user.phone = user.phone?.trim() || phone.trim();
      await user.save();

      return issueLoginResponse(
        user,
        res,
        "Google authentication successful",
      );
    }

    user = await User.create({
      name: googleProfile.name.trim(),
      email: googleProfile.email,
      phone: phone.trim(),
      role,
      authProvider: "google",
      googleId: googleProfile.googleId,
      emailVerified: true,
      kycStatus: "pending",
    });

    return issueLoginResponse(
      user,
      res,
      "Google account created successfully. Please complete business verification to unlock marketplace services.",
    );
  } catch (error) {
    console.error("Complete Google signup error:", error);

    return res.status(401).json({
      success: false,
      message: error.message || "Google signup failed",
    });
  }
};

//-------------------------------------------EMAIL VERIFICATION-----------------------------------------

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query || {};

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Email verification token is required",
      });
    }

    const tokenHash = hashToken(token);

    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    }).select(
      "+emailVerificationTokenHash +emailVerificationExpires +signupSessionTokenHash +signupSessionExpires",
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This verification link is invalid or has expired",
      });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    user.signupSessionTokenHash = null;
    user.signupSessionExpires = null;

    await user.save();

    const jwtToken = generateToken(user._id.toString());

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully. You are now logged in. Please complete business verification to unlock marketplace services.",
      token: jwtToken,
      user: publicUserFields(user),
    });
  } catch (error) {
    console.error("Email verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify email",
    });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Your email is already verified",
      });
    }

    const emailResult = await createEmailVerificationForUser(user);

    return res.status(200).json({
      success: true,
      message: emailResult.sent
        ? "A new verification email has been sent"
        : "Verification email service is not configured",    });
  } catch (error) {
    console.error("Resend verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resend verification email",
    });
  }
};

export const resendSignupVerification = async (req, res) => {
  try {
    const { signupSessionToken } = req.body || {};

    if (!signupSessionToken) {
      return res.status(400).json({
        success: false,
        message: "Signup session has expired. Please start signup again.",
      });
    }

    const user = await User.findOne({
      signupSessionTokenHash: hashToken(signupSessionToken),
      signupSessionExpires: { $gt: new Date() },
    }).select("+signupSessionTokenHash +signupSessionExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Signup session has expired. Please start signup again.",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Your email is already verified. You can login now.",
      });
    }

    const emailResult = await createEmailVerificationForUser(user);

    return res.status(200).json({
      success: true,
      message: emailResult.sent
        ? "A new verification email has been sent"
        : "Verification email service is not configured",    });
  } catch (error) {
    console.error("Signup resend verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resend verification email",
    });
  }
};

export const changeSignupEmail = async (req, res) => {
  try {
    const { signupSessionToken, email } = req.body || {};

    if (!signupSessionToken || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Signup session and a new email address are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      signupSessionTokenHash: hashToken(signupSessionToken),
      signupSessionExpires: { $gt: new Date() },
    }).select("+signupSessionTokenHash +signupSessionExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Signup session has expired. Please start signup again.",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "This email is already verified. Please login instead.",
      });
    }

    const emailInUse = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    });

    if (emailInUse) {
      return res.status(409).json({
        success: false,
        message: "That email is already registered. Please use another email.",
      });
    }

    user.email = normalizedEmail;
    user.emailVerified = false;
    // Invalidate any previous verification link. The user can explicitly
    // request a fresh link with the Send Verification Email button.
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      email: user.email,
      message: "Email updated. You can now send a verification email.",
      emailVerificationSent: false,
    });
  } catch (error) {
    console.error("Change signup email error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "That email is already registered. Please use another email.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to change email address",
    });
  }
};

//-------------------------------------------PASSWORD RESET-----------------------------------------

export const forgotPassword = async (req, res) => {
  try {
    const normalizedEmail = String(req.body?.email || "")
      .toLowerCase()
      .trim();

    // Always return the same response so this endpoint cannot be used to
    // discover whether an email address has an EPR Nexus account.
    const genericResponse = {
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };

    if (!normalizedEmail) {
      return res.status(200).json(genericResponse);
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+passwordResetTokenHash +passwordResetExpires +password",
    );

    if (!user || !user.isActive || user.authProvider === "google") {
      return res.status(200).json(genericResponse);
    }

    const { rawToken, tokenHash } = createVerificationToken();

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const emailResult = await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      token: rawToken,
    });

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpires +password");

    if (!user || !user.isActive) {
      return res.status(400).json({
        success: false,
        message: "This password reset link is invalid or has expired",
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Your password has been reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset password. Please request a new link.",
    });
  }
};

