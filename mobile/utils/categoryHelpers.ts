/**
 * Category utility functions for consistent category handling across the app
 */

// Standard category display order used across all screens
export const CATEGORY_DISPLAY_ORDER = [
  "Tops",
  "Bottoms",
  "Outerwear",
  "Footwear",
  "Accessories",
];

/**
 * Sort categories according to the standard display order
 * Categories not in the order list will be sorted alphabetically at the end
 */
export const sortCategories = (categories: string[]): string[] => {
  return categories.sort((a, b) => {
    const indexA = CATEGORY_DISPLAY_ORDER.indexOf(a);
    const indexB = CATEGORY_DISPLAY_ORDER.indexOf(b);

    // Both categories are in the order list
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // Only a is in the order list
    if (indexA !== -1) return -1;

    // Only b is in the order list
    if (indexB !== -1) return 1;

    // Neither is in the order list, sort alphabetically
    return a.localeCompare(b);
  });
};
