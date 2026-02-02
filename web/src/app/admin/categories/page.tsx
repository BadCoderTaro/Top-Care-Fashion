"use client";

import { useEffect, useState } from "react";
import type { ListingCategory } from "@/types/admin";
import Link from "next/link";
import SearchBar from "@/components/admin/SearchBar";

interface ExtendedCategory extends ListingCategory {
  editing?: boolean;
}

type SortField = 'name' | 'count' | 'date' | 'weight' | 'sortOrder';
type SortOrder = 'asc' | 'desc';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ExtendedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    sortOrder: 0,
    aiKeywords: [] as string[],
    aiWeightBoost: 1.0,
    isActive: true
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [newKeyword, setNewKeyword] = useState("");
  const [editingKeyword, setEditingKeyword] = useState<{categoryId: string, keyword: string}>({categoryId: "", keyword: ""});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories", { cache: "no-store" });
      const json = await res.json();
      const loadedCategories = (json.categories || []).map((c: ListingCategory) => ({ ...c, editing: false }));
      setCategories(loadedCategories);

      // Calculate max sort_order and set default for new category
      const maxSortOrder = loadedCategories.reduce((max: number, cat: ExtendedCategory) =>
        Math.max(max, cat.sortOrder ?? 0), 0);
      setNewCategory(prev => ({ ...prev, sortOrder: maxSortOrder + 1 }));
    } catch (e: any) {
      setError(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Filtering and sorting logic
  const filteredAndSortedCategories = categories
    .filter(category => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (
          !category.name?.toLowerCase().includes(searchLower) &&
          !category.description?.toLowerCase().includes(searchLower) &&
          !(category.aiKeywords || []).some(kw => kw.toLowerCase().includes(searchLower))
        ) {
          return false;
        }
      }

      // Active status filter
      if (filterActive === 'active' && !category.isActive) return false;
      if (filterActive === 'inactive' && category.isActive) return false;

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'count':
          comparison = (a.listingCount || 0) - (b.listingCount || 0);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'weight':
          comparison = (a.aiWeightBoost || 1.0) - (b.aiWeightBoost || 1.0);
          break;
        case 'sortOrder':
          comparison = (a.sortOrder || 0) - (b.sortOrder || 0);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const startEdit = (id: string) => {
    setCategories(categories.map(cat => ({
      ...cat,
      editing: cat.id === id ? true : false
    })));
  };

  const cancelEdit = (id: string) => {
    setCategories(categories.map(cat => ({
      ...cat,
      editing: cat.id === id ? false : cat.editing
    })));
    load(); // Reload to reset changes
  };

  const saveEdit = async (category: ExtendedCategory) => {
    try {
      setSaving(category.id);
      const updateData = {
        name: category.name,
        description: category.description,
        isActive: category.isActive,
        sortOrder: category.sortOrder ?? 0,
        aiKeywords: category.aiKeywords || [],
        aiWeightBoost: category.aiWeightBoost || 1.0
      };

      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        setCategories(categories.map(c => ({
          ...c,
          editing: c.id === category.id ? false : c.editing
        })));
        load();
      } else {
        console.error('Failed to save category');
      }
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setSaving(null);
    }
  };

  const deleteCategory = async (id: string) => {
    const category = categories.find(c => c.id === id);
    const listingCount = category?.listingCount || 0;

    if (!confirm(`Are you sure you want to delete this category? ${listingCount > 0 ? `This will affect ${listingCount} listing(s).` : ''} This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        load();
      } else {
        console.error('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const toggleActive = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (!category) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !category.isActive })
      });

      if (res.ok) {
        load();
      } else {
        console.error('Failed to toggle category status');
      }
    } catch (error) {
      console.error('Error toggling category status:', error);
    }
  };

  const createCategory = async () => {
    if (!newCategory.name.trim()) return;

    try {
      setCreating(true);
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory)
      });

      if (res.ok) {
        setNewCategory(prev => ({
          name: "",
          description: "",
          sortOrder: prev.sortOrder + 1, // Increment for next category
          aiKeywords: [],
          aiWeightBoost: 1.0,
          isActive: true
        }));
        load(); // This will also update sortOrder to max + 1
      } else {
        console.error('Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
    } finally {
      setCreating(false);
    }
  };

  const updateField = (id: string, field: keyof ListingCategory, value: any) => {
    setCategories(categories.map(category =>
      category.id === id ? { ...category, [field]: value } : category
    ));
  };

  const addKeyword = (categoryId: string, keyword: string) => {
    if (!keyword.trim()) return;

    setCategories(categories.map(category => {
      if (category.id === categoryId) {
        const keywords = category.aiKeywords || [];
        if (!keywords.includes(keyword.trim())) {
          return { ...category, aiKeywords: [...keywords, keyword.trim()] };
        }
      }
      return category;
    }));
    setEditingKeyword({categoryId: "", keyword: ""});
  };

  const removeKeyword = (categoryId: string, keyword: string) => {
    setCategories(categories.map(category =>
      category.id === categoryId
        ? { ...category, aiKeywords: (category.aiKeywords || []).filter(kw => kw !== keyword) }
        : category
    ));
  };

  const addNewCategoryKeyword = (keyword: string) => {
    if (!keyword.trim()) return;
    if (!newCategory.aiKeywords.includes(keyword.trim())) {
      setNewCategory({
        ...newCategory,
        aiKeywords: [...newCategory.aiKeywords, keyword.trim()]
      });
    }
    setNewKeyword("");
  };

  const removeNewCategoryKeyword = (keyword: string) => {
    setNewCategory({
      ...newCategory,
      aiKeywords: newCategory.aiKeywords.filter(kw => kw !== keyword)
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Category Management</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Category Management</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error: {error}</div>
          <button
            onClick={load}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Category Management</h2>
        <div className="text-sm text-gray-600">
          {filteredAndSortedCategories.length} of {categories.length} categories
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-4 rounded-lg border space-y-3">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search categories by name, description, or keywords..."
        />

        <div className="flex gap-3 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sortOrder">Sort Order</option>
              <option value="name">Name</option>
              <option value="count">Listing Count</option>
              <option value="date">Date Created</option>
              <option value="weight">AI Weight</option>
            </select>
          </div>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 flex items-center gap-1"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>

      {/* Create New Category */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-medium mb-4">Create New Category</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="new-category-name" className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
              <input
                id="new-category-name"
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Accessories, Clothing, Shoes"
              />
            </div>
            <div>
              <label htmlFor="new-category-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                id="new-category-description"
                type="text"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of this category"
              />
            </div>
            <div>
              <label htmlFor="new-category-sort-order" className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                id="new-category-sort-order"
                type="number"
                min="0"
                value={newCategory.sortOrder}
                onChange={(e) => setNewCategory({ ...newCategory, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AI Weight Boost: {newCategory.aiWeightBoost.toFixed(1)}</label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={newCategory.aiWeightBoost}
              onChange={(e) => setNewCategory({ ...newCategory, aiWeightBoost: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0.5 (Low)</span>
              <span>1.5 (Medium)</span>
              <span>3.0 (High)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AI Keywords</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addNewCategoryKeyword(newKeyword);
                  }
                }}
                placeholder="Add keyword for AI classification"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => addNewCategoryKeyword(newKeyword)}
                className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {newCategory.aiKeywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                >
                  {keyword}
                  <button
                    onClick={() => removeNewCategoryKeyword(keyword)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="new-category-active"
              checked={newCategory.isActive}
              onChange={(e) => setNewCategory({ ...newCategory, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="new-category-active" className="text-sm text-gray-700">
              Active (visible to users)
            </label>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={createCategory}
            disabled={!newCategory.name.trim() || creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Category'}
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="grid gap-4">
        {filteredAndSortedCategories.map((category) => (
          <div key={category.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            {category.editing ? (
              // Edit Mode
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor={`name-${category.id}`} className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                    <input
                      id={`name-${category.id}`}
                      type="text"
                      value={category.name}
                      onChange={(e) => updateField(category.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter category name"
                    />
                  </div>
                  <div>
                    <label htmlFor={`description-${category.id}`} className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      id={`description-${category.id}`}
                      type="text"
                      value={category.description || ''}
                      onChange={(e) => updateField(category.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter description (optional)"
                    />
                  </div>
                  <div>
                    <label htmlFor={`sort-order-${category.id}`} className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                    <input
                      id={`sort-order-${category.id}`}
                      type="number"
                      min="0"
                      value={category.sortOrder ?? 0}
                      onChange={(e) => updateField(category.id, 'sortOrder', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AI Weight Boost: {(category.aiWeightBoost || 1.0).toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={category.aiWeightBoost || 1.0}
                    onChange={(e) => updateField(category.id, 'aiWeightBoost', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0.5 (Low)</span>
                    <span>1.5 (Medium)</span>
                    <span>3.0 (High)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AI Keywords</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={editingKeyword.categoryId === category.id ? editingKeyword.keyword : ""}
                      onChange={(e) => setEditingKeyword({categoryId: category.id, keyword: e.target.value})}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addKeyword(category.id, editingKeyword.keyword);
                        }
                      }}
                      placeholder="Add keyword for AI classification"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => addKeyword(category.id, editingKeyword.keyword)}
                      className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(category.aiKeywords || []).map((keyword, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                      >
                        {keyword}
                        <button
                          onClick={() => removeKeyword(category.id, keyword)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`active-${category.id}`}
                    checked={category.isActive ?? true}
                    onChange={(e) => updateField(category.id, 'isActive', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor={`active-${category.id}`} className="text-sm text-gray-700">
                    Active (visible to users)
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => cancelEdit(category.id)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={saving === category.id}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveEdit(category)}
                    disabled={saving === category.id}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving === category.id ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium">{category.name}</h3>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        category.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                        {category.listingCount || 0} listings
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">
                      {category.description || "No description provided"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Category ID:</span>
                    <div className="font-medium">{category.id}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Sort Order:</span>
                    <div className="font-medium">{category.sortOrder ?? 0}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <div className="font-medium">
                      {category.createdAt ? new Date(category.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">AI Weight:</span>
                    <div className="font-medium">{(category.aiWeightBoost || 1.0).toFixed(1)}x</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Keywords:</span>
                    <div className="font-medium">{(category.aiKeywords || []).length}</div>
                  </div>
                </div>

                {(category.aiKeywords || []).length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">AI Classification Keywords:</div>
                    <div className="flex flex-wrap gap-1">
                      {(category.aiKeywords || []).map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    {category.listingCount && category.listingCount > 0
                      ? `${category.listingCount} product(s) using this category`
                      : 'No products using this category'}
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleActive(category.id)}
                      className={`px-3 py-1.5 text-sm rounded-md ${
                        category.isActive
                          ? 'bg-gray-600 text-white hover:bg-gray-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {category.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <Link
                      href={`/admin/listings?category=${category.id}`}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      View Listings
                    </Link>
                    <button
                      onClick={() => startEdit(category.id)}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredAndSortedCategories.length === 0 && categories.length > 0 && (
        <div className="text-center py-12 text-gray-500">
          No categories match your filters. Try adjusting your search or filter criteria.
        </div>
      )}

      {categories.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No categories found. Create your first category to organize products.
        </div>
      )}
    </div>
  );
}
