import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { C } from "../../src/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.emerald,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: "Ventas",
          tabBarIcon: ({ color, size }) => (
            <Feather name="shopping-cart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventario",
          tabBarIcon: ({ color, size }) => (
            <Feather name="package" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Historial",
          tabBarIcon: ({ color, size }) => (
            <Feather name="clock" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Clientes",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen name="dashboard" options={{ href: null }} />
    </Tabs>
  );
}
