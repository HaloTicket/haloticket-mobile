import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Animated, Easing, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '@/services/api/axiosClient';
import { useAuth } from '@/hooks/useAuth';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const SCAN_BOX_SIZE = 260;

export default function CheckInScannerScreen() {
  const { eventId, showtimeId } = useLocalSearchParams<{ eventId: string; showtimeId?: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'warning'>('idle');
  const [message, setMessage] = useState('');

  // Scanner Animation
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    if (!scanned && permission?.granted) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: SCAN_BOX_SIZE - 4, // move to bottom
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0, // move to top
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ])
      );
      animation.start();
    } else {
      scanLineAnim.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [scanned, permission?.granted]);

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
        staffAssignmentId: user?.id || user?.email || 'unknown-staff'
      }) as any;
      if (checkinData.status === 'VALID' || checkinData.status === 'SUCCESS' || checkinData.status === 'USED') {
        setStatus('success');
        setMessage(`REDEEM THÀNH CÔNG!\nVé: ${checkinData.ticketTypeName}\n${checkinData.seatName || 'Khu vực tự do'}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (checkinData.status === 'DUPLICATED') {
        setStatus('warning');
        setMessage(`VÉ ĐÃ ĐƯỢC SỬ DỤNG (REDEEMED)!\nVé: ${checkinData.ticketTypeName}\n${checkinData.seatName || 'Khu vực tự do'}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        setStatus('error');
        setMessage('VÉ KHÔNG HỢP LỆ!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error: any) {
      console.error('Checkin Error:', error);
      setStatus('error');
      
      const resStatus = error.response?.status;
      const errorMessage = error.response?.data?.message || 'Lỗi hệ thống hoặc vé không tồn tại';
      
      if (resStatus === 409) {
        setMessage('VÉ ĐÃ ĐƯỢC SỬ DỤNG TẠI CỔNG KHÁC (Double-scan)!');
      } else if (errorMessage.toLowerCase().includes('does not belong to this event')) {
        setMessage('VÉ KHÔNG THUỘC SỰ KIỆN NÀY!');
      } else if (errorMessage.toLowerCase().includes('does not belong to this showtime')) {
        setMessage('VÉ KHÔNG THUỘC SUẤT DIỄN NÀY!');
      } else {
        setMessage(errorMessage.toUpperCase());
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
      
      {/* Dark Overlay with Transparent Hole */}
      <View style={styles.overlayContainer}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddleRow}>
          <View style={styles.overlaySide} />
          <View style={styles.targetBox}>
             {!scanned && (
               <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineAnim }] }]} />
             )}
             
             {/* Corner borders */}
             <View style={[styles.corner, styles.topLeft]} />
             <View style={[styles.corner, styles.topRight]} />
             <View style={[styles.corner, styles.bottomLeft]} />
             <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Quét mã QR</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Result Overlay */}
      {scanned && (
        <View style={[styles.resultOverlay, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconWrapper, 
            status === 'success' ? { backgroundColor: 'rgba(52, 199, 89, 0.15)' } :
            status === 'warning' ? { backgroundColor: 'rgba(255, 204, 0, 0.15)' } :
            { backgroundColor: 'rgba(255, 59, 48, 0.15)' }
          ]}>
            {status === 'success' && <Ionicons name="checkmark-circle" size={64} color="#34C759" />}
            {status === 'warning' && <Ionicons name="warning" size={64} color="#FFCC00" />}
            {status === 'error' && <Ionicons name="close-circle" size={64} color="#FF3B30" />}
          </View>
          
          <Text style={[styles.resultText, { 
            color: status === 'success' ? '#34C759' : status === 'warning' ? '#FFCC00' : '#FF3B30'
          }]}>
            {message}
          </Text>
          
          <TouchableOpacity 
            style={[styles.scanAgainBtn, { backgroundColor: colors.primary }]}
            onPress={() => setScanned(false)}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>QUÉT TIẾP TỤC</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  overlayMiddleRow: { flexDirection: 'row', height: SCAN_BOX_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  targetBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    position: 'relative'
  },
  scanLine: {
    width: '100%',
    height: 4,
    backgroundColor: '#00E676',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#00E676' },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  
  headerOverlay: {
    position: 'absolute', top: 50, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, zIndex: 10,
  },
  backBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  
  resultOverlay: {
    position: 'absolute', bottom: 40, left: 24, right: 24,
    padding: 32, borderRadius: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 15,
    zIndex: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  iconWrapper: {
    padding: 16, borderRadius: 50, marginBottom: 16
  },
  resultText: {
    fontSize: 20, marginBottom: 32, fontWeight: '700', textAlign: 'center', lineHeight: 28
  },
  scanAgainBtn: {
    width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8
  }
});
