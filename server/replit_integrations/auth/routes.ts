import type { Express, Request, Response, NextFunction } from "express";
import { authStorage } from "./storage";
import { storage } from "../../storage";

export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.session && (req.session as any).userId) {
    authStorage.getUser((req.session as any).userId).then(user => {
      if (!user) {
        res.status(401).json({ message: "Unauthorized" });
      } else if (!user.emailVerified) {
        res.status(403).json({ message: "Email not verified" });
      } else {
        next();
      }
    }).catch(() => {
      res.status(500).json({ message: "Authentication error" });
    });
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}

export function getSession(req: Request): { userId: string } | null {
  if (req.session && (req.session as any).userId) {
    return { userId: (req.session as any).userId };
  }
  return null;
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName, password } = req.body;
      
      if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const existingUser = await authStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const user = await authStorage.createUser({ email, firstName, lastName, password });
      
      (req.session as any).userId = user.id;
      
      console.log(`[Email Verification] Code for ${user.email}: ${user.verificationCode}`);
      
      res.status(201).json({ 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName,
        emailVerified: true,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Please register or log in first" });
      }

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Verification code is required" });
      }

      const success = await authStorage.verifyEmailCode(userId, code);
      if (!success) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/auth/resend-code", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Please register or log in first" });
      }

      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      const code = await authStorage.resendVerificationCode(userId);
      
      console.log(`[Email Verification] New code for ${user.email}: ${code}`);
      
      res.json({ 
        message: "Verification code sent",
      });
    } catch (error) {
      console.error("Resend code error:", error);
      res.status(500).json({ message: "Failed to resend code" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await authStorage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValid = await authStorage.verifyPassword(user, password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      (req.session as any).userId = user.id;
      
      if (!user.emailVerified) {
        const code = await authStorage.resendVerificationCode(user.id);
        console.log(`[Email Verification] Login code for ${user.email}: ${code}`);
        
        return res.json({ 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName,
          emailVerified: false,
        });
      }

      res.json({ 
        id: user.id, 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName,
        emailVerified: true,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

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
        emailVerified: user.emailVerified,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.delete("/api/auth/account", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      
      await storage.deleteAllUserData(userId);
      await authStorage.deleteUser(userId);
      
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
