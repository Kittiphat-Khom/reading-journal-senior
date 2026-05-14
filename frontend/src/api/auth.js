import client from './client';

export const login = (email, password) =>
  client.post('/api/users/login', { email, password });

export const signup = (data) =>
  client.post('/api/users/register', data);

export const getMe = () =>
  client.get('/api/users/me');

export const forgotPassword = (email) =>
  client.post('/api/users/forgot-password', { email });

export const resetPassword = (token, password) =>
  client.post('/api/users/reset-password', { token, password });
