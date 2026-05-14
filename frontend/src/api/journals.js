import client from './client';

export const getJournals = () => client.get('/api/journals');
export const getJournal = (id) => client.get(`/api/journals/${id}`);
export const createJournal = (data) => client.post('/api/journals/add', data);
export const addJournalById = (data) => client.post('/api/journals/add-by-id', data);
export const updateJournal = (id, data) => client.put(`/api/journals/${id}`, data);
export const deleteJournal = (id) => client.delete(`/api/journals/${id}`);

export const getChapters = (journalId) => client.get(`/api/chapters/${journalId}`);
export const saveChapter = (journalId, data) => client.post(`/api/chapters/${journalId}`, data);
export const updateChapter = (journalId, chapterId, data) =>
  client.put(`/api/chapters/${journalId}/${chapterId}`, data);
export const deleteChapter = (journalId, chapterId) =>
  client.delete(`/api/chapters/${journalId}/${chapterId}`);

export const getReadingLogs = (journalId) => client.get(`/api/journals/${journalId}/reading-logs`);
export const addReadingLog = (journalId, data) =>
  client.post(`/api/journals/${journalId}/reading-logs`, data);
