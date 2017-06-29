angular.module('starter.services', [])

.service('ApiService', function($http, locationIQ, $q, graphhopper) {
    return{
      getRoadId : function (lat, long) {
         

         return $q(function(resolve, reject) {
          setTimeout(function() {
              resolve({"data":{"place_id":"103330387","licence":"Data © OpenStreetMap contributors, ODbL 1.0. http://www.openstreetmap.org/copyright","osm_type":"way","osm_id":"168483298","lat":"18.6070463","lon":"73.7233351","display_name":"Marunji Road, Infosys Hinjewadi Phase 2, Punawale, Pune, Maharashtra, 411057, India","address":{"road":"Marunji Road","suburb":"Infosys Hinjewadi Phase 2","village":"Punawale","county":"Pune","state_district":"Pune","state":"Maharashtra","postcode":"411057","country":"India","country_code":"in"},"boundingbox":["18.5997228","18.6125939","73.7144477","73.7346466"]},"status":200,"config":{"method":"GET","transformRequest":[null],"transformResponse":[null],"url":"http://locationiq.org/v1/reverse.php?format=json&key=e9fbe60b2244e1a62302&lat=18.6061978&lon=73.7164074&addressdetails=1","headers":{"Accept":"application/json, text/plain, */*"}},"statusText":"OK"});
          }, 1000);
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
      }
    }
    
})

.service('LocationService', ['$cordovaGeolocation', 'ApiService', '$ionicPlatform', '$q', function($cordovaGeolocation, ApiService, $ionicPlatform, $q){
   this.currentLocation = {};
   this.setCurrLocation = function(loc){this.currentLocation = loc};
   this.getCurrLocation = function(){
     return this.currentLocation;
   };
}]);


