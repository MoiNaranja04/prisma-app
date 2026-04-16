import { Redirect } from "expo-router";
import { useCompany } from "../../src/hooks/useCompany";
import PosScreen from "./pos";

export default function IndexScreen() {
  const { role, loading } = useCompany();

  if (loading) return null;

  // Admin: redirect to dashboard tab
  if (role === "admin") {
    return <Redirect href="/dashboard" />;
  }

  // Employee: render POS directly
  return <PosScreen />;
}
