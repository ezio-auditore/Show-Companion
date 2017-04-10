angular.module('MyApp')
    .controller('AddCtrl', ['$scope', '$alert', 'Show', function($scope, $alert, Show) {
        $scope.addShow = function() {
            Show.save({
                showName: $scope.showName
            }, function() {
                $scope.showName = '';
                $scope.addForm.$setPristine();
                $alert({
                    content: 'Tv Show has been added',
                    placement: 'top-right',
                    type: 'success',
                    duration: 3
                });

            }, function(response) {
                $scope.showName = '';
                $scope.addForm.$setPristine();
                $alert({
                    title: 'Sorry!',
                    content: response.data.message,
                    placement: 'top-right',
                    type: 'danger',
                    duration: 3
                });
            });
        }
    }]);
