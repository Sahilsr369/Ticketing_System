import { useState, useEffect } from 'react';
import { categoriesService } from '../services/api';

/**
 * Fetches all active categories with their nested subcategories.
 * Returns:
 *   categories  — array of { id, name, slug, subcategories: [{ id, name, slug }] }
 *   loading     — boolean
 *   error       — string | null
 *
 * Subcategories for a given category id:
 *   const subs = subcategoriesFor(categoryId);
 */
export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    categoriesService.list()
      .then(r => {
        if (!cancelled) setCategories(r.data?.data || []);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Failed to load categories');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function subcategoriesFor(categoryId) {
    if (!categoryId) return [];
    const cat = categories.find(c => c.id === categoryId);
    return cat?.subcategories || [];
  }

  return { categories, subcategoriesFor, loading, error };
}
