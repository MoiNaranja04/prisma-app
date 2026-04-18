import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { FloatingModal } from "../ui/FloatingModal";
import ThemedTextInput from "../ui/ThemedTextInput";
import { C } from "../../constants/colors";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../lib/supabase";

interface Props {
    visible: boolean;
    onClose: () => void;
    userName: string;
    role: "admin" | "employee";
}

export function ProfileModal({ visible, onClose, userName, role }: Props) {
    const { showToast } = useToast();

    // Password change
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);

    // Logout confirm
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Reset state when modal closes
    useEffect(() => {
        if (!visible) {
            setShowPasswordForm(false);
            setShowLogoutConfirm(false);
            setNewPassword("");
            setConfirmPassword("");
        }
    }, [visible]);

    const handleChangePassword = useCallback(async () => {
        if (!newPassword.trim() || newPassword.length < 6) {
            showToast("La contraseña debe tener al menos 6 caracteres", "error");
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast("Las contraseñas no coinciden", "error");
            return;
        }

        setSavingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });
            if (error) throw error;
            showToast("Contraseña actualizada correctamente", "success");
            setShowPasswordForm(false);
            setNewPassword("");
            setConfirmPassword("");
        } catch {
            showToast("Error al cambiar la contraseña. Intenta nuevamente.", "error");
        } finally {
            setSavingPassword(false);
        }
    }, [newPassword, confirmPassword, showToast]);

    const handleLogout = useCallback(async () => {
        setShowLogoutConfirm(false);
        onClose();
        await supabase.auth.signOut();
    }, [onClose]);

    return (
        <FloatingModal
            visible={visible}
            onRequestClose={onClose}
            cardStyle={styles.container}
        >
                <View>
                    {/* ─── Main Profile View ─── */}
                    {!showPasswordForm && !showLogoutConfirm && (
                        <>
                            {/* Avatar */}
                            <View style={styles.avatarContainer}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {(userName || "?")[0].toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.name}>{userName}</Text>
                            <View style={styles.roleBadge}>
                                <Feather name="shield" size={12} color={C.emerald} />
                                <Text style={styles.roleText}>
                                    {role === "admin" ? "Administrador" : "Empleado"}
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            {/* Actions */}
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => setShowPasswordForm(true)}
                                activeOpacity={0.7}
                            >
                                <Feather name="lock" size={16} color={C.emerald} />
                                <Text style={styles.actionText}>Cambiar contraseña</Text>
                                <Feather name="chevron-right" size={16} color={C.textMuted} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, styles.logoutAction]}
                                onPress={() => setShowLogoutConfirm(true)}
                                activeOpacity={0.7}
                            >
                                <Feather name="log-out" size={16} color="#B91C1C" />
                                <Text style={styles.logoutText}>Cerrar sesión</Text>
                                <Feather name="chevron-right" size={16} color="#B91C1C" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.closeBtn}
                                onPress={onClose}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.closeBtnText}>Cerrar</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ─── Password Form ─── */}
                    {showPasswordForm && (
                        <>
                            <Text style={styles.formTitle}>Cambiar contraseña</Text>

                            <ThemedTextInput
                                style={styles.input}
                                placeholder="Nueva contraseña"
                                placeholderTextColor={C.textMuted}
                                secureTextEntry
                                value={newPassword}
                                onChangeText={setNewPassword}
                                selectionColor="transparent"
                                underlineColorAndroid="transparent"
                            />
                            <ThemedTextInput
                                style={[styles.input, { marginTop: 10 }]}
                                placeholder="Confirmar contraseña"
                                placeholderTextColor={C.textMuted}
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                selectionColor="transparent"
                                underlineColorAndroid="transparent"
                            />

                            <View style={styles.formButtons}>
                                <TouchableOpacity
                                    style={styles.formBtnCancel}
                                    onPress={() => {
                                        setShowPasswordForm(false);
                                        setNewPassword("");
                                        setConfirmPassword("");
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.formBtnCancelText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.formBtnSave}
                                    onPress={handleChangePassword}
                                    disabled={savingPassword}
                                    activeOpacity={0.7}
                                >
                                    {savingPassword ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={styles.formBtnSaveText}>Guardar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* ─── Logout Confirm ─── */}
                    {showLogoutConfirm && (
                        <>
                            <Text style={styles.formTitle}>¿Cerrar sesión?</Text>
                            <Text style={styles.logoutMessage}>
                                ¿Estás seguro de que quieres cerrar sesión?
                            </Text>

                            <View style={styles.formButtons}>
                                <TouchableOpacity
                                    style={styles.formBtnCancel}
                                    onPress={() => setShowLogoutConfirm(false)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.formBtnCancelText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.logoutConfirmBtn}
                                    onPress={handleLogout}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.logoutConfirmText}>Cerrar sesión</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
        </FloatingModal>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: C.card,
        padding: 24,
        width: "100%",
        maxWidth: 340,
    },

    // Avatar
    avatarContainer: {
        alignItems: "center",
        marginBottom: 14,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: C.emerald,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#FFF",
        fontSize: 22,
        fontWeight: "700",
    },

    // Info
    name: {
        fontSize: 18,
        fontWeight: "600",
        color: C.text,
        textAlign: "center",
    },
    roleBadge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: 6,
    },
    roleText: {
        fontSize: 12,
        color: C.emerald,
        fontWeight: "600",
    },
    divider: {
        height: 1,
        backgroundColor: C.border,
        marginVertical: 18,
    },

    // Actions
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: C.inputBg,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: C.border,
    },
    actionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "500",
        color: C.text,
    },
    logoutAction: {
        backgroundColor: "#FEE2E2",
        borderColor: "#FEE2E2",
    },
    logoutText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "500",
        color: "#B91C1C",
    },

    closeBtn: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
        marginTop: 8,
    },
    closeBtnText: {
        color: C.textMuted,
        fontSize: 14,
        fontWeight: "500",
    },

    // Password form
    formTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: C.text,
        textAlign: "center",
        marginBottom: 16,
    },
    input: {
        backgroundColor: C.inputBg,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: C.text,
    },
    formButtons: {
        flexDirection: "row",
        gap: 12,
        marginTop: 18,
    },
    formBtnCancel: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: "center",
    },
    formBtnCancelText: {
        fontSize: 14,
        fontWeight: "600",
        color: C.textMuted,
    },
    formBtnSave: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: C.emerald,
        alignItems: "center",
    },
    formBtnSaveText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFF",
    },

    // Logout confirm
    logoutMessage: {
        fontSize: 14,
        color: C.textMuted,
        textAlign: "center",
        marginBottom: 4,
    },
    logoutConfirmBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#B42318",
        alignItems: "center",
    },
    logoutConfirmText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFF",
    },
});
