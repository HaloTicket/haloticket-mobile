import { createContext, useContext, useState, ReactNode } from "react";
import { Modal, View, Text, StyleSheet, TouchableWithoutFeedback, Platform } from "react-native";
import { useAppTheme } from "@/theme";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { useTranslation } from "react-i18next";

export interface ConfirmOptions {
  confirmTone?: "primary" | "danger";
  confirmText?: string;
  cancelText?: string;
}

/** Các hàm hiển thị hộp thoại thông báo hoặc xác nhận dùng chung toàn ứng dụng. */
interface ModalContextData {
  showAlert: (title: string, message: string, onClose?: () => void) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    options?: ConfirmOptions
  ) => void;
}

const ModalContext = createContext<ModalContextData>({} as ModalContextData);

/** Trạng thái hiện tại của hộp thoại: đang hiện hay không, loại, nội dung và các hàm gọi lại. */
interface ModalState {
  visible: boolean;
  type: "alert" | "confirm";
  title: string;
  message: string;
  confirmTone?: "primary" | "danger";
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/** Cung cấp hộp thoại thông báo và xác nhận, được vẽ một lần ở gốc ứng dụng. */
export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalState, setModalState] = useState<ModalState>({
    visible: false,
    type: "alert",
    title: "",
    message: "",
  });
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  /** Hiện hộp thoại thông báo; `onClose` chạy khi người dùng đóng hộp thoại. */
  const showAlert = (title: string, message: string, onClose?: () => void) => {
    setModalState({
      visible: true,
      type: "alert",
      title,
      message,
      confirmTone: "primary",
      onConfirm: onClose,
      onCancel: onClose,
    });
  };

  /** Hiện hộp thoại có hai nút; `onConfirm` chạy khi đồng ý, `onCancel` khi hủy. */
  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    options?: ConfirmOptions
  ) => {
    setModalState({
      visible: true,
      type: "confirm",
      title,
      message,
      confirmTone: options?.confirmTone ?? "primary",
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      onConfirm,
      onCancel,
    });
  };

  /** Ẩn hộp thoại nhưng giữ nguyên nội dung cũ để tránh nháy khi đóng. */
  const hideModal = () => {
    setModalState((prev) => ({ ...prev, visible: false }));
  };

  /** Chạy hàm xác nhận (nếu có) rồi đóng hộp thoại. */
  const handleConfirm = () => {
    if (modalState.onConfirm) modalState.onConfirm();
    hideModal();
  };

  /** Chạy hàm hủy (nếu có) rồi đóng hộp thoại; cũng dùng cho nút Back trên Android. */
  const handleCancel = () => {
    if (modalState.onCancel) modalState.onCancel();
    hideModal();
  };

  const confirmBg = modalState.confirmTone === "danger" ? "#EF4444" : colors.primary;

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
                    <AnimatedPressable
                      scaleTo={0.95}
                      contentStyle={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                      onPress={handleCancel}
                    >
                      <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                        {modalState.cancelText || t("common.cancel", "Hủy")}
                      </Text>
                    </AnimatedPressable>
                  )}
                  <AnimatedPressable
                    scaleTo={0.95}
                    contentStyle={[styles.button, styles.confirmButton, { backgroundColor: confirmBg }]}
                    onPress={handleConfirm}
                  >
                    <Text style={styles.confirmButtonText}>
                      {modalState.confirmText ||
                        (modalState.type === "alert"
                          ? t("common.close", "Đóng")
                          : t("common.confirm", "Xác nhận"))}
                    </Text>
                  </AnimatedPressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ModalContext.Provider>
  );
};

/** Hook truy cập các hàm hiển thị hộp thoại; cần nằm trong {@code ModalProvider}. */
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
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
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
