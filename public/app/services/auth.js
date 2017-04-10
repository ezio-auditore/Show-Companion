angular.module('MyApp')
    .factory('Auth', ['$http', '$location', '$rootScope', '$cookieStore', '$alert', function($http, $location, $rootScope, $cookieStore, $alert) {
        $rootScope.currentUser = $cookieStore.get('user');
        $cookieStore.remove('user');

        return {
            login: function(user) {
                return $http.post('/api/login', user)
                    .then(function(data) {
                        $rootScope.currentUser = data;

                        $location.path('/');
                        $alert({
                            title: 'Cheers',
                            content: 'You have successfully logged in',
                            placement: 'top-right',
                            type: 'success',
                            duration: 3
                        });

                    })
                    .catch(function() {
                        $alert({
                            title: 'Error!',
                            content: 'Invalid email or password',
                            placement: 'top-right',
                            type: 'danger',
                            duration: 3
                        });
                    });
            },
            signup: function(user) {
                return $http.post('/api/signup', user)
                    .then(function() {
                        $location.path('/login');
                        $alert({
                            title: 'Cheers',
                            content: 'Your account has been created',
                            placement: 'top-right',
                            type: 'success',
                            duration: 3
                        });
                    })
                    .catch(function(response) {
                        $alert({
                            title: 'Error!',
                            content: response.data,
                            placement: 'top-right',
                            type: 'danger',
                            duration: 3
                        });
                    });
            },
            logout: function() {
                return $http.get('/api/logout')
                    .then(function() {
                        $rootScope.currentUser = null;
                        $cookieStore.remove('user');
                        $alert({

                            content: 'You have successfully logged out',
                            placement: 'top-right',
                            type: 'info',
                            duration: 3
                        });
                    })

            }
        }
    }]);
