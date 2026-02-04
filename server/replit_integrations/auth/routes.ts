import type { Express, Request, Response, NextFunction } from "express";
import { authStorage } from "./storage";
import { storage } from "../../storage";

// Custom auth middleware - checks session for user
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.session && (req.session as any).userId) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}

// Get session helper for routes
export function getSession(req: Request): { userId: string } | null {
  if (req.session && (req.session as any).userId) {
    return { userId: (req.session as any).userId };
  }
  return null;
}

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Register new user
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName, password } = req.body;
      
      if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Check if user already exists
      const existingUser = await authStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Create user
      const user = await authStorage.createUser({ email, firstName, lastName, password });
      
      // Set session
      (req.session as any).userId = user.id;
      
      res.status(201).json({ 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Login user
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find user
      const user = await authStorage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isValid = await authStorage.verifyPassword(user, password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      (req.session as any).userId = user.id;
      
      res.json({ 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout user
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Delete user account
  app.delete("/api/auth/account", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      
      // First delete all user data (contracts, analysis history, etc.)
      await storage.deleteAllUserData(userId);
      
      // Then delete the user account
      await authStorage.deleteUser(userId);
      
      // Destroy the session
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session after account deletion:", err);
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });
}
