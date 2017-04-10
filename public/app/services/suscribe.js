angular.module('MyApp')
    .factory('Suscribe', ['$http', function($http) {
        return {
            suscribe: function(show, user) {
                return $http.post('/api/suscribe', {
                    showId: show._id,
                    user: user
                });
            },
            unsubscribe: function(show, user) {
                return $http.post('/api/unsuscribe', {
                    showId: show._id,
                    user: user
                });
            }
        }
    }]);
