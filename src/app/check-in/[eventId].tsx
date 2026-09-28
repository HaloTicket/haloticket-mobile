import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '@/services/api/axiosClient';

import * as Haptics from 'expo-haptics';

export default function CheckInScannerScreen() {
  const { eventId, showtimeId } = useLocalSearchParams<{ eventId: string; showtimeId?: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'warning'>('idle');
  const [message, setMessage] = useState('');

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text, marginBottom: 16 }}>Cần cấp quyền truy cập camera để quét QR</Text>
        <TouchableOpacity style={{ backgroundColor: colors.primary, padding: 12, borderRadius: 8 }} onPress={requestPermission}>
          <Text style={{ color: '#fff' }}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setStatus('idle');
    try {
      const checkinData = await axiosClient.post('/tickets/checkin', {
        qrCodeHash: data,
        eventId: eventId,
        showtimeId: showtimeId || null,
        deviceInfo: Platform.OS + ' ' + Platform.Version,
        staffAssignmentId: 'current-staff-session'
      }) as any;
      if (checkinData.status === 'VALID') {
        setStatus('success');
        setMessage(`Check-in thành công!\nVé: ${checkinData.ticketTypeName}\n${checkinData.seatName || 'Khu vực tự do'}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (checkinData.status === 'DUPLICATED') {
        setStatus('warning');
        setMessage(`Vé đã được check-in!\nVé: ${checkinData.ticketTypeName}\n${checkinData.seatName || 'Khu vực tự do'}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        setStatus('error');
        setMessage('Vé không hợp lệ!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error: any) {
      console.error('Checkin Error:', error);
      setStatus('error');
      const errorMessage = error.response?.data?.message || 'Lỗi hệ thống hoặc vé không tồn tại';
      if (errorMessage.toLowerCase().includes('does not belong to this event')) {
        setMessage('Vé không thuộc sự kiện này!');
      } else {
        setMessage(errorMessage);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      
      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Quét mã QR</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Target Box Overlay */}
      <View style={styles.targetBoxContainer}>
        <View style={styles.targetBox} />
      </View>

      {/* Result Overlay */}
      {scanned && (
        <View style={[styles.resultOverlay, { backgroundColor: colors.surface }]}>
          {status === 'success' && (
            <Ionicons name="checkmark-circle" size={48} color="#34C759" style={{ marginBottom: 8 }} />
          )}
          {status === 'warning' && (
            <Ionicons name="warning" size={48} color="#FFCC00" style={{ marginBottom: 8 }} />
          )}
          {status === 'error' && (
            <Ionicons name="close-circle" size={48} color="#FF3B30" style={{ marginBottom: 8 }} />
          )}
          
          <Text style={[styles.resultText, { color: colors.text, textAlign: 'center' }]}>
            {message}
          </Text>
          
          <TouchableOpacity 
            style={[styles.scanAgainBtn, { backgroundColor: colors.primary }]}
            onPress={() => setScanned(false)}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Quét tiếp</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  targetBoxContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00E676',
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  resultOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  resultText: {
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '500',
  },
  scanAgainBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  }
});
