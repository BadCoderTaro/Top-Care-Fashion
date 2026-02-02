declare module '@react-navigation/material-top-tabs' {
  import type * as React from 'react';
  import type { ParamListBase } from '@react-navigation/native';

  export const createMaterialTopTabNavigator: <ParamList extends ParamListBase>() => {
    Navigator: React.ComponentType<any>;
    Screen: React.ComponentType<any>;
  };
}
