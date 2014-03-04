/* Controllers */

angular.module('Geographr.controllers', [])
.controller('Main', ['$scope', '$timeout', '$filter', 'localStorageService', 'colorUtility', 'canvasUtility', 'gameUtility', function($scope, $timeout, $filter, localStorageService, colorUtility, canvasUtility, gameUtility) {
    
    $scope.version = 0.01; $scope.versionName = 'Predictable Taste'; $scope.needUpdate = false;
    $scope.overPixel = ['-','-']; // Tracking your coordinates'
    $scope.authStatus = '';
    $scope.helpText = '';
    $scope.localUsers = {};
    $scope.eventLog = [];
    var mainPixSize = 5, keyPressed = false, keyUpped = true, mouseDown,
        pinging = false, userID, fireUser, localNodes = {}, tutorialStep = 0;

    // Create a reference to the pixel data for our canvas
    var fireRef = new Firebase('https://icebreakr.firebaseio.com/geographr/map1');
    
    fireRef.child('version').once('value', function(snap) { // Check version number
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
                                        $scope.user = {id: createdUser.id, email: createdUser.email,
                                            taps: 0, score: 0, breaks: 0,
                                            nick: createdUser.email.substr(0,createdUser.email.indexOf('@'))};
                                        fireRef.auth(createdUser.token, function() {
                                            fireUser = fireRef.child('users/'+userID);
                                            fireUser.set($scope.user,
                                                function() { initUser(); });
                                            $timeout(function() { $scope.authStatus = 'logged'; });
                                        });
                                    }
                                })
                        } else if(error.code == 'INVALID_PASSWORD') { $scope.authStatus = 'badPass'; } else
                        if(error.code == 'INVALID_EMAIL') { $scope.authStatus = 'badEmail'; }
                    } else if(user) {
                        console.log('logged in:',user.id,user.email);
                        $scope.user = user;
                        userID = user.id;
                        fireUser = fireRef.child('users/'+userID);
                        initUser();
                        $scope.authStatus = 'logged';
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
                jQuery(mainHighCanvas).mousedown(onMouseDown);
                jQuery(mainHighCanvas).mouseup(onMouseUp);
                fireRef.child('users').on('child_added', updateUsers);
                fireRef.child('users').on('child_changed', updateUsers);
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
    var mainCanvas = document.getElementById('mainCanvas');
    var mainContext = mainCanvas.getContext ? mainCanvas.getContext('2d') : null;

    // Prevent right-click on canvas
    jQuery('body').on('contextmenu', '#mainHighlightCanvas', function(e){ return false; });

    var mainPingCanvas = document.getElementById('mainPingCanvas'); // Main canvas pinging
    var mainHighCanvas = document.getElementById('mainHighlightCanvas'); // Main canvas highlighting
    var mainLowCanvas = document.getElementById('lowlightCanvas'); // Main canvas lowlighting
    var mainPingContext = mainPingCanvas.getContext ? mainPingCanvas.getContext('2d') : null;
    var mainHighContext = mainHighCanvas.getContext ? mainHighCanvas.getContext('2d') : null;
    var mainLowContext = mainLowCanvas.getContext ? mainLowCanvas.getContext('2d') : null;
    $timeout(function(){ alignCanvases(); }, 500); // Set its position to match the real canvas
    canvasUtility.fillCanvas(mainLowContext,'1f2022');

    // Align canvas positions
    var alignCanvases = function() {
        jQuery(mainPingCanvas).offset(jQuery(mainCanvas).offset());
        jQuery(mainHighCanvas).offset(jQuery(mainCanvas).offset());
        jQuery(mainLowCanvas).offset(jQuery(mainCanvas).offset());
    };

    // Keep track of if the mouse is up or down
    mainHighCanvas.onmousedown = function(event) {
        mouseDown = 1;
        if(event.which == 2) {

        }
        return false;
    };
    mainHighCanvas.onmouseout = mainHighCanvas.onmouseup = function(event) {
        if(event.which == 2) {

        }
        mouseDown = 0;
    };

    // Disable text selection.
    mainHighCanvas.onselectstart = function() { return false; };

    // Reset all nodes and scores
    $scope.reset = function() {
        fireRef.once('value',function(snap) {
            var cleaned = snap.val();
            delete cleaned.nodes;
            for(var key in cleaned.users) {
                if(cleaned.users.hasOwnProperty(key)) {
                    var cleanUser = cleaned.users[key];
                    cleanUser.breaks = cleanUser.score = cleanUser.taps = 0;
                }
            }
            fireRef.set(cleaned);
        });
    };

    var onMouseDown = function(e) {
        e.preventDefault();
        var x = $scope.overPixel[0], y = $scope.overPixel[1];
        fireUser.child('taps').once('value', function(snap) {
            $scope.$apply(function() {
                $scope.user.taps = snap.val() + 1;
                $scope.user.score = $scope.user.taps - $scope.user.breaks * 30;
                fireUser.set(angular.copy($scope.user));
            });
        });
        fireRef.child('nodes').once('value', function(snap) {
            var newNodes = gameUtility.tapNode(snap.val(),x,y); // Tap dat node
            var newCount = 0;
            for(var key in newNodes) {
                if(newNodes.hasOwnProperty(key)) {
                    newCount += 1;
                }
            }
            console.log(newCount,'nodes updated/added to firebase');
            fireRef.child('nodes').update(angular.copy(newNodes));
        })
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
            //dimPixel(); // Dim the previous pixel
            //var drawColor = 'rgba(255, 255, 255, 0.1)';
            //canvasUtility.drawPixel(mainHighContext, drawColor, // Highlight pixel underneath cursor
            //    $scope.overPixel, [1,1]);
            $scope.$apply(function() { $scope.overPixel = [x,y]; });
        }
    };
    // Dim the pixel after leaving it
    var dimPixel = function() {
        canvasUtility.fillCanvas(mainHighContext,'erase');
    };
    // When the mouse leaves the canvas
    var onMouseOut = function() {
        //dimPixel();
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

    // When a tap is added/changed
    var drawNode = function(snap) {
        var node = localNodes[snap.name()] = snap.val();
        var coords = snap.name().split(":");
        canvasUtility.drawNode(mainContext,mainLowContext,coords[0],coords[1],localNodes);
        
        if(!$scope.localUsers.hasOwnProperty('4')) { return; } // If users haven't been fetched yet
        // TODO: Log stuff
//            $scope.eventLog.unshift({ user: $scope.localUsers[snap.val().lastUser].nick, action: 'tapped',
//                coords: coords[0] + ' , ' + coords[1], time: snap.val().lastTap });
//            if($scope.eventLog.length > 10) { // Keep the event log to 10 messages max
//                $scope.eventLog.pop();
//            }
        
        // TODO: Draw 240x150 mini-map, pixel brightness = node brightness
    };
    // When the board is reset
    var clearCanvas = function(snapshot) {
        localNodes = {}; // Delete all local nodes
        $scope.eventLog = [];
        canvasUtility.fillCanvas(mainContext,'1f2022'); // Clear canvas
        $timeout(function(){ alignCanvases(); }, 200); // Realign canvases
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
            $scope.localUsers[snap.name()] = snap.val();
            if(!$scope.user) { return; }
            $scope.user = $scope.localUsers[$scope.user.id];
            $scope.scoreBoard = [];
            for(var key in $scope.localUsers) {
                if($scope.localUsers.hasOwnProperty(key)) {
                    $scope.scoreBoard.push($scope.localUsers[key])
                }
            }
            $scope.scoreBoard = sortArrayByProperty($scope.scoreBoard,'score',true);
        });
    };

    // Firebase listeners
    fireRef.child('nodes').on('child_added', drawNode);
    fireRef.child('nodes').on('child_changed', drawNode);
    fireRef.child('nodes').on('child_removed', clearCanvas);
    fireRef.child('meta/pings').on('child_added', drawPing);
    fireRef.child('meta/pings').on('child_removed', hidePing);

    var onKeyDown = function(e) {
        if(!keyUpped) { return; }
        keyUpped = false;
        switch (e.which) {
            case 65: // A
                ping();
                break;
        }
    };
        
    // Draw grid
//        for(var ix = 0; ix < 400; ix++) {
//            for(var iy = 0; iy < 250; iy++) {
//                mainContext.fillStyle = '#332222';
//                mainContext.fillRect(ix*mainPixSize+1,iy*mainPixSize+1,1,1);
//            }
//        }

    jQuery(window).keydown(onKeyDown);
    jQuery(window).keyup(function() { keyUpped = true; });
    
}])
;