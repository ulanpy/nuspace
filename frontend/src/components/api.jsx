import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost',  // Base URL for all requests
  withCredentials: true        // Ensures cookies or tokens are sent (if required)
});

export default api;
