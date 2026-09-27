import { createContext, useContext, useState, ReactNode } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Platform } from "react-native";
import { useAppTheme } from "@/theme";

interface ModalContextData {
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const ModalContext = createContext<ModalContextData>({} as ModalContextData);

interface ModalState {
  visible: boolean;
  type: "alert" | "confirm";
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalState, setModalState] = useState<ModalState>({
    visible: false,
    type: "alert",
    title: "",
    message: "",
  });
  const { colors } = useAppTheme();

  const showAlert = (title: string, message: string) => {
    setModalState({ visible: true, type: "alert", title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setModalState({ visible: true, type: "confirm", title, message, onConfirm, onCancel });
  };

  const hideModal = () => {
    setModalState((prev) => ({ ...prev, visible: false }));
  };

  const handleConfirm = () => {
    if (modalState.onConfirm) modalState.onConfirm();
    hideModal();
  };

  const handleCancel = () => {
    if (modalState.onCancel) modalState.onCancel();
    hideModal();
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <Modal
        visible={modalState.visible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <TouchableWithoutFeedback onPress={handleCancel}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>{modalState.title}</Text>
                <Text style={[styles.message, { color: colors.textSecondary }]}>{modalState.message}</Text>
                
                <View style={styles.buttonContainer}>
                  {modalState.type === "confirm" && (
                    <TouchableOpacity 
                      style={[styles.button, styles.cancelButton, { borderColor: colors.border }]} 
                      onPress={handleCancel}
                    >
                      <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Hủy</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.button, styles.confirmButton, { backgroundColor: colors.primary }]} 
                    onPress={handleConfirm}
                  >
                    <Text style={styles.confirmButtonText}>
                      {modalState.type === "alert" ? "Đóng" : "Xác nhận"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    ...(Platform.OS === "web" ? { zIndex: 9999, position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } : {}),
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
