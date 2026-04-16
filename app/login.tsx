import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ThemedTextInput from "../src/components/ui/ThemedTextInput";
import { C } from "../src/constants/colors";
import { useToast } from "../src/context/ToastContext";
import { supabase } from "../src/services/supabase";

export default function Login() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast("Completa todos los campos", "error");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      showToast("Credenciales incorrectas o hubo un problema al entrar.", "error");
      return;
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        {/* ── Logo ── */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>

        {/* ── Formulario ── */}
        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <ThemedTextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="tu@email.com"
            placeholderTextColor="#3a6b50"
            style={styles.input}
            selectionColor="transparent"
            underlineColorAndroid="transparent"
          />

          <Text style={styles.label}>Contraseña</Text>
          <ThemedTextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#3a6b50"
            style={styles.input}
            selectionColor="transparent"
            underlineColorAndroid="transparent"
          />

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={C.bg} />
            ) : (
              <Text style={styles.btnText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Links ── */}
        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.registerText}>
            Eres dueño?{" "}
            <Text style={styles.registerTextBold}>Registra tu empresa</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.joinLink}
          onPress={() => router.push("/join")}
        >
          <Text style={styles.registerText}>
            Eres empleado?{" "}
            <Text style={styles.registerTextBold}>Únete con código</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },

  // Logo
  logoContainer: {
    alignItems: "center",
    marginBottom: 4,
  },
  logo: {
    width: 240,
    height: 120,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#212121",
    textAlign: "center",
    marginBottom: 24,
  },

  // Form card
  formCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    shadowColor: C.emerald,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  label: {
    color: "#114224",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: C.text,
    marginBottom: 18,
  },

  // Botón
  btnPrimary: {
    backgroundColor: C.emerald,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    shadowColor: C.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  btnDisabled: {
    backgroundColor: "#134e2a",
    shadowOpacity: 0,
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Link registro
  registerLink: {
    marginTop: 28,
    alignItems: "center",
  },
  registerText: {
    color: C.textMuted,
    fontSize: 14,
  },
  registerTextBold: {
    fontWeight: "700",
    color: C.emerald,
  },
  joinLink: {
    marginTop: 12,
    alignItems: "center",
  },
});
