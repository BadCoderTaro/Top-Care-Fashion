import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import LikesTab from './LikesTab';
import SavedOutfitsTab from './SavedOutfitsTab';

const TopTabs = createMaterialTopTabNavigator();

export default function LikesTabs() {
  return (
    <View style={styles.container}>
      <TopTabs.Navigator
        initialRouteName="Likes"
        screenOptions={{
          tabBarIndicatorStyle: {
            backgroundColor: '#000',
          },
          tabBarLabelStyle: { fontWeight: '600', textTransform: 'none', fontSize: 14 },
          tabBarActiveTintColor: '#000',
          tabBarInactiveTintColor: '#666',
          tabBarStyle: { 
            backgroundColor: '#fff',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#eee',
          },
        }}
      >
        <TopTabs.Screen
          name="Likes"
          component={LikesTab}
        />
        <TopTabs.Screen
          name="SavedOutfits"
          component={SavedOutfitsTab}
          options={{ title: 'Saved Outfits' }}
        />
      </TopTabs.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
