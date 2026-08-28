import { useState } from "react";
import { StaffUser } from "@/types";

export const useAuth = () => {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const login = async (username: string, pin: string) => {
    // Staff login logic stub
    console.log("Logging in staff:", username);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setStaff(null);
    setIsAuthenticated(false);
  };

  return { staff, isAuthenticated, login, logout };
};
