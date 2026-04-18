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

export default function Register() {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!email || !password) {
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

      // 2. RPC: crear empresa + membership + categorías (SECURITY DEFINER)
      const { data: result, error: rpcError } = await supabase.rpc(
        "register_company",
        {
          p_user_id: user.id,
          p_business_type: businessType,
        },
      );

      if (rpcError) throw rpcError;

      // 3. Actualizar nombre de empresa si se proporcionó
      if (companyName.trim()) {
        await supabase
          .from("companies")
          .update({ name: companyName.trim() })
          .eq("invite_code", result.invite_code);
      }

      // 4. Mostrar el código de invitación generado
      setInviteCode(result.invite_code);
    } catch {
      showToast(
        "Hubo un problema al crear tu cuenta. Verifica los datos o intenta de nuevo.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Pantalla de éxito con código ──
  if (inviteCode) {
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

          <Text style={styles.appName}>Empresa creada</Text>
          <Text style={styles.subtitle}>
            Comparte este código con tus empleados
          </Text>

          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>CÓDIGO DE INVITACIÓN</Text>
            <Text style={styles.codeValue}>{inviteCode}</Text>
            <Text style={styles.codeHint}>
              Tus empleados usarán este código para unirse a tu empresa desde la
              pantalla &ldquo;Unirse a empresa&rdquo;
            </Text>
          </View>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.btnText}>Ir a iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Formulario de registro ──
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

        <Text style={styles.subtitle}>Registrar una empresa</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Nombre de tu empresa / negocio</Text>
          <ThemedTextInput
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Ej: Tienda Don José"
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

          <Text style={styles.label}>Tipo de negocio</Text>
          <ThemedTextInput
            value={businessType}
            onChangeText={setBusinessType}
            placeholder="tienda/carpinteria/panaderia"
            placeholderTextColor="#3a6b50"
            style={styles.input}
            selectionColor="transparent"
            underlineColorAndroid="transparent"
          />

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={C.bg} />
            ) : (
              <Text style={styles.btnText}>Crear empresa</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push("/join")}
        >
          <Text style={styles.loginText}>
            Eres empleado?{" "}
            <Text style={styles.loginTextBold}>Únete con código</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.loginText}>
            Ya tienes cuenta?{" "}
            <Text style={styles.loginTextBold}>Inicia sesión</Text>
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
  appName: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 4,
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

  // Código de invitación (pantalla éxito)
  codeCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.emerald,
    padding: 24,
    alignItems: "center",
  },
  codeLabel: {
    color: C.textMuted,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 12,
  },
  codeValue: {
    color: C.emerald,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 6,
    marginBottom: 16,
  },
  codeHint: {
    color: C.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
