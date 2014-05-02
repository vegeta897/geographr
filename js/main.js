angular.module('Geographr', ['ngRoute','ngSanitize','Geographr.controllerMain','Geographr.controllerServer','Geographr.colors','Geographr.canvas','Geographr.actCanvas','Geographr.game','Geographr.directives','LocalStorageModule'])
	.config(['$routeProvider', function($routeProvider) { // Set up URL page routing
		$routeProvider.
			when('/', {templateUrl: 'partials/main.html', controller: 'Main'}). // Main page
            when('/server', {templateUrl: 'partials/server.html', controller: 'Server'}). // Server page
		    otherwise({redirectTo: ''}); // Redirect to main page if none of the above match
	}]);