import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { listingsService, ListingsQueryParams } from '../services';
import type { ListingItem } from '../../types/shop';

interface ListingsScreenProps {
  category?: string;
  searchQuery?: string;
}

export const ListingsScreen: React.FC<ListingsScreenProps> = ({ 
  category, 
  searchQuery 
}) => {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取商品列表
  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: ListingsQueryParams = {};
      
      if (category) {
        params.category = category;
      }
      
      if (searchQuery) {
        params.search = searchQuery;
      }

      const data = await listingsService.getListings(params);
      setListings(data.items);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [category, searchQuery]);

  // 渲染商品项
  const renderListingItem = ({ item }: { item: ListingItem }) => (
    <View style={styles.listingItem}>
      <Text style={styles.listingTitle}>{item.title}</Text>
      <Text style={styles.listingPrice}>${item.price}</Text>
      <Text style={styles.listingDescription}>{item.description}</Text>
      {item.brand && <Text style={styles.listingBrand}>Brand: {item.brand}</Text>}
      {item.size && <Text style={styles.listingSize}>Size: {item.size}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading listings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.retryText} onPress={fetchListings}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {category ? `${category} Listings` : 'All Listings'}
        {searchQuery && ` - "${searchQuery}"`}
      </Text>
      
      <FlatList
        data={listings}
        renderItem={renderListingItem}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={fetchListings}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No listings found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listingItem: {
    backgroundColor: '#fff',
    margin: 8,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  listingDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  listingBrand: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  listingSize: {
    fontSize: 12,
    color: '#888',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryText: {
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ListingsScreen;


