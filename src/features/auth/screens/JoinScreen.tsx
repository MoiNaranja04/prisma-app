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
import ThemedTextInput from "@/src/components/ui/ThemedTextInput";
import { APP_LOGO } from "@/src/constants/assets";
import { C } from "@/src/constants/colors";
import { useToast } from "@/src/context/ToastContext";
import { supabase } from "@/src/lib/supabase";

export default function Join() {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!name.trim() || !email || !password || !inviteCode.trim()) {
      showToast("Completa todos los campos", "error");
      return;
    }

    setLoading(true);

    try {
      // 1. Crear usuario en Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error("No se pudo crear el usuario");

      // 2. Unirse a la empresa con el código (RPC con SECURITY DEFINER)
      const { data: result, error: joinError } = await supabase.rpc(
        "join_company_by_code",
        {
          p_invite_code: inviteCode.trim(),
          p_user_id: user.id,
          p_user_name: name.trim(),
        },
      );

      if (joinError) throw joinError;

      showToast(
        `Te uniste a "${result.company_name}" como empleado`,
        "success",
      );
      router.replace("/login");
    } catch {
      showToast(
        "El código es inválido o hubo un problema al intentar unirte.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={APP_LOGO}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.subtitle}>Unirse a una empresa</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Nombre completo</Text>
          <ThemedTextInput
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholder="Ej: Juan Pérez"
            placeholderTextColor="#3a6b50"
            style={styles.input}
            selectionColor="transparent"
            underlineColorAndroid="transparent"
          />

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

          <Text style={styles.label}>Código de invitación</Text>
          <ThemedTextInput
            value={inviteCode}
            onChangeText={(value: string) => setInviteCode(value.toUpperCase())}
            autoCapitalize="characters"
            placeholder="Ej: A1B2C3D4"
            placeholderTextColor="#3a6b50"
            style={[styles.input, styles.codeInput]}
            selectionColor="transparent"
            underlineColorAndroid="transparent"
          />
          <Text style={styles.hint}>
            Pide el código al administrador de tu empresa
          </Text>

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleJoin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={C.bg} />
            ) : (
              <Text style={styles.btnText}>Unirme a la empresa</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.loginText}>
            Ya tienes cuenta?{" "}
            <Text style={styles.loginTextBold}>Inicia sesión</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.loginText}>
            Eres dueño?{" "}
            <Text style={styles.loginTextBold}>Registra tu empresa</Text>
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
  formCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    padding: 24,
    shadowColor: C.emerald,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
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
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: C.text,
    marginBottom: 20,
  },
  codeInput: {
    letterSpacing: 4,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  hint: {
    color: "#3a6b50",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 18,
    marginTop: -10,
  },
  btnPrimary: {
    backgroundColor: C.emerald,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: C.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: "#134e2a",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  loginLink: {
    marginTop: 28,
    alignItems: "center",
  },
  registerLink: {
    marginTop: 12,
    alignItems: "center",
  },
  loginText: {
    color: C.textMuted,
    fontSize: 14,
  },
  loginTextBold: {
    fontWeight: "700",
    color: C.emerald,
  },
});
