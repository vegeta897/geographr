/* Controllers */

angular.module('Geographr.controllers', [])
.controller('Main', ['$scope', '$timeout', '$filter', 'localStorageService', 'colorUtility', 'canvasUtility', 'gameUtility', function($scope, $timeout, $filter, localStorageService, colorUtility, canvasUtility, gameUtility) {
    
        $scope.version = 0.02; $scope.versionName = 'Complex Composer'; $scope.needUpdate = false;
        $scope.overPixel = ['-','-']; // Tracking your coordinates'
        $scope.authStatus = '';
        $scope.helpText = '';
        $scope.localUsers = {};
        $scope.eventLog = [];
        var mainPixSize = 5, keyPressed = false, keyUpped = true,
            pinging = false, userID, fireUser, localTerrain = {}, localObjects = {}, tutorialStep = 0;
    
        // Create a reference to the pixel data for our canvas
        var fireRef = new Firebase('https://geographr.firebaseio.com/map1');
        
        fireRef.parent().child('version').once('value', function(snap) { // Check version number
            if($scope.version >= snap.val()) {
                // Create a reference to the auth service for our data
                var auth = new FirebaseSimpleLogin(fireRef, function(error, user) {
                    $timeout(function() {
                        if(error) {
                            console.log(error, $scope.loginEmail, $scope.loginPassword);
                            if(error.code == 'INVALID_USER') {
                                auth.createUser($scope.loginEmail, $scope.loginPassword,
                                    function(createdError, createdUser) {
                                        if(createdError) { console.log(createdError); } else {
                                            console.log('user created:',createdUser.id,createdUser.email);
                                            userID = createdUser.id;
                                            $scope.user = {id: createdUser.id, email: createdUser.email, score: 0,
                                                nick: gameUtility.capitalize(createdUser.email.substr(0,
                                                    createdUser.email.indexOf('@')))};
                                            fireRef.auth(createdUser.token, function() {
                                                fireUser = fireRef.child('users/'+userID);
                                                fireUser.set($scope.user,
                                                    function() { initUser(); });
                                            });
                                        }
                                    })
                            } else if(error.code == 'INVALID_PASSWORD') { $scope.authStatus = 'badPass'; } else
                            if(error.code == 'INVALID_EMAIL') { $scope.authStatus = 'badEmail'; }
                        } else if(user) {
                            console.log('logged in:',user.id,user.email);
                            userID = user.id;
                            fireUser = fireRef.child('users/'+userID);
                            initUser();
                        } else { console.log('logged out'); $scope.authStatus = 'notLogged'; }
                    });
                });
    
                // Authentication
                $scope.authenticate = function() {
                    $scope.authStatus = 'logging';
                    auth.login('password', {email: $scope.loginEmail,
                        password: $scope.loginPassword, rememberMe: true});
                };
                $scope.logOut = function() { auth.logout(); };
                
            } else { $scope.$apply(function() { $scope.needUpdate = true; } ) }
        });
    
        var tutorial = function(action) {
            if(action == 'init') {
                if(localStorageService.get('tutorialStep')) {
                    tutorialStep = localStorageService.get('tutorialStep');
                } else { tutorialStep = 0; }
            } else { tutorialStep++; }
            $timeout(function() {
                $scope.helpText = gameUtility.tutorial(tutorialStep);
                localStorageService.set('tutorialStep',tutorialStep);
            });
        };
        tutorial('init');
    
        var initUser = function() {
            fireUser.once('value', function(snapshot) {
                $timeout(function() {
                    $scope.user = snapshot.val();
                    $scope.userInit = true;
                    $scope.authStatus = 'logged';
                    jQuery(mainHighCanvas).mousedown(onMouseDown);
                    jQuery(mainHighCanvas).mouseup(onMouseUp);
                    fireRef.child('users').on('child_added', updateUsers);
                    fireRef.child('users').on('child_changed', updateUsers);
                    if(userID == 2) {
                        createServerListeners();
                    }
                });
            });
        };
    
        // Attempt to get these variables from localstorage
        var localStores = ['zoomPosition','zoomLevel'];
        for(var i = 0; i < localStores.length; i++) {
            if(localStorageService.get(localStores[i])) {
                $scope[localStores[i]] = localStorageService.get(localStores[i]);
            }
        }
    
        // Set up our canvas
        var objectCanvas = document.getElementById('objectCanvas');
        var objectContext = objectCanvas.getContext ? objectCanvas.getContext('2d') : null;
    
        // Prevent right-click on canvas
        jQuery('body').on('contextmenu', '#mainHighlightCanvas', function(e){ return false; });
    
        var mainPingCanvas = document.getElementById('mainPingCanvas'); // Main canvas pinging
        var mainHighCanvas = document.getElementById('mainHighlightCanvas'); // Main canvas highlighting
        var terrainCanvas = document.getElementById('terrainCanvas'); // Terrain canvas
        var mainPingContext = mainPingCanvas.getContext ? mainPingCanvas.getContext('2d') : null;
        var mainHighContext = mainHighCanvas.getContext ? mainHighCanvas.getContext('2d') : null;
        var terrainContext = terrainCanvas.getContext ? terrainCanvas.getContext('2d') : null;
        $timeout(function(){ alignCanvases(); }, 500); // Set its position to match the real canvas
        canvasUtility.fillCanvas(terrainContext,'2c3d4b');
    
        // Align canvas positions
        var alignCanvases = function() {
            jQuery(mainPingCanvas).offset(jQuery(objectCanvas).offset());
            jQuery(mainHighCanvas).offset(jQuery(objectCanvas).offset());
            jQuery(terrainCanvas).offset(jQuery(objectCanvas).offset());
        };
    
        // Keep track of if the mouse is up or down
        mainHighCanvas.onmousedown = function(event) {
            if(event.which == 2) {
    
            }
            return false;
        };
        mainHighCanvas.onmouseout = mainHighCanvas.onmouseup = function(event) {
            if(event.which == 2) {
    
            }
        };
    
        // Disable text selection.
        mainHighCanvas.onselectstart = function() { return false; };
    
        // Reset all objects, clear map, reset scores
        $scope.reset = function() {
            fireRef.once('value',function(snap) {
                var cleaned = snap.val();
                if(cleaned.hasOwnProperty('objects')) { delete cleaned.objects; }
                if(cleaned.hasOwnProperty('terrain')) { delete cleaned.terrain; }
                for(var key in cleaned.users) {
                    if(cleaned.users.hasOwnProperty(key)) {
                        var cleanUser = cleaned.users[key];
                        cleanUser.score = 0;
                    }
                }
                fireRef.set(cleaned);
            });
        };
    
        var onMouseDown = function(e) {
            e.preventDefault();
            if(userID == 2) { return; } // Ignore actions from server
            var x = $scope.overPixel[0], y = $scope.overPixel[1];
            // Make stuff happen when user clicks on map
            fireRef.child('terrain/' + x + ':' + y).set('land');
        };
    
        var onMouseUp = function(e) { mouseDown = false; };
    
        // Check for mouse moving to new pixel
        var onMouseMove = function(e) {
            var offset = jQuery(mainHighCanvas).offset(); // Get pixel location
            var x = Math.floor((e.pageX - offset.left) / mainPixSize),
                y = Math.floor((e.pageY - offset.top) / mainPixSize);
            // If the pixel location has changed
            if($scope.overPixel[0] != x || $scope.overPixel[1] != y) {
                mainHighCanvas.style.cursor = 'default'; // Show cursor
                dimPixel(); // Dim the previous pixel
                var drawColor = 'rgba(255, 255, 255, 0.2)';
                $scope.$apply(function() { 
                    $scope.overPixel = [x,y];
                    canvasUtility.drawSelect(mainHighContext, $scope.overPixel, 5);
                    if(e.which == 1) {
                        onMouseDown(e);
                    }
                });
            }
        };
        // Dim the pixel after leaving it
        var dimPixel = function() {
            canvasUtility.fillCanvas(mainHighContext,'erase');
        };
        // When the mouse leaves the canvas
        var onMouseOut = function() {
            dimPixel();
            $scope.$apply(function() { $scope.overPixel = ['-','-']; });
        };
        // Ping a pixel
        var ping = function() {
            if(pinging || $scope.overPixel[0] == '-') { return; }
            pinging = $scope.overPixel;
            fireRef.child('meta/pings/'+pinging[0] + ":" + pinging[1]).set(true);
            $timeout(function(){unPing()},1600); // Keep ping for 5 seconds
        };
        // Un-ping a pixel
        var unPing = function() {
            fireRef.child('meta/pings/'+pinging[0] + ":" + pinging[1]).set(null);
            pinging = false;
        };
        var drawPing = function(snapshot) { canvasUtility.drawPing(mainPingContext,snapshot.name().split(":")); };
        var hidePing = function(snapshot) { canvasUtility.clearPing(mainPingContext,snapshot.name().split(":")); };
    
        jQuery(mainHighCanvas).mousemove(onMouseMove);
        jQuery(mainHighCanvas).mouseleave(onMouseOut);
        jQuery(window).resize(alignCanvases); // Re-align canvases on window resize
    
        // When terrain is added/changed
        var drawTerrain = function(snap) {
            var terrain = localTerrain[snap.name()] = snap.val();
            var coords = snap.name().split(":"); 
            canvasUtility.drawTerrain(terrainContext,snap.val(),coords,localTerrain);
            if(!$scope.localUsers.hasOwnProperty('2')) { return; } // If users haven't been fetched yet
            // TODO: Log stuff
        };
        // When an object is added/changed
        var drawObject = function(snapshot) {
            localObjects[snapshot.name()] = snapshot.val(); // Update local object
        };
        // When an object is removed
        var removeObject = function(snapshot) {
            localObjects[snapshot.name()] = {}; // Delete local object
        };
    
        var sortArrayByProperty = function(arr, sortby, descending) {
            if(arr[0].hasOwnProperty(sortby)) {
                if(descending) {
                    arr.sort(function(obj1, obj2) {return obj2[sortby] - obj1[sortby]})
                } else {
                    arr.sort(function(obj1, obj2) {return obj1[sortby] - obj2[sortby]})
                }
            }
            return arr;
        };
    
        var updateUsers = function(snap) {
            $timeout(function() {
                if(snap.name() == 2) { return; } // Don't add server to user list
                $scope.localUsers[snap.name()] = snap.val();
                if(!$scope.user) { return; }
                $scope.user = $scope.user.id == snap.name() ? $scope.localUsers[$scope.user.id] : $scope.user;
                $scope.scoreBoard = [];
                for(var key in $scope.localUsers) {
                    if($scope.localUsers.hasOwnProperty(key)) {
                        $scope.scoreBoard.push($scope.localUsers[key])
                    }
                }
                $scope.scoreBoard = sortArrayByProperty($scope.scoreBoard,'score',true);
            });
        };

        var onServerStatus = function(snap) {
            // When the server status changes
            $timeout(function() { $scope.serverStatus = snap.val(); });
        };
            
        var addClient = function(snap) {
            // When a client logs in
        };
            
        var changeClient = function(snap) {
            // When a client's info changes
        };

        var removeClient = function(snap) {
            // When a client logs out
        };
        
        var onClientAction = function(snap) {
            // When a client action is received
            // Delete the action
            fireRef.child('clients/actions'+snap.name()).set(null);
            
        };

        // Firebase listeners
        fireRef.child('terrain').on('child_added', drawTerrain);
        fireRef.child('terrain').on('child_changed', drawTerrain);
        fireRef.child('objects').on('child_added', drawObject);
        fireRef.child('objects').on('child_changed', drawObject);
        fireRef.child('objects').on('child_removed', removeObject);
        fireRef.child('meta/pings').on('child_added', drawPing);
        fireRef.child('meta/pings').on('child_removed', hidePing);
        fireRef.child('status').on('value', onServerStatus);
    
        var createServerListeners = function() {
            console.log('server booting up!');
            fireRef.child('clients/logged').on('child_added', addClient);
            fireRef.child('clients/logged').on('child_changed', changeClient);
            fireRef.child('clients/logged').on('child_removed', removeClient);
            fireRef.child('clients/actions').on('child_added', onClientAction);
            fireRef.child('status').set('Online');
            fireRef.child('status').onDisconnect().set('Offline');
        };
    
        var onKeyDown = function(e) {
            if(!keyUpped) { return; }
            keyUpped = false;
            switch (e.which) {
                case 65: // A
                    ping();
                    break;
            }
        };
    
        jQuery(window).keydown(onKeyDown);
        jQuery(window).keyup(function() { keyUpped = true; });
    
}])
;