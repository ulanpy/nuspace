const axiosInstance = axios.create({
    baseURL: 'http://localhost',  // FastAPI backend URL
    withCredentials: true             // Ensures cookies are sent
});

export default axiosInstance;