import client from './client';

export const searchBooks = (query) =>
  client.post('/api/search', { query });

export const logSearch = (query, bookTitle) =>
  client.post('/api/search/log', { query, bookTitle }).catch(() => {});

export const addJournalFromSearch = (data) =>
  client.post('/api/journals/add', data);

export const toggleFavorite = (data) =>
  client.post('/api/favorites/toggle', data);

export const getRecommendations = () => client.get('/api/recommend');
