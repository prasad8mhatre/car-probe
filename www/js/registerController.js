angular.module('starter.registercontrollers', [])
.controller('RegisterCtrl', function($scope, ApiService, $state, ionicToast) {
    console.log("In register controller");
    
    $scope.showMessage = function(message) {
        ionicToast.show(message, 'bottom', false, 5000);
    }

    $scope.register = function(vehicle){
    	ApiService.register(vehicle.vehicleId, vehicle.password).then(function(resp){
    		if(resp.data){
    			$state.go('login');
                $scope.showMessage('Registed!, Please login with your Credentials');
    		}
    	});
    }

})
