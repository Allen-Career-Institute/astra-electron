import { DeepLinkData } from '../../types/preload';

export class DeepLinkUtils {
  private static readonly PROTOCOL = 'astra-console://';

  /**
   * Create a deep link URL with query parameters
   * @param action - The action to perform
   * @param params - Additional parameters
   * @returns Deep link URL
   */
  static createDeepLink(
    action: string,
    params: Record<string, string> = {}
  ): string {
    const queryString = new URLSearchParams({ action, ...params }).toString();
    return `${this.PROTOCOL}?${queryString}`;
  }

  /**
   * Create a deep link URL with path segments
   * @param action - The action to perform
   * @param id - Optional ID parameter
   * @param params - Additional query parameters
   * @returns Deep link URL
   */
  static createDeepLinkWithPath(
    action: string,
    id?: string,
    params: Record<string, string> = {}
  ): string {
    const path = id ? `/${action}/${id}` : `/${action}`;
    const queryString = new URLSearchParams(params).toString();
    return `${this.PROTOCOL}${path}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Create a deep link for opening a stream
   * @param streamId - Stream ID
   * @param params - Additional parameters
   * @returns Deep link URL
   */
  static createStreamDeepLink(
    streamId: string,
    params: Record<string, string> = {}
  ): string {
    return this.createDeepLinkWithPath('open-stream', streamId, params);
  }

  /**
   * Create a deep link for opening a whiteboard
   * @param whiteboardId - Whiteboard ID
   * @param params - Additional parameters
   * @returns Deep link URL
   */
  static createWhiteboardDeepLink(
    whiteboardId: string,
    params: Record<string, string> = {}
  ): string {
    return this.createDeepLinkWithPath('open-whiteboard', whiteboardId, params);
  }

  /**
   * Create a deep link for navigation
   * @param route - Route to navigate to
   * @param params - Additional parameters
   * @returns Deep link URL
   */
  static createNavigationDeepLink(
    route: string,
    params: Record<string, string> = {}
  ): string {
    return this.createDeepLinkWithPath('navigate', route, params);
  }

  /**
   * Parse a deep link URL and extract data
   * @param url - Deep link URL
   * @returns Parsed deep link data
   */
  static parseDeepLink(url: string): DeepLinkData | null {
    try {
      if (!url.startsWith(this.PROTOCOL)) {
        return null;
      }

      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      const queryParams = new URLSearchParams(urlObj.search);

      const action = pathSegments[0] || queryParams.get('action') || undefined;
      const id = pathSegments[1] || queryParams.get('id') || undefined;
      const type = queryParams.get('type') || undefined;

      const deepLinkData: DeepLinkData = {
        action,
        id,
        type,
      };

      // Add any additional query parameters
      queryParams.forEach((value, key) => {
        if (!['action', 'id', 'type'].includes(key)) {
          deepLinkData[key] = value;
        }
      });

      return deepLinkData;
    } catch (error) {
      console.error('Error parsing deep link:', error);
      return null;
    }
  }

  /**
   * Check if a URL is a valid deep link
   * @param url - URL to check
   * @returns True if it's a valid deep link
   */
  static isValidDeepLink(url: string): boolean {
    return url.startsWith(this.PROTOCOL);
  }

  /**
   * Copy a deep link to clipboard
   * @param deepLink - Deep link URL to copy
   * @returns Promise that resolves when copied
   */
  static async copyToClipboard(deepLink: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(deepLink);
    } catch (error) {
      console.error('Failed to copy deep link to clipboard:', error);
      throw error;
    }
  }

  /**
   * Open a deep link (useful for testing)
   * @param deepLink - Deep link URL to open
   */
  static openDeepLink(deepLink: string): void {
    if (this.isValidDeepLink(deepLink)) {
      // In a real app, this would trigger the protocol handler
      // For testing, we can log it or handle it differently
      console.log('Opening deep link:', deepLink);

      // You can also try to open it in a new window for testing
      // window.open(deepLink, '_blank');
    }
  }
}

// Export commonly used deep link creators
export const createStreamLink = (
  streamId: string,
  params?: Record<string, string>
) => DeepLinkUtils.createStreamDeepLink(streamId, params);

export const createWhiteboardLink = (
  whiteboardId: string,
  params?: Record<string, string>
) => DeepLinkUtils.createWhiteboardDeepLink(whiteboardId, params);

export const createNavigationLink = (
  route: string,
  params?: Record<string, string>
) => DeepLinkUtils.createNavigationDeepLink(route, params);
