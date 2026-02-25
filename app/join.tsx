import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { C } from "../src/constants/colors";
import { useToast } from "../src/context/ToastContext";
import { supabase } from "../src/services/supabase";

export default function Join() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!email || !password || !inviteCode.trim()) {
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
        { p_invite_code: inviteCode.trim(), p_user_id: user.id },
      );

      if (joinError) throw joinError;

      showToast(`Te uniste a "${result.company_name}" como empleado`, "success");
      router.replace("/login");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={styles.prismBadge}>
          <Text style={styles.prismP}>P</Text>
          <Text style={styles.prismR}>R</Text>
          <Text style={styles.prismI}>I</Text>
          <Text style={styles.prismS}>S</Text>
          <Text style={styles.prismM}>M</Text>
          <Text style={styles.prismA}>A</Text>
        </View>

        <Text style={styles.appName}>Prisma Cactus</Text>
        <Text style={styles.subtitle}>Unirse a una empresa</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="tu@email.com"
            placeholderTextColor="#3a6b50"
            style={styles.input}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#3a6b50"
            style={styles.input}
          />

          <Text style={styles.label}>Código de invitación</Text>
          <TextInput
            value={inviteCode}
            onChangeText={(v) => setInviteCode(v.toUpperCase())}
            autoCapitalize="characters"
            placeholder="Ej: A1B2C3D4"
            placeholderTextColor="#3a6b50"
            style={[styles.input, styles.codeInput]}
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
  prismBadge: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  prismP: { fontSize: 32, fontWeight: "900", color: C.emerald },
  prismR: { fontSize: 32, fontWeight: "900", color: C.cyan },
  prismI: { fontSize: 32, fontWeight: "900", color: C.emeraldLight },
  prismS: { fontSize: 32, fontWeight: "900", color: C.gold },
  prismM: { fontSize: 32, fontWeight: "900", color: C.violet },
  prismA: { fontSize: 32, fontWeight: "900", color: C.emerald },
  appName: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    marginBottom: 32,
  },
  formCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
  },
  label: {
    color: C.textMuted,
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
    backgroundColor: C.violet,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: {
    backgroundColor: "#134e2a",
  },
  btnText: {
    color: C.text,
    fontSize: 15,
    fontWeight: "700",
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
