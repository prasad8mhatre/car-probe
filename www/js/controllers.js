    angular.module('starter.controllers', []).controller('DashCtrl', function($scope, Pubnub, $rootScope, $cordovaGeolocation, $ionicPlatform, $window, locationIQ, pubnub_pub_key, pubnub_sub_key, ApiService, LocationService, $interval, $ionicLoading, ionicToast, $timeout, ChannelService, $state, _) {
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
        $scope.navigationStarted = false;
        //$scope.carDetails.follow = [];
        $scope.vehicles = [];
        $scope.carDetails.location = {};
        $scope.carDetails.vib = new Map();
        $scope.onload = true;
        var compareJourneyRemaniningTime = function(a, b) {
            return a.journeyRemaniningTime - b.journeyRemaniningTime;
        };
        $scope.nearbyVehicleMatrix = new PriorityQueue({
            comparator: compareJourneyRemaniningTime
        });
        /*-----------------------
        Models
        ------------------------*/
        function V2VMessage(uuid, lat, long, speed, heading, edgeId, status) {
            this.uuid = uuid;
            this.location = {
                lat,
                long
            };
            this.heading = heading;
            this.speed = speed;
            this.edgeId = edgeId;
            this.status = status;
        }

        function Car(uuid, lat, long, speed, heading, edgeId, status, vib) {
            V2VMessage.call(this, uuid, lat, long, speed, heading, edgeId, status);
            this.vib = vib;
        }

        function TrafficUpdate(uuid, lat, long, speed, heading, edgeId, status, isCar) {
            V2VMessage.call(this, uuid, lat, long, speed, heading, edgeId, status);
            this.isCar = isCar;
        }
        /*-----
        End Models
        --------*/
        $scope.randomIntFromInterval = function(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        }
        $scope.showMessage = function(message) {
            ionicToast.show(message, 'bottom', false, 5000);
        }

        $scope.getAllChannels = function() {
            var channels = [];
            channels.push($scope.subscribedChannels.global_channel);
            return channels.concat($scope.subscribedChannels.local_channels);
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
        Global_Car.uuid = currlocation.uuid;
        $scope.subscribedChannels.local_channels.push(currlocation.channel);
        ChannelService.setCurrChannel($scope.getAllChannels());
        $scope.reRoutingCompleted = false;


        // send location update after 20 sec
        var interval = $interval(function() {
            if($scope.navigationStarted){
                $scope.getLocation();
            }
        }, 20000);
        //pubnub
        //var newUUID = 'car-' + $scope.randomIntFromInterval(1, 1000);
       

        Pubnub.init({
            uuid: Global_Car.uuid,
            publishKey: pubnub_pub_key,
            subscribeKey: pubnub_sub_key
        });
        /* -------------------
        End Global Object
        ----------------------*/
        $scope.getLocation = function() {
            var posOptions = {
                timeout: 10000,
                enableHighAccuracy: false
            };
            $cordovaGeolocation.getCurrentPosition(posOptions).then(function(position) {
                
                Global_Car.location.lat = position.coords.latitude;
                Global_Car.location.long = position.coords.longitude;
                //FIXME: Mock location
                //Global_Car.location.lat = 18.53222;
                //Global_Car.location.long = 73.84253;
                //Global_Car.speed = $scope.randomIntFromInterval(5,70); for now
                //find road id from lat long and set subscriber to channel
                ApiService.getRoadId(Global_Car.location.lat, Global_Car.location.long).then(function(resp) {
                   
                    if (resp.data.osm_type == 'way') {
                            if ($scope.subscribedChannels.local_channels.length != 0) {
                            Pubnub.unsubscribe({
                                channels: [$scope.subscribedChannels.local_channels]
                            });
                        }
                        $scope.subscribedChannels.local_channels = [];
                        $scope.subscribedChannels.local_channels.push("local_channel-" + resp.data.osm_id);
                        Global_Car.edgeId = resp.data.osm_id;
                        $scope.setChannelState($scope.subscribedChannels.local_channels);
                        $scope.subscribeToChannel($scope.subscribedChannels.local_channels);
                        $scope.logSubscribedChannels();
                        console.log("subscribered channel: " + $scope.subscribedChannels.local_channels);
                        $scope.sendTrafficUpdate();
                    }
                });
            }, function(err) {
                // error
                console.log("Error while getting Current Position");
                $window.location.reload(true);
            });
        }
        
        $scope.logSubscribedChannels = function() {
            Pubnub.whereNow({
                uuid: Global_Car.uuid
            }, function(status, response) {
                // handle status, response
                console.log(JSON.stringify(response));
            });
        }
        $scope.getAllChannels = function() {
            var channels = [];
            channels.push($scope.subscribedChannels.global_channel);
            return channels.concat($scope.subscribedChannels.local_channels);
        }
        $scope.setChannelState = function(channel) {
            var car_state ={
                uuid: Global_Car.uuid,
                speed: Global_Car.speed,
                edgeId: Global_Car.edgeId,
                status: Global_Car.status
            };

            Pubnub.setState({
                state: {
                    "car_state": car_state
                },
                uuid: Global_Car.uuid,
                channels: [channel]
            }, function(status) {
                // handle state setting response
                //console.log("Status:" + status);
            });
        }
        $scope.subscribeToChannel = function(channels) {
            Pubnub.subscribe({
                channels: [channels],
                withPresence: true,
                triggerEvents: ['message', 'presence', 'status']
            });
        }
        //Setting user state
        $scope.setChannelState($scope.subscribedChannels.local_channels);
        //subscribe to channels
        $scope.subscribeToChannel($scope.subscribedChannels.global_channel);
        $scope.subscribeToChannel($scope.subscribedChannels.local_channels);
        $rootScope.$on(Pubnub.getMessageEventNameFor($scope.subscribedChannels.global_channel), function(ngEvent, envelope) {
            $scope.$apply(function() {
                // add message to the messages list
                
                console.log(envelope.message);
                var msg = envelope.message;
                if (!msg.isCar) {
                    //handle traffic notification
                    // 2. handle rerouting algorithm
                    /*msg.code = 100;
                      msg.text = "Congestion at Road Id:" + road.roadId;
                      msg.roadId  = road.roadId;
                      msg.isCar = false;
                      */
                    if (Global_Car.status == 'Cluster Head' && msg.code == 101 && $scope.navigationStarted) {
                        
                        //HACK: QuickFix: Need To Fix: assume that congestion has occured and re-routing algorithm needs to start
                        //1. check whether roadId falls in current path route id's
                        //2. if yes then if(cluster head)  then
                        console.log(msg.text);
                        var reRoutingInitMsg = {};
                        reRoutingInitMsg.code = 102;
                        reRoutingInitMsg.text = msg.text;
                        reRoutingInitMsg.roadId = msg.roadId;
                        reRoutingInitMsg.uuid = Global_Car.uuid;
                        $scope.publishMessage(reRoutingInitMsg, $scope.subscribedChannels.local_channels);
                        $scope.showMessage('Congestion at current Route, ReRouting algorithm Initiated');
                        console.log("Congestion at current Route, ReRouting algorithm Init.");
                    }else if(msg.code == 105 && ('car-' + msg.vehicleId) == Global_Car.uuid){
                        if(!msg.isActive){
                            $scope.showMessage('Access Revoked, Please contact support team.');
                            $scope.logout();
                        }
                    }
                }
            });
        });
        $rootScope.$on(Pubnub.getMessageEventNameFor($scope.subscribedChannels.local_channels), function(ngEvent, envelope) {
            $scope.$apply(function() {
                
                // add message to the messages list
                console.log(envelope.message);
                var msg = envelope.message;
                
                if (Global_Car.uuid != msg.uuid) {
                    /*1. handle cluster head selection - clustering algorithm
                      find lowest speed vehicle
                    */
                    
                    //msg code == 102
                    if (msg.code == 102 && Global_Car.status == 'Cluster Member' && $scope.navigationStarted) {
                        
                        
                        var reRoutingInitAckMsg = {};
                        reRoutingInitAckMsg.allPath = Global_Car.alternativeRoutes;
                        reRoutingInitAckMsg.currentPath = Global_Car.currentRoute;
                        reRoutingInitAckMsg.journeyRemaniningTime = Global_Car.currentRoute.time;
                        reRoutingInitAckMsg.currentPathInstructionIndex = Global_Car.currentPathInstructionIndex;
                        reRoutingInitAckMsg.isCar = true;
                        reRoutingInitAckMsg.code = 103;
                        reRoutingInitAckMsg.uuid = Global_Car.uuid;
                        reRoutingInitAckMsg.roadId = Global_Car.roadId;
                        
                        $scope.publishMessage(reRoutingInitAckMsg, $scope.subscribedChannels.local_channels);
                        $scope.showMessage('Acknowledge re-routing init to Cluster head');
                        console.log("Acknowledge re-routing init to Cluster head");
                    } else if (msg.code == 103 && Global_Car.status == 'Cluster Head' && $scope.navigationStarted) {
                        
                        //$scope.showMessage('vib:' + Global_Car.vib.length + ' nearbyVehicleMatrix:' + $scope.nearbyVehicleMatrix.length);
                        if(!$scope.isPresentInMatrix(msg)){
                            $scope.nearbyVehicleMatrix.queue(msg); 
                            $scope.showMessage('Collected Acknowledge from ' + msg.uuid + ' vehicle for re-routing');
                            console.log("Collected Acknowledge from " + msg.uuid + " vehicle for re-routing");
                        }


                        if ((Global_Car.vib.size ) == $scope.nearbyVehicleMatrix.length) {
                            console.log("Starting assignment of new route to vehicles");
                            $scope.showMessage('Starting assignment of new route to vehicles');
                            //sort all nearbyVehicle
                            //route assignment logic
                            //publish route assignment <carUUId, route> on road_id with msg code = 104
                            
                            var assignedRoutes = $scope.getAssignedRoute();
                            var reRoutingAssignedRouteMsg = {};
                            reRoutingAssignedRouteMsg.code = 104;
                            reRoutingAssignedRouteMsg.isCar = true;
                            reRoutingAssignedRouteMsg.roadId = Global_Car.roadId;
                            reRoutingAssignedRouteMsg.routes = Array.from(assignedRoutes);
                            reRoutingAssignedRouteMsg.uuid = Global_Car.uuid;
                            
                            $scope.publishMessage(reRoutingAssignedRouteMsg, $scope.subscribedChannels.local_channels);
                            $scope.showMessage('Re-Routing Assigned Routes message sent');
                            console.log("Re-Routing Assigned Routes message sent");
                        }
                    } 
                }
                if (msg.code == 104 && $scope.navigationStarted) {
                    var routes = new Map(msg.routes);
                    if (routes.get(Global_Car.uuid) != undefined) {
                        //assign that route -- route assigned
                        
                        Global_Car.currentRoute = routes.get(Global_Car.uuid);
                        $scope.showMessage('Re-Routing Process Completed: New Route assigned');
                        console.log("Re-Routing Process Completed: New Route assigned");
                        $scope.reRoutingCompleted = true;
                        $timeout(function () {
                            $scope.reRoutingCompleted = false;
                        }, 5000);
                       
                    }
                }
            });
        });
        $rootScope.$on(Pubnub.getPresenceEventNameFor($scope.subscribedChannels.local_channels), function(ngEvent, pnEvent) {
            // apply presence event (join|leave) on users list
            if (pnEvent.action != 'state-change') {
                $scope.hereNow();
                if (pnEvent.action == 'join' && pnEvent.uuid == Global_Car.uuid && $scope.navigationStarted) {
                    $scope.sendTrafficUpdate();
                }
            }
        });
        $rootScope.$on(Pubnub.getEventNameFor('subscribe', 'presence', 'status'), function(ngEvent, status, response) {
            
            if (status.category == 'PNConnectedCategory') {
                console.log('successfully connected to channels', response);
                Pubnub.setState({
                    state: Global_Car
                }, function(status) {
                    // handle state setting response
                    console.log("Status:" + status);
                });
            }
        });
        //here now
        $scope.hereNow = function() {
            Pubnub.hereNow({
                channels: [$scope.subscribedChannels.local_channels],
                includeUUIDs: true,
                includeState: true
            }, function(status, response) {
                // handle status, response
                if (!status.error) {
                    console.log("online users: " + response.totalOccupancy);
                    
                    if (!angular.isUndefined(response.channels[$scope.subscribedChannels.local_channels])) {
                        var lowestSpeed = {};
                        lowestSpeed.speed = Number.MAX_SAFE_INTEGER;
                        lowestSpeed.vehicleUUID = '';
                        
                        angular.forEach(response.channels[$scope.subscribedChannels.local_channels].occupants, function(data) {
                            if (!angular.isUndefined(data.state)) {
                                var vehicle = data.state.car_state;
                                
                                if (vehicle.uuid != Global_Car.uuid) {
                                    Global_Car.vib.set(vehicle.uuid, vehicle);
                                }
                                if (vehicle.speed < lowestSpeed.speed) {
                                    lowestSpeed.speed = vehicle.speed;
                                    lowestSpeed.vehicleUUID = vehicle.uuid;
                                }
                            }
                        });

                        //updating state
                        
                        if (lowestSpeed.vehicleUUID != "") {
                            if (lowestSpeed.vehicleUUID == Global_Car.uuid) {
                                Global_Car.status = "Cluster Head";
                                $scope.showMessage(Global_Car.uuid + ' Elected as Cluster Head');
                            } else {
                                Global_Car.status = "Cluster Member";
                                $scope.showMessage(Global_Car.uuid + ' Elected as Cluster Member');
                            }
                            $scope.$apply();
                        }

                        Global_Car.vib.set(Global_Car.uuid, Global_Car);
                    }
                }
            });
        }
        $scope.getAssignedRoute = function() {
            var assignedRoutes = new Map();
            var vehicleCount = 0;
            var processedVehicle = new Map();
            while ($scope.nearbyVehicleMatrix.length > 0) {
                var vehicle = $scope.nearbyVehicleMatrix.dequeue();
                //processedVehicle.set(vehicle.uuid, vehicle);
                var route = {};
                
                if (vehicleCount == 0 && vehicle.allPath.length >= 1) {
                    
                    route = vehicle.allPath[vehicle.allPath.length-1];
                    var currentVehicle = angular.copy(vehicle);
                    currentVehicle.currentRoute = $scope.uniqueList(route.instructions);
                    processedVehicle.set(vehicle.uuid, vehicle);
                } else {
                    //var allPath = vehicle.allPath;
                    
                    var currentVehicle = angular.copy(vehicle);
                    var previousFootPrints = [];
                    //dbksp
                    var compareNumbers = function(a, b) {
                        return a.weight - b.weight;
                    };
                    var weightedFootprint = new PriorityQueue({
                        comparator: compareNumbers
                    });
                    var uniquePathList = [];
                    //unique path list
                    angular.forEach(vehicle.allPath, function(val) {
                        uniquePathList.push($scope.uniqueList(val.instructions));
                    });
                    
                    for (var [key, value] of processedVehicle.entries()) {
                        previousFootPrints.concat($scope.uniqueList(key.currentRoute));
                    }
                    
                    //calculating footprints weights
                    angular.forEach(uniquePathList, function(uniquePathVal, uniquePathKey) {
                        var footPrintWeight = {};
                        footPrintWeight.weight = 0;
                        footPrintWeight.index = uniquePathKey;
                        angular.forEach(uniquePathVal, function(pathElementVal, pathElementKey) {
                            angular.forEach(previousFootPrints, function(previousFPVal, previousFPkey) {
                                if (pathElementVal == previousFPVal) {
                                    footPrintWeight.weight++;
                                }
                            });
                        });
                        weightedFootprint.queue(footPrintWeight);
                    });
                    
                    //getting lowest footprint weight route
                    route = vehicle.allPath[weightedFootprint.dequeue().index];
                }
                vehicleCount ++;
                //assigned a new calculated route to vehicle
                
                assignedRoutes.set(vehicle.uuid, route);
            }
            $scope.addGlobalCarInNearByMatrix();
            return assignedRoutes;
        }
        $scope.publishMessage = function(data, channel) {
            console.log("Total Message Size:" + $scope.calculate_payload_size(channel, data));
            
            Pubnub.publish({
                channel: [channel],
                message: data
            }, function(status, response) {
                console.log("Message published:" + JSON.stringify(data) + " ,channel:" + channel + " " + JSON.stringify(response));
            });
        }
        $scope.sendTrafficUpdate = function() {
            //uuid, lat, long, speed, heading, edgeId, status, vib
            var trafficUpdate = new TrafficUpdate(Global_Car.uuid, Global_Car.location.lat, Global_Car.location.long, Global_Car.speed, Global_Car.heading, Global_Car.edgeId, Global_Car.status, true);
            trafficUpdate.edgeId = Global_Car.edgeId; // Done
            delete trafficUpdate['location'];
            
            $scope.publishMessage(trafficUpdate, $scope.subscribedChannels.global_channel);
            console.log('Sent traffic update');
            $scope.showMessage('Sent traffic update');
        }
        $scope.addVehicle = function(vehicle) {
            if (vehicle.uuid != Global_Car.uuid) {
                Global_Car.vib.set(vehicle.uuid, vehicle);
            }
        }
        $scope.changeState = function(vehicle) {
            if ($scope.carDetails.follow) {
                var data = {
                    "id": vehicle.uuid,
                    "msg": "Cluster Head"
                };
                $scope.publishMessage(data, $scope.currentChannel);
                //$scope.carDetails.status = "Cluster Head";
            } else {
                $scope.carDetails.status = "Cluster Member";
            }
        }

        $scope.calculate_payload_size = function( channel, message ) {
            return encodeURIComponent(
                channel + JSON.stringify(message)
            ).length + 100;
        }

        $scope.millisToMinutesAndSeconds = function (millis) {
          var minutes = Math.floor(millis / 60000);
          var seconds = ((millis % 60000) / 1000).toFixed(0);
          return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
        }

        $scope.navigate = function(fromLocation, toLocation) {
            var geocoder = new google.maps.Geocoder();
            
            if ($scope.navigationStarted) {
                $scope.showMessage('Stopping Current Navigation!');
                $scope.navigationStarted = false;
            }
            //from location
            geocoder.geocode({
                'address': fromLocation.formatted_address + ""
            }, function(results, status) {
                if (status === 'OK') {
                    var fromlocationL = {};
                    fromlocationL.lat = results[0].geometry.location.lat();
                    fromlocationL.long = results[0].geometry.location.lng();
                    $scope.fromLocationLatLong = fromlocationL;
                    
                    //to location
                    geocoder.geocode({
                        'address': toLocation.formatted_address + ""
                    }, function(toresults, tostatus) {
                        if (tostatus === 'OK') {
                            var toLocationL = {};
                            toLocationL.lat = toresults[0].geometry.location.lat();
                            toLocationL.long = toresults[0].geometry.location.lng();
                            $scope.toLocationLatLong = toLocationL;
                            //TODO: fire graphopper api for direction
                            
                            ApiService.getDirection($scope.fromLocationLatLong, $scope.toLocationLatLong).then(function(resp) {
                                $scope.directionInstruction = resp.data.paths;
                                
                                angular.forEach($scope.directionInstruction, function(val) {
                                    var route = {};
                                    
                                    route.time =  $scope.millisToMinutesAndSeconds(val.time);
                                    route.distance = Math.round(val.distance / 100) / 10;
                                    route.instructions = [];
                                    angular.forEach(val.instructions, function(inst, key){
                                      var instruction = {};
                                      
                                      instruction.distance = Math.round(inst.distance  / 100) / 10;  
                                      instruction.time = $scope.millisToMinutesAndSeconds(inst.time);
                                      instruction.sign = inst.sign;
                                      instruction.interval = inst.interval;
                                      instruction.street_name = inst.street_name;
                                      instruction.text = inst.text;
                                      route.instructions.push(instruction);
                                    });
                                    
                                    if(!$scope.isPresentInList(Global_Car.alternativeRoutes, route)){
                                       
                                       Global_Car.alternativeRoutes.push(route);
                                    }
                                })
                                Global_Car.currentRoute = Global_Car.alternativeRoutes[0];
                                Global_Car.currentPathInstructionIndex = 0;
                                $scope.navigationStarted = true;
                                //adding current vehicle into nearbyVehicle
                                $scope.addGlobalCarInNearByMatrix();
                                $scope.showMessage('Navigating through fastest route!');
                            });
                        } else {
                            alert('Geocode was not successful for the following reason: ' + tostatus);
                            $scope.showMessage('Error While getting current Location');
                        }
                    });
                } else {
                    alert('Geocode was not successful for the following reason: ' + status);
                    $scope.showMessage('Error While getting current Location');
                }
            });
        }

        $scope.addGlobalCarInNearByMatrix = function(){
            var currentVehicleToNearby = {};
            currentVehicleToNearby.allPath = Global_Car.alternativeRoutes;
            currentVehicleToNearby.currentPath = Global_Car.currentRoute;
            currentVehicleToNearby.journeyRemaniningTime = Global_Car.currentRoute.time;
            currentVehicleToNearby.currentPathInstructionIndex = Global_Car.currentPathInstructionIndex;
            currentVehicleToNearby.isCar = true;
            currentVehicleToNearby.uuid = Global_Car.uuid;
            currentVehicleToNearby.roadId = Global_Car.roadId;
            if(!$scope.isPresentInMatrix(currentVehicleToNearby)){
                $scope.nearbyVehicleMatrix.queue(currentVehicleToNearby); 
            }
        }

        $scope.uniqueList = function(instructions) {
            var uniqueList = new Set();
            angular.forEach(instructions, function(val) {
                if (val.street_name != "") {
                    uniqueList.add(val.street_name);
                }
            });
            
            return uniqueList;
        }

        $scope.isPresentInMatrix = function(vehicle){
            var found = false;
            if($scope.nearbyVehicleMatrix.length > 0){
               var copyOfMatrix = angular.copy($scope.nearbyVehicleMatrix);
               angular.forEach(copyOfMatrix.priv.data, function(val){
                    if(val.uuid == vehicle.uuid){
                        found = true;
                    }  
               });
            }
            return found;
        }

        $scope.isPresentInList = function(list, element){
            var found = false;
            angular.forEach(list, function(val){
                if(_.isEqual(val, element)){
                    found = true;
                }
            });
            return found;
        }

        
        $scope.logout = function(){
            Pubnub.unsubscribe({
                channels: [$scope.getAllChannels()]
            });
            $state.go('login');
        }

         $scope.$on("$destroy", function() {
            // clean up here
            $interval.cancel(interval);
        });

        //tear down - unsubscribe
        window.addEventListener("beforeunload", function(e) {
            // watch.clearWatch();
            Pubnub.unsubscribe({
                channels: [$scope.getAllChannels()]
            });
        });
    });
})
