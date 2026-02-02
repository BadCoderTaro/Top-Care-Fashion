import { categoryService, type CategoryInfo } from '../services/categoryService';

/**
 * Outfit类型定义
 */
export type OutfitCategoryType = 'tops' | 'bottoms' | 'shoes' | 'accessories' | 'dresses' | 'other';

/**
 * Category到Outfit类型的映射规则
 * 这些规则基于category名称的关键字匹配
 */
const CATEGORY_MAPPING_RULES: Array<{
  keywords: string[];
  type: OutfitCategoryType;
  priority: number; // 优先级，数字越大优先级越高
}> = [
  // Dresses - 高优先级，因为dresses是独立类型
  { keywords: ['dress'], type: 'dresses', priority: 10 },
  
  // Tops - 包含各种上装
  { keywords: ['top', 'shirt', 'tee', 't-shirt', 'blouse', 'sweater', 'hoodie', 'cardigan', 'turtleneck', 'tank'], type: 'tops', priority: 5 },
  
  // Outerwear 可以归类为 tops
  { keywords: ['outerwear', 'coat', 'jacket', 'blazer', 'vest'], type: 'tops', priority: 4 },
  
  // Bottoms - 包含各种下装
  { keywords: ['bottom', 'pant', 'trouser', 'jean', 'legging', 'short', 'skirt'], type: 'bottoms', priority: 5 },
  
  // Shoes - 包含各种鞋类
  { keywords: ['shoe', 'sneaker', 'boot', 'heel', 'loafer', 'flat', 'footwear', 'sandal'], type: 'shoes', priority: 5 },
  
  // Accessories - 包含各种配饰
  { keywords: ['accessory', 'bag', 'belt', 'bracelet', 'earring', 'necklace', 'ring', 'scarf', 'hat', 'watch'], type: 'accessories', priority: 5 },
];

/**
 * 将category名称映射到Outfit类型
 */
export function mapCategoryToOutfitType(categoryName: string | null | undefined): OutfitCategoryType {
  if (!categoryName) {
    return 'other';
  }

  const normalized = categoryName.toLowerCase().trim();

  // 按优先级排序规则
  const sortedRules = [...CATEGORY_MAPPING_RULES].sort((a, b) => b.priority - a.priority);

  // 查找匹配的规则
  for (const rule of sortedRules) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        return rule.type;
      }
    }
  }

  // 如果没有匹配，尝试精确匹配常见分类名称
  const exactMatches: Record<string, OutfitCategoryType> = {
    'tops': 'tops',
    'bottoms': 'bottoms',
    'footwear': 'shoes',
    'shoes': 'shoes',
    'accessories': 'accessories',
    'dresses': 'dresses',
    'outerwear': 'tops', // Outerwear归类为tops
  };

  return exactMatches[normalized] || 'other';
}

/**
 * 检查category是否属于某个Outfit类型
 */
export function isCategoryOfType(categoryName: string | null | undefined, type: OutfitCategoryType): boolean {
  return mapCategoryToOutfitType(categoryName) === type;
}

/**
 * 根据Outfit类型筛选items
 */
export function filterItemsByOutfitType<T extends { category?: string | null }>(
  items: T[],
  type: OutfitCategoryType,
  excludeId?: string
): T[] {
  return items.filter(item => {
    if (excludeId && (item as any).id === excludeId) {
      return false;
    }
    return isCategoryOfType(item.category, type);
  });
}

/**
 * 获取所有已知的Outfit类型
 */
export function getAllOutfitTypes(): OutfitCategoryType[] {
  return ['tops', 'bottoms', 'shoes', 'accessories', 'dresses', 'other'];
}

/**
 * 获取Outfit类型的显示名称
 */
export function getOutfitTypeDisplayName(type: OutfitCategoryType): string {
  const names: Record<OutfitCategoryType, string> = {
    'tops': 'Tops',
    'bottoms': 'Bottoms',
    'shoes': 'Shoes',
    'accessories': 'Accessories',
    'dresses': 'Dresses',
    'other': 'Other',
  };
  return names[type] || type;
}

/**
 * 动态获取分类并映射到Outfit类型
 * 这个函数会从后端获取最新分类，然后根据规则映射
 */
export async function getCategoriesByOutfitType(
  type: OutfitCategoryType
): Promise<CategoryInfo[]> {
  const categories = await categoryService.getCategories();
  return categories.filter(cat => isCategoryOfType(cat.name, type));
}

