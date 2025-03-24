import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost',  // Correct backend URL
    withCredentials: true             // Important for HTTP-only cookies
});

export async function refreshAccessToken() {
    try {
        const response = await axiosInstance.post(
            '/api/refresh-token',
            {},  // Пустое тело (если сервер его не требует)
            { withCredentials: true }  // Дублирование здесь критично
        );
        const newAccessToken = response.data.access_token;
        localStorage.setItem('access_token', newAccessToken);
        console.log('Token refreshed successfully:', newAccessToken);
    } catch (error) {
        console.error('Error refreshing token:', error.response?.data || error.message);
    }
}
