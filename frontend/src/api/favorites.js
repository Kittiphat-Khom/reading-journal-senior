import client from './client';

export const getFavorites = () => client.get('/api/favorites');
export const addFavorite = (data) => client.post('/api/favorites', data);
export const removeFavorite = (id) => client.delete(`/api/favorites/${id}`);
