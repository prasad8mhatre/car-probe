angular.module('starter.services', [])

.service('ApiService', function($http, locationIQ) {
    return{
      getRoadId : function (lat, long) {
        debugger;
        return $http({
            method: 'GET',
            url: 'http://locationiq.org/v1/reverse.php?format=json&key=' + locationIQ +'&lat='+ lat +'&lon='+long+ '&addressdetails=1'
        });
      }
    }
    
});
