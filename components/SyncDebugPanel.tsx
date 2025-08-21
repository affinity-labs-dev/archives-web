// Sync Debug Panel - For testing and monitoring background sync
// Remove this component after testing is complete

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useBackgroundSync } from '@/context/BackgroundSyncProvider';
import { useProgress } from '@/context/ProgressContext';
import { ArchivesTheme } from '@/constants/ArchivesTheme';

export function SyncDebugPanel() {
  const { syncStatus, manualSync } = useBackgroundSync();
  const { selectedEra, adventureProgress, moduleProgress } = useProgress();

  const handleManualSync = async () => {
    const success = await manualSync();
    Alert.alert(
      'Manual Sync',
      success ? 'Sync completed successfully!' : 'Sync failed. Check network connection.',
      [{ text: 'OK' }]
    );
  };

  const getStatusColor = () => {
    if (syncStatus.isSyncing) return ArchivesTheme.colors.persianOrange;
    if (!syncStatus.isOnline) return ArchivesTheme.colors.mutedNavy;
    if (syncStatus.syncError) return '#ff4444';
    return ArchivesTheme.colors.mossGreen;
  };

  const getStatusText = () => {
    if (syncStatus.isSyncing) return 'Syncing...';
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.syncError) return 'Error';
    return 'Online';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔄 Sync Debug Panel</Text>
      
      {/* Sync Status */}
      <View style={styles.row}>
        <Text style={styles.label}>Status:</Text>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={[styles.status, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {/* Queue Info */}
      <View style={styles.row}>
        <Text style={styles.label}>Queue:</Text>
        <Text style={styles.value}>{syncStatus.queuedOperations} operations</Text>
      </View>

      {/* Last Sync */}
      <View style={styles.row}>
        <Text style={styles.label}>Last Sync:</Text>
        <Text style={styles.value}>
          {syncStatus.lastSyncTime 
            ? syncStatus.lastSyncTime.toLocaleTimeString()
            : 'Never'
          }
        </Text>
      </View>

      {/* Error */}
      {syncStatus.syncError && (
        <View style={styles.row}>
          <Text style={styles.label}>Error:</Text>
          <Text style={[styles.value, { color: '#ff4444' }]}>
            {syncStatus.syncError}
          </Text>
        </View>
      )}

      {/* Local Data Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Local Data</Text>
        <Text style={styles.dataText}>Era: {selectedEra || 'None'}</Text>
        <Text style={styles.dataText}>Adventures: {adventureProgress.length}</Text>
        <Text style={styles.dataText}>Modules: {moduleProgress.length}</Text>
      </View>

      {/* Manual Sync Button */}
      <TouchableOpacity 
        style={[styles.syncButton, syncStatus.isSyncing && styles.syncButtonDisabled]}
        onPress={handleManualSync}
        disabled={syncStatus.isSyncing || !syncStatus.isOnline}
      >
        <Text style={styles.syncButtonText}>
          {syncStatus.isSyncing ? 'Syncing...' : 'Manual Sync'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: ArchivesTheme.colors.creamWhite,
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ArchivesTheme.colors.shoeBrown,
    ...ArchivesTheme.shadows.small,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: ArchivesTheme.colors.mutedNavy,
    width: 80,
  },
  value: {
    fontSize: 14,
    color: ArchivesTheme.colors.shoeBrown,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: ArchivesTheme.colors.persianOrange + '30',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: ArchivesTheme.colors.shoeBrown,
    marginBottom: 8,
  },
  dataText: {
    fontSize: 12,
    color: ArchivesTheme.colors.mutedNavy,
    marginBottom: 4,
  },
  syncButton: {
    backgroundColor: ArchivesTheme.colors.persianOrange,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: ArchivesTheme.colors.mutedNavy + '50',
  },
  syncButtonText: {
    color: ArchivesTheme.colors.creamWhite,
    fontSize: 14,
    fontWeight: '600',
  },
});