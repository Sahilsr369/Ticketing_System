import { useState, useEffect, useCallback, useRef } from 'react';
import { ticketsService } from '../services/api';
import { extractApiError } from '../utils/validation';

export function useTickets(initialFilters = {}) {
  const [tickets,  setTickets]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [filters,  setFilters]  = useState({
    page: 1, pageSize: 25, sortBy: 'createdAt', sortDir: 'desc', ...initialFilters,
  });

  // Use ref so fetch always sees latest filters without triggering re-renders
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetch = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...f };
      // Strip empty strings so API doesn't filter on them
      Object.keys(params).forEach(k => {
        if (params[k] === '' || params[k] === undefined) delete params[k];
      });
      const { data } = await ticketsService.list(params);
      setTickets(data.data.tickets);
      setTotal(data.data.total);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(filters); }, []); // eslint-disable-line

  const refetch = useCallback(() => fetch(filtersRef.current), [fetch]);

  const setFilter = useCallback((key, value) => {
    const next = { ...filtersRef.current, [key]: value, page: 1 };
    setFilters(next);
    fetch(next);
  }, [fetch]);

  const setMultiFilter = useCallback((updates) => {
    const next = { ...filtersRef.current, ...updates, page: 1 };
    setFilters(next);
    fetch(next);
  }, [fetch]);

  const setPage = useCallback((page) => {
    const next = { ...filtersRef.current, page };
    setFilters(next);
    fetch(next);
  }, [fetch]);

  return { tickets, total, totalPages, loading, error, filters, refetch, setFilter, setMultiFilter, setPage };
}

export function useDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await ticketsService.dashboard();
      setData(res.data);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}
