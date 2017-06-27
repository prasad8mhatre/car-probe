
angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, Pubnub, $rootScope, $cordovaGeolocation, $ionicPlatform, $window, locationIQ, pubnub_pub_key, pubnub_sub_key, ApiService, LocationService, $interval) {
  $ionicPlatform.ready(function() {
  
  console.log("Dash Board controller started");
  $scope.carDetails = {};
  $scope.currentChannel = '';
  $scope.global_channel = 'global_traffic';
  $scope.subscribedChannels = {};
  $scope.subscribedChannels.global_channel = $scope.global_channel;
  $scope.subscribedChannels.local_channels = [];
  $scope.fromLocation = '';
  $scope.toLocation = '';
  

  //$scope.carDetails.follow = [];

  $scope.vehicles = [];
  $scope.carDetails.location = {};
  $scope.carDetails.vib = new Map();
  $scope.onload = true;
  
  var compareJourneyRemaniningTime = function(a, b) { return a.journeyRemaniningTime - b.journeyRemaniningTime; };
  $scope.nearbyVehicleMatrix = new PriorityQueue({ comparator: compareJourneyRemaniningTime });

  /*-----------------------
  Models
  ------------------------*/
  function V2VMessage(uuid, lat, long, speed, heading, edgeId, status){
    this.uuid = uuid;
    this.location = {
      lat, long
    };
    this.heading = heading;
    this.speed = speed;
    this.edgeId = edgeId;
    this.status = status;
  }

  function Car(uuid, lat, long, speed, heading, edgeId, status, vib){
    V2VMessage.call(this, uuid, lat, long, speed, heading, edgeId, status);
    this.vib = vib;
  }

  function TrafficUpdate(uuid, lat, long, speed, heading, edgeId, status, isCar ){
    V2VMessage.call(this, uuid, lat, long, speed, heading, edgeId, status);
    this.isCar = isCar;
  }

  /*-----
  End Models
  --------*/
  $scope.randomIntFromInterval =  function (min,max)
  {
      return Math.floor(Math.random()*(max-min+1)+min);
  }

  /* ------------------- 
  Global Object
  ----------------------*/

  var Global_Car = new Car();
  Global_Car.location = {};
  Global_Car.vib = new Map();
  Global_Car.alternativeRoutes = [];

  /*var Global_TrafficUpdate = new TrafficUpdate();
  var Global_V2VMessage = new V2VMessage();*/
  $scope.carDetails = Global_Car;
  var currlocation = LocationService.getCurrLocation();
  Global_Car.speed = currlocation.speed;
  Global_Car.location = currlocation.location;
  Global_Car.edgeId = currlocation.edgeId;
  Global_Car.status = "Cluster Head";
  $scope.subscribedChannels.local_channels.push(currlocation.channel);

  /*$interval(function () {
        if(Global_Car.status == "Cluster Head"){
          Global_Car.status = "Cluster Member";
        }else{
          Global_Car.status = "Cluster Head"
        }
  }, 5000); */

  //pubnub

  var newUUID = 'car-' + $scope.randomIntFromInterval(1,1000);
  Global_Car.uuid = newUUID;
  
  Pubnub.init({
    uuid: newUUID,
    publishKey: pubnub_pub_key,
    subscribeKey: pubnub_sub_key
  });




 

  /* ------------------- 
  End Global Object
  ----------------------*/
  debugger;
  //location tracking
 
    /*var posOptions = {timeout: 10000, enableHighAccuracy: false};
    $cordovaGeolocation
      .getCurrentPosition(posOptions)
      .then(function (position) {
        debugger;
        //$scope.subscribeToChannel($scope.getAllChannels());
        console.log("subscribered to channel:" + $scope.subscribedChannels.global_channel);
        $scope.postLocationActivity(position);
        
        $scope.onload = false;
      }, function(err) {
        // error
        console.log("Error while getting Current Position");
        $window.location.reload(true);
      });
*/

    /*var watchOptions = {
      timeout : 3000,
      enableHighAccuracy: false // may cause errors if true
    };

    var watch = $cordovaGeolocation.watchPosition(watchOptions);
    watch.then(
      null,
      function(err) {
        // error
        console.log("Error while getting Current Position");
        $window.location.reload(true);
      },
      function(position) {
        if(!$scope.onload){
          $scope.postLocationActivity(position);
          $scope.logSubscribedChannels();
        }
        
    });*/
  

  /*$scope.postLocationActivity = function(position){
    Global_Car.location.lat  = position.coords.latitude;
    Global_Car.location.long = position.coords.longitude;
    Global_Car.speed = position.coords.speed;
    debugger;
    $scope.sendTrafficUpdate();
    $scope.setCurrentChannel();

  }*/

  $scope.logSubscribedChannels = function(){
    Pubnub.whereNow(
        {
            uuid: Global_Car.uuid
        },
        function (status, response) {
            // handle status, response
            
            console.log(JSON.stringify(response));
        }
    );
  } 

  /*$scope.setCurrentChannel = function(){
    debugger;
    if( $scope.subscribedChannels.local_channels.length != 0){
      Pubnub.unsubscribe({
        channels: [$scope.subscribedChannels.local_channels]
      });
    }

    //find road id from lat long and set subscriber to channel
    ApiService.getRoadId(Global_Car.location.lat, Global_Car.location.long).then(function(resp){
     
      if(resp.data.osm_type == 'way'){
        
        $scope.subscribedChannels.local_channels = [];
        $scope.subscribedChannels.local_channels.push("local_channel-" + resp.data.osm_id);
        Global_Car.edgeId = resp.data.osm_id;
        debugger;
        $scope.subscribeToChannel($scope.getAllChannels());
        //$rootScope.$broadcast('channel-fetched');
        $scope.logSubscribedChannels();
        console.log("subscribered channel: " + $scope.subscribedChannels.local_channels);
        $scope.setChannelState($scope.subscribedChannels.local_channels);

      }
    });
      

  }*/

  $scope.getAllChannels = function(){
    var channels = [];
    channels.push($scope.subscribedChannels.global_channel);
    return channels.concat($scope.subscribedChannels.local_channels);
  }

  $scope.setChannelState = function(channel){
    Pubnub.setState(
      {
          state: {
            "car_state":Global_Car
          },
          uuid: Global_Car.uuid,
          channels: [channel]
      },
      function (status) {
          // handle state setting response
          //console.log("Status:" + status);
      }
    );
  } 

  $scope.subscribeToChannel = function(channels){
    Pubnub.subscribe({
      channels  : [channels],
      withPresence: true,
      triggerEvents: ['message', 'presence', 'status']
    });
  }

  //Setting user state
  $scope.setChannelState($scope.subscribedChannels.local_channels);


  //subscribe to channels
  $scope.subscribeToChannel($scope.subscribedChannels.global_channel);
  $scope.subscribeToChannel($scope.subscribedChannels.local_channels);

  debugger;
  $rootScope.$on(Pubnub.getMessageEventNameFor($scope.getAllChannels()), function (ngEvent, envelope) {
      $scope.$apply(function () {
          // add message to the messages list
          console.log(envelope.message);
          var msg = envelope.message;
          debugger;
          

          if(envelope.channel != $scope.subscribedChannels.global_channel && Global_Car.uuid != msg.uuid){
           
            /*1. handle cluster head selection - clustering algorithm
              find lowest speed vehicle
            */

            //msg code == 102
            if(msg.code == 102 && Global_Car.status == 'Cluster Member'){
                //TODO: Need to add actual parameters
                var reRoutingInitAckMsg = {};
                reRoutingInitAckMsg.allPath = Global_Car.alternativeRoutes;
                reRoutingInitAckMsg.currentPath = Global_Car.currentRoute;
                reRoutingInitAckMsg.journeyRemaniningTime = Global_Car.currentRoute.time;
                reRoutingInitAckMsg.currentPathInstructionIndex = Global_Car.currentPathInstructionIndex;
                reRoutingInitAckMsg.isCar = true;
                reRoutingInitAckMsg.code  = 103;
                reRoutingInitAckMsg.uuid = Global_Car.uuid;
                reRoutingInitAckMsg.roadId = Global_Car.roadId;
                $scope.publishMessage(reRoutingInitAckMsg, $scope.subscribedChannels.local_channels);
                console.log("Acknowledge re-routing init to Cluster head");

            }else if(msg.code == 103 && Global_Car.status == 'Cluster Head'){
                if(Global_Car.vib.length == $scope.nearbyVehicleMatrix.length){
                  console.log("Starting assignment of new route to vehicles"); 
                  //sort all nearbyVehicle
                  //route assignment logic
                  //publish route assignment <carUUId, route> on road_id with msg code = 104
                  var assignedRoutes = getAssignedRoute();
                  var reRoutingAssignedRouteMsg = {};
                  reRoutingAssignedRouteMsg.code = 104;
                  reRoutingAssignedRouteMsg.isCar = true;
                  reRoutingAssignedRouteMsg.roadId = Global_Car.roadId;
                  reRoutingAssignedRouteMsg.routes =  assignedRoutes;
                  reRoutingAssignedRouteMsg.uuid = Global_Car.uuid;
                  $scope.publishMessage(reRoutingInitAckMsg, $scope.subscribedChannels.local_channels);
                  console.log("Re-Routing Assigned Routes message sent");

                }else{
                  $scope.nearbyVehicleMatrix.queue(msg);
                  console.log("Collected Acknowledge from " + msg.carUUId + " vehicle for re-routing");
                }
            }else if(msg.code == 104){
              if(msg.routes.get(Global_Car.uuid) != undefined){
                //assign that route -- route assigned
                Global_Car.currentRoute = msg.routes.get(Global_Car.uuid);
                console.log("New Route assigned");
              }

            }else{
              /*var lowestSpeed = {};
              lowestSpeed.speed = Number.MAX_SAFE_INTEGER;            
              lowestSpeed.vehicle = new Car();
              for (var [key, value] of Global_Car.vib.entries()) {
                console.log(key + ' = ' + value);
                if(value.speed < lowestSpeed.speed ){
                  lowestSpeed.speed = value.speed;
                  lowestSpeed.vehicle = value;
                }
              }

              //notify other vehicles
              if(lowestSpeed.vehicle.uuid == Global_Car.uuid){
                Global_Car.status = 'Cluster Head';
                //pubnub notify
                $scope.publishMessage(Global_Car, $scope.subscribedChannels.local_channels);
              }*/
              debugger;
            }
          }else if(!msg.isCar){
              //handle traffic notification
              // 2. handle rerouting algorithm  
              /*msg.code = 100;
                msg.text = "Congestion at Road Id:" + road.roadId;
                msg.roadId  = road.roadId;
                msg.isCar = false;
                */
                if(Global_Car.status == 'Cluster Head' && msg.code == 100){
                  //HACK: QuickFix: Need To Fix: assume that congestion has occured and re-routing algorithm needs to start
                  //1. check whether roadId falls in current path route id's
                  //2. if yes then if(cluster head)  then 
                  console.log(msg.text);
                  var reRoutingInitMsg = {};
                  reRoutingInitMsg.code = 102;
                  reRoutingInitMsg.text = msg.text;
                  reRoutingInitMsg.roadId = msg.roadId;
                  $scope.publishMessage(reRoutingInitMsg, $scope.subscribedChannels.local_channels);
                  console.log("ReRouting algorithm Init.");
                }
           } 
      });
  });

  debugger;
  $rootScope.$on(Pubnub.getPresenceEventNameFor($scope.subscribedChannels.local_channels), function (ngEvent, pnEvent) {
      // apply presence event (join|leave) on users list
      console.log(pnEvent);
      if(pnEvent.action != 'state-change'){
        debugger;
        $scope.hereNow();
      }
      
  });

  debugger;
  $rootScope.$on(Pubnub.getEventNameFor('subscribe', 'presence', 'status'), function (ngEvent, status, response) {
      debugger;
      if (status.category == 'PNConnectedCategory'){
          console.log('successfully connected to channels', response);

            Pubnub.setState(
                { 
                    state: Global_Car 
                }, 
                function (status) {
                    // handle state setting response
                    console.log("Status:" + status);
                }
            );
      }
  });


  debugger;
  //here now
  $scope.hereNow = function(){
    debugger;
    Pubnub.hereNow(
        {
            channels: [$scope.subscribedChannels.local_channels], 
            includeUUIDs: true,
            includeState: true
        },
        function (status, response) {
            // handle status, response
            debugger;
            if(!status.error){
              console.log("online users: " + response.totalOccupancy );
              if(!angular.isUndefined(response.channels[$scope.subscribedChannels.local_channels])){
                 var lowestSpeed = {};
                  lowestSpeed.speed = Number.MAX_SAFE_INTEGER;            
                  lowestSpeed.vehicleUUID = '';
                  
                 angular.forEach(response.channels[$scope.subscribedChannels.local_channels].occupants, function(data){
                    var vehicle = data.state.car_state;
                    if(vehicle.uuid != Global_Car.uuid){
                      Global_Car.vib.set(vehicle.uuid, vehicle);
                    }
                    if(vehicle.speed < lowestSpeed.speed ){
                      lowestSpeed.speed = vehicle.speed;
                      lowestSpeed.vehicleUUID = vehicle.uuid;
                    }  
                 });
                 //updating state
                 if(lowestSpeed.vehicleUUID == Global_Car.uuid){
                  Global_Car.status = "Cluster Head";
                 }else{
                  debugger;
                  Global_Car.status = "Cluster Member";
                   $scope.$apply(); 
                 }

              }
            }
            debugger;
        }
    );
    debugger;
  }
  debugger;

  $scope.getAssignedRoute = function(){
    var assignedRoutes = new Map();
    var vehicleCount = 0;
    var processedVehicle = new Map();
    while( $scope.nearbyVehicleMatrix.length > 0){
      var vehicle = $scope.nearbyVehicleMatrix.dequeue();
      //processedVehicle.set(vehicle.uuid, vehicle);
      var route = {};
      debugger;

      if(vehicleCount == 0 && vehicle.allPath.length > 1){
        debugger;
        route = vehicle.allPath[1];
        var currentVehicle = angular.copy(vehicle);
        currentVehicle.currentRoute = $scope.uniqueList(route);
        processedVehicle.set(vehicle.uuid, vehicle);
      }else{
        //var allPath = vehicle.allPath;
        debugger;
        var currentVehicle = angular.copy(vehicle);
        var previousFootPrints = [];
        //dbksp
        var compareNumbers = function(a, b) { return a.weight - b.weight; };
        var weightedFootprint = new PriorityQueue({ comparator: compareNumbers });
        var uniquePathList = [];
        //unique path list
        angular.forEach(vehicle.allPath, function(val){
          uniquePathList.add($scope.uniqueList(val.instructions));
        });
        debugger;
        for (var [key, value] of processedVehicle.entries()) {
          previousFootPrints.concat($scope.uniqueList(key.currentRoute));
        }
        debugger;

        //calculating footprints weights
        angular.forEach(uniquePathList, function(uniquePathVal, uniquePathKey){
          var footPrintWeight = {};
          footPrintWeight.weight = 0;
          footPrintWeight.index = uniquePathKey;
          angular.forEach(uniquePathVal, function(pathElementVal, pathElementKey){
            angular.forEach(previousFootPrints, function(previousFPVal, previousFPkey){
              if(pathElementVal == previousFPVal){
                footPrintWeight.weight++;
              }
            });
          });
          weightedFootprint.queue(footPrintWeight);
        });
        debugger;
        //getting lowest footprint weight route
        route = vehicle.allPath[weightedFootprint.dequeue().index];

      }

      //assigned a new calculated route to vehicle
      debugger
      assignedRoutes.set(vehicle.uuid, route);
    } 
    return assignedRoutes;
  }
  

  $scope.publishMessage = function(data, channel){
      Pubnub.publish({
          channel: [channel],
          message: data 
        }, function(status, response){
          console.log(response);
      });
    }


  $scope.sendTrafficUpdate = function(){
    
    //uuid, lat, long, speed, heading, edgeId, status, vib
    var trafficUpdate = new TrafficUpdate(Global_Car.uuid, Global_Car.location.lat, Global_Car.location.long, 
                              Global_Car.speed, Global_Car.heading, Global_Car.edgeId, Global_Car.status, true);
    
    trafficUpdate.edgeId = Global_Car.edgeId; // Done
    $scope.publishMessage(trafficUpdate, $scope.subscribedChannels.global_channel);
  }
    
  
  $scope.addVehicle = function (vehicle) {
    if(vehicle.uuid != Global_Car.uuid){
        Global_Car.vib.set(vehicle.uuid, vehicle);
    }
  }

  

  $scope.changeState = function (vehicle) {
    
    if($scope.carDetails.follow){
      var data = {"id":vehicle.uuid, "msg":"Cluster Head"};
      $scope.publishMessage(data, $scope.currentChannel);
      //$scope.carDetails.status = "Cluster Head";
    }else{
      $scope.carDetails.status = "Cluster Member";
    }
  } 



  $scope.navigate = function(fromLocation, toLocation){
     var geocoder = new google.maps.Geocoder();
     debugger;

     //from location
     geocoder.geocode({'address': fromLocation.formatted_address + ""}, function(results, status) {
        if (status === 'OK') {
          var fromlocationL = {};
          fromlocationL.lat = results[0].geometry.location.lat();
          fromlocationL.long = results[0].geometry.location.lng();
          $scope.fromLocationLatLong = fromlocationL;
            debugger;
            //to location
            geocoder.geocode({'address': toLocation.formatted_address + ""}, function(toresults, tostatus) {
            if (tostatus === 'OK') {
              var toLocationL = {};
              toLocationL.lat = toresults[0].geometry.location.lat();
              toLocationL.long = toresults[0].geometry.location.lng();

              $scope.toLocationLatLong = toLocationL;

              //TODO: fire graphopper api for direction
               debugger;
               ApiService.getDirection($scope.fromLocationLatLong, $scope.toLocationLatLong).then(function(resp){
                  debugger;
                  $scope.directionInstruction = resp.data.paths;
                  angular.forEach($scope.directionInstruction, function(val){
                      var route = {};
                      route.time = val.time;
                      route.distance = val.distance;
                      route.instructions = val.instructions;
                      Global_Car.alternativeRoutes.push(route);
                  })
                  Global_Car.currentRoute = Global_Car.alternativeRoutes[0];
                  Global_Car.currentPathInstructionIndex = 0;
               });  



            } else {
              alert('Geocode was not successful for the following reason: ' + tostatus);
            }
          });
        } else {
          alert('Geocode was not successful for the following reason: ' + status);
        }
      });

  }


  $scope.uniqueList = function(instructions){
    var uniqueList = new Set();
    angular.forEach(instructions, function(val){
      if(val.street_name != ""){
        uniqueList.add(val.street_name);  
      }
    });
    debugger;
    return uniqueList;
  }

  //$scope.subscribeToChannel($scope.global_local_channel);
  debugger;


  $scope.publishMessagtoPeer = function(){
    $scope.publishMessage("Hi", $scope.subscribedChannels.local_channels)
  }
 
  //tear down - unsubscribe
  window.addEventListener("beforeunload", function (e) {
     
    // watch.clearWatch();
     Pubnub.unsubscribe({
        channels: [$scope.getAllChannels()]
     });
  });
  });
})


.controller('Dash1Ctrl', function($scope, Pubnub, $rootScope, $cordovaGeolocation, $ionicPlatform, $window, locationIQ, pubnub_pub_key, pubnub_sub_key, ApiService, LocationService, $state) {
  $scope.randomIntFromInterval =  function (min,max){
     return Math.floor(Math.random()*(max-min+1)+min);
  }

  $ionicPlatform.ready(function() {
        var posOptions = {timeout: 10000, enableHighAccuracy: false};
        $cordovaGeolocation
          .getCurrentPosition(posOptions)
          .then(function (position) {
            //_.getChannelName(position.coords.latitude, position.coords.longitude);
            //find road id from lat long and set subscriber to channel
            ApiService.getRoadId(position.coords.latitude, position.coords.longitude).then(function(resp){
              if(resp.data.osm_type == 'way'){
                var globalLocation = {};
                var location = {};
                location.lat = position.coords.latitude;
                location.long = position.coords.longitude;
                globalLocation.location = location;

                globalLocation.speed = $scope.randomIntFromInterval(5,70);
                globalLocation.channel =  "local_channel-" + resp.data.osm_id;
                globalLocation.edgeId = resp.data.osm_id;
                LocationService.setCurrLocation(globalLocation);
                $state.go('tab.dash')
              }
            });
            
          }, function(err) {
            // error
            console.log("Error while getting Current Position");
            //$window.location.reload(true);
          });
      });

})

