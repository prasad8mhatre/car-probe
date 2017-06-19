angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, Pubnub, $rootScope) {
  console.log("Dash Board controller started");
  $scope.carDetails = {};
  $scope.selectedChannel = 'traffic_channel';

  $scope.carDetails.status = "Cluster Member";
  $scope.carDetails.follow = [];

  $scope.vehicles = [];
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

  /*window.onbeforeunload = function () {
    debugger;
    alert("Do you really want to close?");
  };*/

  window.addEventListener("beforeunload", function (e) {
     debugger;
     Pubnub.unsubscribe({
        channels: [$scope.selectedChannel]
     });
  });

  $scope.changeState = function (vehicle) {
    
    if($scope.carDetails.follow){
      Pubnub.publish({
          channel: $scope.selectedChannel,
          message: {"id":vehicle.uuid, "msg":"Cluster Head"} 
        }, function(status, response){
             console.log(response);
      });
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

  //pubnub

  var newUUID = 'car-' + Math.random();
  $scope.carDetails.id = newUUID;


  Pubnub.init({
    uuid: newUUID, 
    publishKey: 'pub-c-a995f85d-b499-41c6-8df5-84a42066aa2e',
    subscribeKey: 'sub-c-056727a4-54cb-11e7-97ec-0619f8945a4f'
  });

  Pubnub.subscribe({
    channels  : [$scope.selectedChannel],
    withPresence: true,
    triggerEvents: ['message', 'presence', 'status']
  });
  


  $rootScope.$on(Pubnub.getMessageEventNameFor($scope.selectedChannel), function (ngEvent, envelope) {
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


  $rootScope.$on(Pubnub.getPresenceEventNameFor($scope.selectedChannel), function (ngEvent, pnEvent) {
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

  /*Pubnub.publish({
      channel: $scope.selectedChannel,
      message: 'Hello!'
    }, function(status, response){
         console.log(response);
  });*/

  $scope.isPresent = function(item){
    var isPresent = false;
    angular.forEach($scope.vehicles, function(data){
      if(data.uuid == item.uuid){
        isPresent = true;
      }
    })
    return isPresent;
  };


  Pubnub.hereNow(
      {
          channels: [$scope.selectedChannel], 
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

})

