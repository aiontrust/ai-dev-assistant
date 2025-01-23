import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000', // Ensure this matches your backend URL
  timeout: 5000,
});

export default axiosInstance;
