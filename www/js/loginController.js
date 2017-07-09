angular.module('starter.logincontrollers', []).controller('LoginCtrl', function($scope, Pubnub, $rootScope, $cordovaGeolocation, $ionicPlatform, $window, locationIQ, pubnub_pub_key, pubnub_sub_key, ApiService, LocationService, $state, $ionicLoading, ionicToast) {
    
    console.log("In login controller");
   
   
    $scope.randomIntFromInterval = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    $scope.showMessage = function(message) {
        ionicToast.show(message, 'bottom', false, 5000);
    }

    $scope.logout = function(){
        $state.go('login');
    }
    
    $scope.signIn = function(vehicle) {
        $ionicLoading.show({
             template: 'Loading...'
        });
        ApiService.login(vehicle.vehicleId, vehicle.password).then(function(resp){
            if(resp.data !=  false){
                $scope.successVehicleResponse = resp.data;
                $ionicPlatform.ready(function() {
                var posOptions = {
                    timeout: 10000,
                    enableHighAccuracy: false
                };
                $cordovaGeolocation.getCurrentPosition(posOptions).then(function(position) {
                    //_.getChannelName(position.coords.latitude, position.coords.longitude);
                    //find road id from lat long and set subscriber to channel
                    ApiService.getRoadId(position.coords.latitude, position.coords.longitude).then(function(resp) {
                        if (resp.data.osm_type == 'way') {
                            var globalLocation = {};
                            var location = {};
                            location.lat = position.coords.latitude;
                            location.long = position.coords.longitude;
                            globalLocation.location = location;
                            globalLocation.speed = $scope.randomIntFromInterval(5, 70);
                            globalLocation.channel = "local_channel-" + resp.data.osm_id;
                            globalLocation.edgeId = resp.data.osm_id;
                            globalLocation.uuid = 'car-' + vehicle.vehicleId;
                            globalLocation.isActive = $scope.successVehicleResponse.isActive;
                            LocationService.setCurrLocation(globalLocation);
                            $state.go('tab.dash');
                            $scope.showMessage('Application started!');
                            $ionicLoading.hide();
                        } else {
                            console.log("No road found lat long");
                            $scope.showMessage('No road found lat long');
                        }
                    });
                }, function(err) {
                    // error
                    console.log("Error while getting Current Position");
                    $scope.showMessage('Error while getting Current Position');
                    //$window.location.reload(true);
                });
            });
            }else{
                console.log("Invalid Id or password!");
                $scope.showMessage('Invalid Id or password!');
                $ionicLoading.hide();
            }
        });
        
    }
})
