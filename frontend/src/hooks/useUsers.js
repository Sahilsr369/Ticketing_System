import { useState, useEffect, useCallback } from 'react';
import { usersService } from '../services/api';
import { extractApiError } from '../utils/validation';

export function useUsers(initialFilters = {}) {
  const [users,    setUsers]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [filters,  setFilters]  = useState({ page: 1, pageSize: 50, search: '', ...initialFilters });

  const fetch = useCallback(async (f = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...f };
      if (!params.search) delete params.search;
      const { data } = await usersService.list(params);
      setUsers(data.data.users);
      setTotal(data.data.total);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, []);   // initial load

  const refetch     = () => fetch(filters);
  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value, page: 1 };
    setFilters(next);
    fetch(next);
  };

  return { users, total, loading, error, filters, refetch, updateFilter };
}
