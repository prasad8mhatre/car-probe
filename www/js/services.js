angular.module('starter.services', [])

.service('ApiService', function($http, locationIQ, $q, graphhopper, serverUrl) {
    return{
      getRoadId : function (lat, long) {
         

         return $http({
            method: 'GET',
            url: 'http://locationiq.org/v1/reverse.php?format=json&key=' + locationIQ +'&lat='+ lat +'&lon='+long+ '&addressdetails=1&osm_type=W'
        });


          /*return $http({
            method: 'GET',
            url: 'http://locationiq.org/v1/reverse.php?format=json&key=' + locationIQ +'&lat='+ lat +'&lon='+long+ '&addressdetails=1'
        });*/
      },
      getDirection : function(fromLocation, toLocation){
        return $http({
            method: 'GET',
            url: 'https://graphhopper.com/api/1/route?point='+ fromLocation.lat +'%2C'+ fromLocation.long +'&point='+ toLocation.lat + '%2C' + toLocation.long + '&type=json&locale=en-US&vehicle=car&weighting=fastest&elevation=true&ch.disable=true&algorithm=alternative_route&alternative_route.max_paths=10&use_miles=false&layer=Omniscale&key=' + graphhopper 
        });
      },
      login : function(vehicleId, password){
        return $http({
            method: 'POST',
            url: serverUrl + 'vehicle/mobile/login?vehicleId='+ vehicleId + '&password='+ password 
        });
      },
      register : function(vehicleId, password){
        return $http({
            method: 'POST',
            url: serverUrl + 'vehicle/mobile/register?vehicleId='+ vehicleId + '&password='+ password 
        });
      }
    }
    
})

.service('ChannelService', [ '$ionicPlatform', function($ionicPlatform){
   this.currentChannel = {};
   this.setCurrChannel = function(channel){this.currentChannel = channel};
   this.getCurrChannel = function(){
     return this.currentChannel;
   };
}])

.service('LocationService', ['$cordovaGeolocation', 'ApiService', '$ionicPlatform', '$q', function($cordovaGeolocation, ApiService, $ionicPlatform, $q){
   this.currentLocation = {};
   this.setCurrLocation = function(loc){this.currentLocation = loc};
   this.getCurrLocation = function(){
     return this.currentLocation;
   };
}]);


