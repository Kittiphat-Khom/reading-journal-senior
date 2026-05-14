import client from './client';

// Users
export const getUsers = () => client.get('/api/admin/users');
export const updateUser = (id, data) => client.put(`/api/admin/users/${id}`, data);
export const deleteUser = (id) => client.delete(`/api/admin/users/${id}`);

// Books
export const getAdminBooks = () => client.get('/api/admin/books');
export const createBook = (data) => client.post('/api/admin/books', data);
export const updateBook = (id, data) => client.put(`/api/admin/books/${id}`, data);
export const deleteBook = (id) => client.delete(`/api/admin/books/${id}`);

// Authors
export const getAuthors = () => client.get('/api/admin/authors');
export const createAuthor = (data) => client.post('/api/admin/authors', data);
export const updateAuthor = (id, data) => client.put(`/api/admin/authors/${id}`, data);
export const deleteAuthor = (id) => client.delete(`/api/admin/authors/${id}`);

// Genres
export const getGenres = () => client.get('/api/admin/genres');
export const createGenre = (data) => client.post('/api/admin/genres', data);
export const updateGenre = (id, data) => client.put(`/api/admin/genres/${id}`, data);
export const deleteGenre = (id) => client.delete(`/api/admin/genres/${id}`);

// Reports
export const getReports = () => client.get('/api/admin/reports');
export const updateReport = (id, data) => client.put(`/api/admin/reports/${id}`, data);
export const deleteReport = (id) => client.delete(`/api/admin/reports/${id}`);
