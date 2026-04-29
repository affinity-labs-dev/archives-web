import React from 'react';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { SettingsCard } from './SettingsCard';
import { ToggleSwitch } from './ToggleSwitch';
import { settingsStyles } from './styles';

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
}

export function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: ToggleRowProps) {
  return (
    <SettingsCard>
      <View style={settingsStyles.rowContent}>
        <View style={settingsStyles.rowLeft}>
          {icon}
          <View style={settingsStyles.textStack}>
            <Typography family="onest" weight="600" size={16} color="onyx">
              {title}
            </Typography>
            <Typography
              family="onest"
              weight="500"
              size={12}
              color="onyx"
              style={{ opacity: 0.72 }}
            >
              {subtitle}
            </Typography>
          </View>
        </View>
        <ToggleSwitch value={value} onValueChange={onValueChange} />
      </View>
    </SettingsCard>
  );
}
