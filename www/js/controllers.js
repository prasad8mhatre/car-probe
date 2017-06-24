
angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, Pubnub, $rootScope, $cordovaGeolocation, $ionicPlatform, $window, locationIQ, pubnub_pub_key, pubnub_sub_key, ApiService) {
  console.log("Dash Board controller started");
  $scope.carDetails = {};
  $scope.currentChannel = '';
  $scope.global_channel = 'global_traffic';
  $scope.subscribedChannels = {};
  $scope.subscribedChannels.global_channel = $scope.global_channel;
  $scope.subscribedChannels.local_channels = [];
  $scope.fromLocation = '';
  $scope.toLocation = '';
  

  $scope.carDetails.status = "Cluster Member";
  //$scope.carDetails.follow = [];

  $scope.vehicles = [];
  $scope.carDetails.location = {};
  $scope.carDetails.vib = new Map();
  $scope.onload = true;

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

  /* ------------------- 
  End Global Object
  ----------------------*/

  //location tracking
  $ionicPlatform.ready(function() {
    var posOptions = {timeout: 10000, enableHighAccuracy: false};
    $cordovaGeolocation
      .getCurrentPosition(posOptions)
      .then(function (position) {
       
        $scope.subscribeToChannel($scope.getAllChannels());
        console.log("subscribered to channel:" + $scope.subscribedChannels.global_channel);
        $scope.postLocationActivity(position);
        
        $scope.onload = false;
      }, function(err) {
        // error
        console.log("Error while getting Current Position");
        $window.location.reload(true);
      });


    var watchOptions = {
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
        
    });
  });

  $scope.postLocationActivity = function(position){
    Global_Car.location.lat  = position.coords.latitude;
    Global_Car.location.long = position.coords.longitude;
    Global_Car.speed = position.coords.speed;
    $scope.sendTrafficUpdate();
    $scope.setCurrentChannel();

  }

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

  $scope.setCurrentChannel = function(){
    
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
        
        $scope.subscribeToChannel($scope.getAllChannels());
        
        $scope.logSubscribedChannels();
        console.log("subscribered channel: " + $scope.subscribedChannels.local_channels);
        $scope.setChannelState($scope.subscribedChannels.local_channels);

      }
    });
      

  }

  $scope.randomIntFromInterval =  function (min,max)
  {
      return Math.floor(Math.random()*(max-min+1)+min);
  }


  //pubnub

  var newUUID = 'car-' + $scope.randomIntFromInterval(1,1000);
  Global_Car.uuid = newUUID;


  Pubnub.init({
    uuid: newUUID, 
    publishKey: pubnub_pub_key,
    subscribeKey: pubnub_sub_key
  });

  $scope.setChannelState = function(channel){
    Pubnub.setState(
      {
          state: Global_Car,
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

  $scope.getAllChannels = function(){
    var channels = [];
    channels.push($scope.subscribedChannels.global_channel);
    return channels.concat($scope.subscribedChannels.local_channels);
  }

  $rootScope.$on(Pubnub.getMessageEventNameFor($scope.getAllChannels()), function (ngEvent, envelope) {
      $scope.$apply(function () {
          // add message to the messages list
          console.log(envelope.message);
          var message = envelope.message;
          

          if(envelope.channel != $scope.subscribedChannels.global_channel && Global_Car.uuid != envelope.message.uuid){
           
            /*1. handle cluster head selection - clustering algorithm
              find lowest speed vehicle
            */
            var lowestSpeed = {};
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
            }

          }else if(!message.isCar){
              //handle traffic notification
              // 2. handle rerouting algorithm  
          } 
      });
  });


  $rootScope.$on(Pubnub.getPresenceEventNameFor($scope.getAllChannels()), function (ngEvent, pnEvent) {
          // apply presence event (join|leave) on users list
          console.log(pnEvent);
          
          var vehicle = new Car();
          vehicle.uuid = pnEvent.uuid;
          
          $scope.addVehicle(vehicle);
          
  });

  $rootScope.$on(Pubnub.getEventNameFor('subscribe', 'status'), function (ngEvent, status, response) {
      
      if (status.category == 'PNConnectedCategory'){
          console.log('successfully connected to channels', response);
      }
  });

  //pubnub here now
  if( $scope.subscribedChannels.local_channels.length != 0){
    Pubnub.hereNow(
        {
            channels: [$scope.subscribedChannels.local_channels], 
            includeUUIDs: true,
            includeState: true
        },
        function (status, response) {
            // handle status, response
            
            if(!status.error){
              console.log("online users: " + response.totalOccupancy );
              if(!angular.isUndefined(response.channels.traffic_channel)){
                 angular.forEach(response.channels.traffic_channel.occupants, function(data){
                    if(!$scope.isPresent(data.uuid)){
                      if(data.uuid != Global_Car.uuid){
                        var vehicle = new Car();
                        vehicle.uuid = data.uuid;
                        Global_Car.vib.set(vehicle.uuid, vehicle);
                       }
                    }
                  });
              }
            }
        }
    );
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
                      Global_Car.alternativeRoutes.push(val.instructions);
                  })
                  Global_Car.currentRoute = Global_Car.alternativeRoutes[0].instructions;
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

 
  //tear down - unsubscribe
  window.addEventListener("beforeunload", function (e) {
     
     watch.clearWatch();
     Pubnub.unsubscribe({
        channels: [$scope.getAllChannels()]
     });
  });

  

})

