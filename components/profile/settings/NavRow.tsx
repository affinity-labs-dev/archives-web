import React from 'react';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { colors } from '@/components/ui/theme';
import { SettingsCard } from './SettingsCard';
import { iconChevRow, svgIcon } from './icons';
import { settingsStyles } from './styles';

interface NavRowProps {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}

export function NavRow({ icon, title, onPress }: NavRowProps) {
  return (
    <SettingsCard onPress={onPress}>
      <View style={settingsStyles.rowContent}>
        <View style={settingsStyles.rowLeft}>
          {icon}
          <Typography family="onest" weight="600" size={14} color="onyx">
            {title}
          </Typography>
        </View>
        {svgIcon(iconChevRow(colors.concreteGrey), 10, 18)}
      </View>
    </SettingsCard>
  );
}
