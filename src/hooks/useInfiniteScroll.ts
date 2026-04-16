import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, ActivityIndicator, Text } from 'react-native';

interface UseInfiniteScrollOptions<T> {
  fetchData: (page: number) => Promise<T[]>;
  initialPage?: number;
  pageSize?: number;
}

interface UseInfiniteScrollResult<T> {
  data: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  FlatListComponent: typeof FlatList;
}

export function useInfiniteScroll<T>({
  fetchData,
  initialPage = 1,
  pageSize = 20,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      if (isRefresh) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const newData = await fetchData(pageNum);

      if (isRefresh) {
        setData(newData);
        setPage(initialPage + 1);
      } else {
        setData(prev => [...prev, ...newData]);
        setPage(prev => prev + 1);
      }

      setHasMore(newData.length >= pageSize);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchData, initialPage, pageSize]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      loadData(page);
    }
  }, [loadingMore, hasMore, loading, page, loadData]);

  const refresh = useCallback(() => {
    setData([]);
    setPage(initialPage);
    setHasMore(true);
    loadData(initialPage, true);
  }, [initialPage, loadData]);

  const FlatListComponent = useCallback(
    ({ renderItem, ListEmptyComponent, ListFooterComponent, ...props }: any) => (
      <FlatList
        {...props}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0F5E3C" />
            </View>
          ) : ListEmptyComponent ? (
            ListEmptyComponent
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#0F5E3C" />
            </View>
          ) : !hasMore && data.length > 0 ? (
            <Text style={styles.endText}>No hay más datos</Text>
          ) : ListFooterComponent ? (
            ListFooterComponent
          ) : null
        }
      />
    ),
    [loadMore, loading, loadingMore, hasMore, data.length]
  );

  return {
    data,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    FlatListComponent,
  };
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  endText: {
    textAlign: 'center',
    color: '#667085',
    fontSize: 13,
    padding: 20,
  },
});
