angular.module('Geographr', ['ngRoute','Geographr.controllers', 'Geographr.colors', 'Geographr.canvas', 'Geographr.game', 'Geographr.directives', 'LocalStorageModule'])
	.config(['$routeProvider', function($routeProvider) { // Set up URL page routing
		$routeProvider.
			when('/', {templateUrl: 'partials/main.html', controller: 'Main'}). // Main page
		    otherwise({redirectTo: ''}); // Redirect to main page if none of the above match
	}]);