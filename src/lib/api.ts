import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API interceptor caught error:', error);
    
    // Only redirect if not already on login page to avoid redirect loops
    if (error.response?.status === 401 && 
        !window.location.pathname.includes('login') && 
        !window.location.pathname.includes('register')) {
      console.log('Unauthorized access detected - clearing auth state');
      // Token expired or invalid - don't redirect automatically
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Don't redirect automatically, let components handle this
      // window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Upload API
export const uploadAPI = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    return api.post('/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Auth API
export const authAPI = {
  register: (userData: any) => api.post('/auth/register', userData),
  login: (credentials: any) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  updateProfile: (profileData: any) => api.put('/auth/profile', profileData),
  updateAvatar: (avatarData: any) => api.put('/auth/avatar', avatarData),
  changePassword: (passwordData: any) => api.put('/auth/password', passwordData),
  logout: () => api.post('/auth/logout'),
  deleteAccount: () => api.delete('/auth/account'),
};

// Users API
export const usersAPI = {
  getUsers: (params?: any) => api.get('/users', { params }),
  getUser: (id: string) => api.get(`/users/${id}`),
  searchUsers: (params?: any) => api.get('/users/search', { params }),
  followUser: (id: string) => api.post(`/users/${id}/follow`),
  unfollowUser: (id: string) => api.delete(`/users/${id}/follow`),
  getFollowers: (id: string) => api.get(`/users/${id}/followers`),
  getFollowing: (id: string) => api.get(`/users/${id}/following`),
  getUserMetrics: (id: string) => api.get(`/users/${id}/metrics`),
  getRecommendedUsers: () => api.get('/users/recommended'),
};

// Posts API
export const postsAPI = {
  createPost: (postData: any) => api.post('/posts', postData),
  getPosts: (params?: any) => api.get('/posts', { params }),
  getPost: (id: string) => api.get(`/posts/${id}`),
  updatePost: (id: string, postData: any) => api.put(`/posts/${id}`, postData),
  deletePost: (id: string) => api.delete(`/posts/${id}`),
  likePost: (id: string) => api.post(`/posts/${id}/like`),
  addComment: (id: string, commentData: any) => api.post(`/posts/${id}/comments`, commentData),
  removeComment: (id: string, commentId: string) => api.delete(`/posts/${id}/comments/${commentId}`),
  sharePost: (id: string) => api.post(`/posts/${id}/share`),
  getFeed: (params?: any) => api.get('/posts/feed', { params }),
  getTrendingPosts: (params?: any) => api.get('/posts/trending', { params }),
};

// Connections API
export const connectionsAPI = {
  sendRequest: (connectionData: any) => api.post('/connections', connectionData),
  getConnections: (params?: any) => api.get('/connections', { params }),
  acceptConnection: (id: string) => api.put(`/connections/${id}/accept`),
  rejectConnection: (id: string) => api.put(`/connections/${id}/reject`),
  sendMessage: (id: string, messageData: any) => api.post(`/connections/${id}/messages`, messageData),
  getRecommendations: () => api.get('/connections/recommendations'),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: (params?: any) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  deleteAllNotifications: (params?: any) => api.delete('/notifications', { params }),
};

// Admin API
export const adminAPI = {
  getFlaggedPosts: (params?: any) => api.get('/admin/flagged-posts', { params }),
  reviewFlaggedPost: (id: string, decision: 'approve' | 'reject') => 
    api.put(`/admin/flagged-posts/${id}/review`, { decision }),
  getFraudStats: () => api.get('/admin/fraud-stats'),
};

export default api; 