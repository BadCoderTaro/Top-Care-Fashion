import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export type IconProps = React.ComponentProps<typeof Ionicons> & {
  testID?: string;
};

const Icon: React.FC<IconProps> = ({ size = 24, accessibilityRole = 'image', ...rest }) => {
  return <Ionicons size={size} accessibilityRole={accessibilityRole} {...rest} />;
};

export default Icon;
