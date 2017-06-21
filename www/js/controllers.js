angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, Pubnub, $rootScope, $cordovaGeolocation, $ionicPlatform, $window) {
  console.log("Dash Board controller started");
  $scope.carDetails = {};
  $scope.currentChannel = '';
  $scope.global_channel = 'global_traffic';
  $scope.subscribedChannels = {};
  $scope.subscribedChannels.global_channel = $scope.global_channel;
  $scope.subscribedChannels.local_channels = [];
  

  $scope.carDetails.status = "Cluster Member";
  //$scope.carDetails.follow = [];

  $scope.vehicles = [];
  $scope.carDetails.location = {};
  $scope.carDetails.vib = new Map();
  $scope.onload = true;

  //location tracking
  $ionicPlatform.ready(function() {
    var posOptions = {timeout: 10000, enableHighAccuracy: false};
    $cordovaGeolocation
      .getCurrentPosition(posOptions)
      .then(function (position) {
       debugger
        $scope.subscribeToChannel($scope.subscribedChannels.global_channel);
        $scope.postLocationActivity(position);
        debugger;
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
          debugger;
        }
        
    });
  });

  $scope.postLocationActivity = function(position){
    $scope.carDetails.location.lat  = position.coords.latitude;
    $scope.carDetails.location.long = position.coords.longitude;
    $scope.carDetails.speed = position.coords.speed;
    $scope.sendTrafficUpdate();
    $scope.setCurrentChannel();
  }

  $scope.setCurrentChannel = function(){
    debugger;
    if( $scope.subscribedChannels.local_channels.length != 0){
      Pubnub.unsubscribe({
        channels: [$scope.subscribedChannels.local_channels]
      });

      //TODO:find road id from lat long and set subscriber to channel

      $scope.subscribeToChannel($scope.subscribedChannels.local_channels);
    }
  }

  $scope.randomIntFromInterval =  function (min,max)
  {
      return Math.floor(Math.random()*(max-min+1)+min);
  }


  //pubnub

  var newUUID = 'car-' + $scope.randomIntFromInterval(1,1000);
  $scope.carDetails.id = newUUID;


  Pubnub.init({
    uuid: newUUID, 
    publishKey: 'pub-c-a995f85d-b499-41c6-8df5-84a42066aa2e',
    subscribeKey: 'sub-c-056727a4-54cb-11e7-97ec-0619f8945a4f'
  });

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

          if(envelope.channel != $scope.subscribedChannels.global_channel){
           
            /*1. handle cluster head selection - clustering algorithm
              2. handle rerouting algorithm
            */
            //find lowest speed vehicle
            var lowestSpeed = {};
            lowestSpeed.speed = Number.MAX_SAFE_INTEGER;            
            lowestSpeed.vehicle = {};
            for (var [key, value] of $scope.carDetails.vib.entries()) {
              console.log(key + ' = ' + value);
              if(value.speed < lowestSpeed.speed ){
                lowestSpeed.speed = value.speed;
                lowestSpeed.vehicle = value;
              }
            }

            //notify other vehicles
            if(lowestSpeed.vehicle.uuid == $scope.carDetails.id){
              $scope.carDetails.status = 'Cluster Head';
              //pubnub notify
              $scope.publishMessage($scope.carDetails ,$scope.subscribedChannels.local_channels);
            }

          }else if(!message.isCar){
              //handle traffic notification

          } 
      });
  });


  $rootScope.$on(Pubnub.getPresenceEventNameFor($scope.getAllChannels()), function (ngEvent, pnEvent) {
          // apply presence event (join|leave) on users list
          console.log(pnEvent);
          var vehicle = {};
          vehicle.uuid = pnEvent.uuid;
          debugger;
          $scope.addVehicle(vehicle);
          
  });

  $rootScope.$on(Pubnub.getEventNameFor('subscribe', 'status'), function (ngEvent, status, response) {
      
      if (status.category == 'PNConnectedCategory'){
          console.log('successfully connected to channels', response);
      }
  });

  if( $scope.subscribedChannels.local_channels.length != 0){
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
              if(!angular.isUndefined(response.channels.traffic_channel)){
                 angular.forEach(response.channels.traffic_channel.occupants, function(data){
                    if(!$scope.isPresent(data.uuid)){
                      if(data.uuid != $scope.carDetails.id){
                        var vehicle = {};
                        vehicle.uuid = data.uuid;
                        $scope.vehicles.push(vehicle);
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
    var trafficUpdate = {};
    trafficUpdate.location = {};
    trafficUpdate.location.lat = $scope.carDetails.location.lat;
    trafficUpdate.location.long = $scope.carDetails.location.long;
    trafficUpdate.speed = $scope.carDetails.speed;
    trafficUpdate.vehiclePubNubId = $scope.carDetails.id;
    trafficUpdate.isCar = true;
   // trafficUpdate.edgeId = traffic.edgeId; // need to find?
    $scope.publishMessage(trafficUpdate, $scope.global_channel);
  }
    
  
  $scope.addVehicle = function (vehicle) {
    if(vehicle.uuid != $scope.carDetails.id){
        $scope.carDetails.vib.set(vehicle.uuid, vehicle);
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


  $scope.follow = function(vehicle) {
    var isFound = false;
    angular.forEach($scope.carDetails.follow, function (val) {
      if(vehicle.uuid == val.uuid){
        isFound = true;
      }
    })
    if(!isFound){
       $scope.carDetails.follow.push(vehicle);
       $scope.changeState(vehicle);
    }
  };

  $scope.isPresent = function(item){
    var isPresent = false;
    angular.forEach($scope.vehicles, function(data){
      if(data.uuid == item.uuid){
        isPresent = true;
      }
    })
    return isPresent;
  };


  

  
  //tear down - unsubscribe
  window.addEventListener("beforeunload", function (e) {
     debugger;
     watch.clearWatch();
     Pubnub.unsubscribe({
        channels: [$scope.currentChannel]
     });
  });

  

})

