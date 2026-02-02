import React from "react";
import { Image, ImageStyle, StyleProp, View, Text } from "react-native";

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  fallbackAspectRatio?: number; // width/height when intrinsic size not available
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
};

// Cache aspect ratios by URL to avoid repeated Image.getSize calls
const ratioCache = new Map<string, number>();

// Default placeholder image
const DEFAULT_IMAGE_URI = "https://via.placeholder.com/300x300/f4f4f4/999999?text=No+Image";

export default function AdaptiveImage({
  uri,
  style,
  fallbackAspectRatio = 1,
  resizeMode = "cover",
}: Props) {
  // Validate and sanitize URI
  const safeUri = React.useMemo(() => {
    if (!uri || typeof uri !== 'string' || uri.trim() === '') {
      return DEFAULT_IMAGE_URI;
    }
    
    // Check if it's a valid URL
    try {
      new URL(uri);
      return uri;
    } catch {
      return DEFAULT_IMAGE_URI;
    }
  }, [uri]);

  const [ratio, setRatio] = React.useState<number | null>(() => {
    return ratioCache.get(safeUri) ?? null;
  });

  React.useEffect(() => {
    let cancelled = false;
    const cached = ratioCache.get(safeUri);
    if (cached) {
      setRatio(cached);
      return;
    }
    
    // Only try to get size for valid URLs
    if (safeUri === DEFAULT_IMAGE_URI) {
      setRatio(fallbackAspectRatio);
      return;
    }
    
    // Fetch image intrinsic size to compute width/height ratio
    Image.getSize(
      safeUri,
      (w, h) => {
        if (cancelled) return;
        if (w > 0 && h > 0) {
          const r = w / h; // RN expects width/height
          ratioCache.set(safeUri, r);
          setRatio(r);
        } else {
          setRatio(fallbackAspectRatio);
        }
      },
      () => {
        if (cancelled) return;
        setRatio(fallbackAspectRatio);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [safeUri, fallbackAspectRatio]);

  return (
    <Image
      source={{ uri: safeUri }}
      resizeMode={resizeMode}
      style={[
        { width: "100%", aspectRatio: ratio ?? fallbackAspectRatio, backgroundColor: "#f4f4f4" },
        style,
      ]}
      onError={() => {
        console.warn(`Failed to load image: ${safeUri}`);
      }}
    />
  );
}
