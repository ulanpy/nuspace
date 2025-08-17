import React, { ReactNode } from 'react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Search } from 'lucide-react';

// Error Boundary Component
class ListErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    console.warn('InfiniteList error caught by boundary:', error);
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('InfiniteList error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="text-center py-8">
          <div className="text-sm text-destructive">Error rendering list</div>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface InfiniteListProps<T> {
  // Data fetching props
  queryKey: string[];
  apiEndpoint: string;
  size?: number;
  keyword?: string;
  additionalParams?: Record<string, any>;
  transformResponse?: (response: any) => any;
  
  // Rendering props
  renderItem: (item: T, index: number) => ReactNode;
  renderEmpty?: () => ReactNode;
  renderLoading?: () => ReactNode;
  renderError?: (error: any) => ReactNode;
  renderLoadMore?: () => ReactNode;
  
  // Search props
  showSearch?: boolean;
  searchPlaceholder?: string;
  itemCountPlaceholder?: string;
  onSearchChange?: (keyword: string) => void;
  
  // Header props
  title?: string;
  
  // Layout props
  gridLayout?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}

export function InfiniteList<T>({
  queryKey,
  apiEndpoint,
  size = 12,
  keyword = "",
  additionalParams = {},
  transformResponse,
  renderItem,
  renderEmpty,
  renderLoading,
  renderError,
  renderLoadMore,
  showSearch = true,
  searchPlaceholder = "Search...",
  onSearchChange,
  title,
  gridLayout,
  itemCountPlaceholder = "Items",
}: InfiniteListProps<T>) {
  const [searchKeyword, setSearchKeyword] = React.useState(keyword);

  // Use infinite scroll hook
  const {
    items,
    isLoading,
    isError,
    isFetchingNextPage,
    keyword: hookKeyword,
    setKeyword: setHookKeyword,
  } = useInfiniteScroll<T>({
    queryKey,
    apiEndpoint,
    size,
    keyword: keyword, // Use the keyword prop directly
    additionalParams,
    transformResponse,
  });

  // Handle search changes
  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
    setHookKeyword(value);
    onSearchChange?.(value);
  };

  // Default render functions
  const defaultRenderEmpty = () => (
    <div className="text-center py-12">
      <div className="text-lg font-medium mb-2">No items found</div>
      <p className="text-sm text-muted-foreground">
        Try adjusting your search criteria.
      </p>
    </div>
  );

  const defaultRenderLoading = () => (
    <div className="text-center py-8">
      <div className="text-sm text-muted-foreground">Loading...</div>
    </div>
  );

  const defaultRenderError = () => (
    <div className="text-center py-8">
      <div className="text-sm text-destructive">Error loading items</div>
    </div>
  );

  const defaultRenderLoadMore = () => (
    <div className="text-center py-4">
      <div className="text-sm text-muted-foreground">Loading more items...</div>
    </div>
  );

  // Use provided render functions or defaults
  const emptyContent = renderEmpty ? renderEmpty() : defaultRenderEmpty();
  const loadingContent = renderLoading ? renderLoading() : defaultRenderLoading();
  const errorContent = renderError ? renderError(isError) : defaultRenderError();
  const loadMoreContent = renderLoadMore ? renderLoadMore() : defaultRenderLoadMore();

  if (isLoading) return <div>{loadingContent}</div>;
  if (isError) return <div>{errorContent}</div>;

  return (
    <ListErrorBoundary>
      <div className="w-full">
        {/* Header */}
        {title && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            {/* Debug info */}
            {itemCountPlaceholder && (
              <div className="text-xs text-muted-foreground mt-1">
                {itemCountPlaceholder}: {items.length}
              </div>
            )}
          </div>
        )}

        {/* Search Input */}
        {showSearch && (
          <div className="mb-6">
            <span className="flex items-center gap-2 border border-input bg-background rounded-md">
              <Search className="w-4 h-4 ml-2" />
              <input
              type="text"
              value={searchKeyword}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-10 px-3 py-2 bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            </span>
          </div>
        )}

        {/* Content */}
        {items.length === 0 ? (
          emptyContent
        ) : (
          <div className="w-full">
            {/* Grid or regular scrolling implementation */}
            {gridLayout ? (
              <div className={`grid gap-4 ${
                gridLayout.mobile ? `grid-cols-${gridLayout.mobile}` : 'grid-cols-1'
              } ${
                gridLayout.tablet ? `md:grid-cols-${gridLayout.tablet}` : ''
              } ${
                gridLayout.desktop ? `lg:grid-cols-${gridLayout.desktop}` : ''
              }`}>
                {items.map((item, index) => (
                  <div key={index}>
                    {renderItem(item, index)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index}>
                    {renderItem(item, index)}
                  </div>
                ))}
              </div>
            )}
            
            {/* Load more indicator */}
            {isFetchingNextPage && (
              <div className="mt-4">
                {loadMoreContent}
              </div>
            )}
          </div>
        )}
      </div>
    </ListErrorBoundary>
  );
}
