angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, Pubnub, $rootScope, $cordovaGeolocation, $ionicPlatform, $window) {
  console.log("Dash Board controller started");
  $scope.carDetails = {};
  $scope.currentChannel = '';
  $scope.global_channel = 'global_traffic';

  $scope.carDetails.status = "Cluster Member";
  $scope.carDetails.follow = [];

  $scope.vehicles = [];
  $scope.carDetails.location = {};

  //location tracking
  $ionicPlatform.ready(function() {
    var posOptions = {timeout: 10000, enableHighAccuracy: false};
    $cordovaGeolocation
      .getCurrentPosition(posOptions)
      .then(function (position) {
        $scope.postLocationActivity(position);
        debugger;
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
        $scope.postLocationActivity(position);
        debugger;
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
    if( $scope.currentChannel != ''){
      Pubnub.unsubscribe({
        channels: [$scope.currentChannel]
      });
    }

    //find road id from lat long and set subscriber to channel
    $scope.subscribeToChannel($scope.currentChannel);

    
  }


  //pubnub

  var newUUID = 'car-' + Math.random();
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

  $rootScope.$on(Pubnub.getMessageEventNameFor($scope.currentChannel), function (ngEvent, envelope) {
      $scope.$apply(function () {
          // add message to the messages list
          console.log(envelope.message);
          var message = envelope.message;
          debugger;
          if((message.msg == "Cluster Head") && (message.id == $scope.carDetails.id)){
            $scope.carDetails.status = "Cluster Head";
          }
          
      });
  });


  $rootScope.$on(Pubnub.getPresenceEventNameFor($scope.currentChannel), function (ngEvent, pnEvent) {
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

  Pubnub.hereNow(
      {
          channels: [$scope.currentChannel], 
          includeUUIDs: true,
          includeState: true
      },
      function (status, response) {
          // handle status, response
          debugger;
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
  );



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
    trafficUpdate.edgeId = traffic.edgeId;
    $scope.publishMessage(trafficUpdate ,$scope.global_channel);
  }
    
  
  $scope.addVehicle = function (vehicle) {
    var isFound = false;
    angular.forEach($scope.vehicles, function (val) {
      if(vehicle.uuid == val.uuid){
        isFound = true;
      }
    });
    
    if(!isFound){
       debugger;
       if(vehicle.uuid != $scope.carDetails.id){
          $scope.vehicles.push(vehicle);
       }
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

