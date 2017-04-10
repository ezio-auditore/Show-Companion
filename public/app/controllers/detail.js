angular.module('MyApp')
    .controller('DetailCtrl', ['$scope', '$rootScope', '$routeParams', 'Show', 'Suscribe', '$alert', function($scope, $rootScope, $routeParams, Show, Suscribe, $alert) {
        Show.get({
            _id: $routeParams.id
        }, function(show) {
            $scope.show = show;

            $scope.isSubscribed = function() {
                return $scope.show.subscribers.indexOf($rootScope.currentUser._id) == -1;
            };

            $scope.subscribe = function() {

                Suscribe.suscribe(show, $rootScope.currentUser).then(function() {
                        $scope.show.subscribers.push($rootScope.currentUser._id);
                        $alert({
                            title: 'Yo!',
                            content: 'You have suscribed to ' + $scope.show.name,
                            placement: 'top-right',
                            type: 'info',
                            duration: 3
                        });
                    },
                    function() {
                        $alert({
                            title: 'Umm!',
                            content: 'It seems an error has occured',
                            placement: 'top-right',
                            type: 'info',
                            duration: 3
                        });
                    })
            }
            $scope.unsubscribe = function() {
                Suscribe.unsubscribe(show, $rootScope.currentUser).then(function() {
                        var index = $scope.show.subscribers.indexOf($rootScope.currentUser._id);
                        $scope.show.subscribers.splice(index, 1);
                        $alert({
                            content: 'You have unsuscribed to ' + $scope.show.name,
                            placement: 'top-right',
                            type: 'info',
                            duration: 3
                        });
                    },
                    function() {
                        $alert({
                            title: 'Umm!',
                            content: 'It seems an error has occured',
                            placement: 'top-right',
                            type: 'info',
                            duration: 3
                        });
                    })
            }


            $scope.nextEpisode = show.episodes.filter(function(episode) {
                return new Date(episode.firstAired) > new Date();
            })[0];
        });

    }])
