// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'pubnub.angular.service', 'ngCordova', 'ion-google-place', 'ionic-toast', 'starter.logincontrollers', 'starter.registercontrollers', 'underscore'])

.run(function($ionicPlatform, LocationService) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }

  });
})



.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  .state('login', {
    url: '/login',
    templateUrl: 'templates/login.html',
    controller: 'LoginCtrl',
    cache : false
  })

  .state('register', {
    url: '/register',
    templateUrl: 'templates/register.html',
    controller: 'RegisterCtrl',
    cache : false
  })

  // setup an abstract state for the tabs directive
    .state('tab', {
    url: '/tab',
    abstract: true,
    templateUrl: 'templates/tabs.html',
    cache : false
  })

  /*// Each tab has its own nav history stack:
  .state('tab.dash1', {
    url: '/dash1',
    cache: false,
    views: {
      'tab-dash1': {
        templateUrl: 'templates/tab-dash1.html',
        controller: 'Dash1Ctrl'
      }
    }
  })*/


  .state('tab.dash', {
    url: '/dash',
    views: {
      'tab-dash': {
        cache : false,
        templateUrl: 'templates/tab-dash.html',
        controller: 'DashCtrl'
      }
    }
  })

  

  


  

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/login');

})

.constant('locationIQ', 'e9fbe60b2244e1a62302')
.constant('pubnub_pub_key', 'pub-c-4f947445-11f6-4a97-8f14-ee302a228bdc')
.constant('pubnub_sub_key', 'sub-c-4287ea34-57c7-11e7-b679-0619f8945a4f')
.constant('graphhopper', '2a24e316-61ea-4850-b231-4ef2fe25d229')
.constant('serverUrl', 'https://dashboard.heroku.com:3000/');//
