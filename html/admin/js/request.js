const axios_instance = axios.create({
    baseURL: '/api',
    timeout: 1000,
});

axios_instance.interceptors.response.use(function (response) {
    return response;
}, function (error) {
    if (error.response.status === 401) {
        window.location.href = '/admin/page/login.html'
    }
});