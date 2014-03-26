/* Controllers */

angular.module('Geographr.controllers', [])
.controller('Main', ['$scope', '$timeout', '$filter', 'localStorageService', 'colorUtility', 'canvasUtility', 'gameUtility', function($scope, $timeout, $filter, localStorage, colorUtility, canvasUtility, gameUtility) {
    
        $scope.version = 0.12; $scope.versionName = 'Premier Giant'; $scope.needUpdate = false;
        $scope.commits = []; // Latest commits from github api
        $scope.zoomLevel = 4; $scope.zoomPosition = [120,120]; // Tracking zoom window position
        $scope.overPixel = {}; $scope.overPixel.x = '-'; $scope.overPixel.y = '-'; // Tracking your coordinates
        $scope.overPixel.type = $scope.overPixel.elevation = '-'; $scope.onPixel = {};
        $scope.authStatus = ''; $scope.helpText = ''; $scope.lastTerrainUpdate = 0; $scope.terrainReady = false;
        $scope.localUsers = {};
        $scope.placingObject = {};
        $scope.showLabels = true; $scope.showObjects = true;
        $scope.editTerrain = false; $scope.smoothTerrain = false;
        $scope.brushSize = 0; $scope.lockElevation = false; $scope.lockedElevation = 1;
        $scope.eventLog = [];
        $scope.movePath = [];
        var mainPixSize = 1, zoomPixSize = 20, zoomSize = [45,30], lastZoomPosition = [0,0], viewCenter, panOrigin,
            keyPressed = false, keyUpped = true, panMouseDown = false,  dragPanning = false,
            pinging = false, userID, fireUser, localTerrain = {}, updatedTerrain = {}, localObjects = {}, 
            localLabels = {}, addingLabel = false, zoomLevels = [5,6,10,12,20,30,60], fireInventory, 
            tutorialStep = 0, nativeCamps = {}, visiblePixels = {}, moveTimers = {};
    
        // Create a reference to the pixel data for our canvas
        var fireRef = new Firebase('https://geographr.firebaseio.com/map1');
        var fireServer = fireRef.child('clients/actions');
        var auth; // Create a reference to the auth service for our data
        fireRef.parent().child('version').once('value', function(snap) { // Check version number
            if($scope.version >= snap.val()) {
                auth = new FirebaseSimpleLogin(fireRef, function(error, user) {
                    if(userID == 2) {
                        console.log('server re-authed!');
                        return;
                    }
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
                                                    createdUser.email.indexOf('@'))), new: true};
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
                if(localStorage.get('tutorialStep')) {
                    tutorialStep = localStorage.get('tutorialStep');
                } else { tutorialStep = 0; }
            } else { tutorialStep++; }
            $timeout(function() {
                $scope.helpText = gameUtility.tutorial(tutorialStep);
                localStorage.set('tutorialStep',tutorialStep);
            });
        };
        tutorial('init');
    
        var initUser = function() {
            fireUser.once('value', function(snap) {
                $timeout(function() {
                    $scope.user = snap.val();
                    $scope.userInit = true;
                    $scope.authStatus = 'logged';
                    $scope.camp = snap.val().camp;
                    visiblePixels = snap.val().hasOwnProperty('visiblePixels') ? snap.val().visiblePixels : {};
                    fireRef.child('users').on('child_added', updateUsers);
                    fireRef.child('users').on('child_changed', updateUsers);
                    if($scope.user.new) { tutorialStep = -1; tutorial('next'); }
                    initTerrain();
                    fireInventory = fireUser.child('inventory');
                    fireInventory.on('child_added', updateInventory);
                    fireInventory.on('child_changed', updateInventory);
                    fireInventory.on('child_removed', removeInventory);
                    fireUser.child('camp').on('value', function(snap) {
                        if(!snap.val()) { return; }
                        var userCamp = { type: 'userCamp', owner: userID, 
                            ownerNick: $scope.user.nick, grid: snap.val() };
                        localObjects[snap.val()] ? localObjects[snap.val()].push(userCamp) :
                            localObjects[snap.val()] = [userCamp];
                        drawObject(snap.val().split(':'),localObjects[snap.val()]);
                        $scope.user.camp = snap.val();
                    });
                });
            });
        };
    
        // Attempt to get these variables from localstorage
        var localStores = ['zoomPosition','zoomLevel','lastTerrainUpdate'];
        for(var i = 0; i < localStores.length; i++) {
            if(localStorage.get(localStores[i])) {
                $scope[localStores[i]] = localStorage.get(localStores[i]);
            }
        }
        if(localStorage.get('visiblePixels')) { localStorage.remove('visiblePixels'); } // Delete me
    
        // Set up our canvases
        var fullTerrainCanvas = document.getElementById('fullTerrainCanvas');
        var fullObjectCanvas = document.getElementById('fullObjectCanvas');
        var fullFogCanvas = document.getElementById('fullFogCanvas');
        var fullPingCanvas = document.getElementById('fullPingCanvas');
        var fullHighCanvas = document.getElementById('fullHighCanvas');
        var zoomTerrainCanvas = document.getElementById('zoomTerrainCanvas');
        var zoomObjectCanvas = document.getElementById('zoomObjectCanvas');
        var zoomFogCanvas = document.getElementById('zoomFogCanvas');
        var zoomHighCanvas = document.getElementById('zoomHighCanvas');
        var fullTerrainContext = fullTerrainCanvas.getContext ? fullTerrainCanvas.getContext('2d') : null;
        var fullObjectContext = fullObjectCanvas.getContext ? fullObjectCanvas.getContext('2d') : null;
        var fullFogContext = fullFogCanvas.getContext ? fullFogCanvas.getContext('2d') : null;
        var fullPingContext = fullPingCanvas.getContext ? fullPingCanvas.getContext('2d') : null;
        var fullHighContext = fullHighCanvas.getContext ? fullHighCanvas.getContext('2d') : null;
        var zoomTerrainContext = zoomTerrainCanvas.getContext ? zoomTerrainCanvas.getContext('2d') : null;
        var zoomObjectContext = zoomObjectCanvas.getContext ? zoomObjectCanvas.getContext('2d') : null;
        var zoomFogContext = zoomFogCanvas.getContext ? zoomFogCanvas.getContext('2d') : null;
        var zoomHighContext = zoomHighCanvas.getContext ? zoomHighCanvas.getContext('2d') : null;
        $timeout(function(){ alignCanvases(); }, 500); // Align canvases half a second after load
        canvasUtility.fillCanvas(fullFogContext,'2e3338');
        canvasUtility.fillCanvas(zoomFogContext,'2e3338');

        // Disable interpolation on zoom canvases
        zoomTerrainContext.mozImageSmoothingEnabled = zoomFogContext.mozImageSmoothingEnabled = false;
        zoomTerrainContext.webkitImageSmoothingEnabled = zoomFogContext.webkitImageSmoothingEnabled = false;
        zoomTerrainContext.msImageSmoothingEnabled = zoomFogContext.msImageSmoothingEnabled = false;
        zoomTerrainContext.imageSmoothingEnabled = zoomFogContext.imageSmoothingEnabled = false;
        
        // Align canvas positions
        var alignCanvases = function() {
            jQuery(fullPingCanvas).offset(jQuery(fullTerrainCanvas).offset());
            jQuery(fullObjectCanvas).offset(jQuery(fullTerrainCanvas).offset());
            jQuery(fullHighCanvas).offset(jQuery(fullTerrainCanvas).offset());
            jQuery(fullFogCanvas).offset(jQuery(fullTerrainCanvas).offset());
            jQuery(zoomFogCanvas).offset(jQuery(zoomTerrainCanvas).offset());
            jQuery(zoomObjectCanvas).offset(jQuery(zoomTerrainCanvas).offset());
            jQuery(zoomHighCanvas).offset(jQuery(zoomTerrainCanvas).offset());
            jQuery(zoomFogCanvas).offset(jQuery(zoomTerrainCanvas).offset());
        };

        // Prevent right-click on high canvases
        jQuery('body').on('contextmenu', '#fullHighCanvas', function(e){ return false; })
            .on('contextmenu', '#zoomHighCanvas', function(e){ return false; });
    
        // Disable text selection.
        fullHighCanvas.onselectstart = function() { return false; };
        zoomHighCanvas.onselectstart = function() { return false; };
        
        // Movement controls
        var controlsDIV = jQuery('#controls');
    
        // Reset player
        $scope.reset = function() {
            fireUser.once('value',function(snap) {
                var cleaned = snap.val();
                cleaned.new = true;
                fireUser.set(cleaned);
            });
        };
        
        // Redraw zoom canvas
        $scope.refresh = function(full) {
            drawZoomCanvas();
            if(full) { // If also refreshing the full view
                canvasUtility.fillCanvas(fullObjectContext,'erase');
                for(var objKey in localObjects) { // Draw objects
                    if(localObjects.hasOwnProperty(objKey)) {
                        var coords = objKey.split(":");
                        drawObject(coords,localObjects[objKey]);
                    }
                }
            }
        };

        $scope.changeZoom = function(val) {
            $scope.zoomLevel = parseInt(val);
            var oldZoom = zoomSize;
            localStorage.set('zoomLevel',$scope.zoomLevel);
            zoomPixSize = zoomLevels[$scope.zoomLevel];
            zoomSize = [900/zoomPixSize,600/zoomPixSize];
            var offset = [oldZoom[0]-zoomSize[0],oldZoom[1]-zoomSize[1]];
            if(!viewCenter) {
                viewCenter = [$scope.zoomPosition[0] + zoomSize[0]/2,
                    $scope.zoomPosition[1] + zoomSize[1]/2];
                lastZoomPosition = $scope.zoomPosition;
            } else {
                var fixedCoords = [Math.floor(viewCenter[0]-oldZoom[0]/2),Math.floor(viewCenter[1]-oldZoom[1]/2)];
                lastZoomPosition = [Math.floor(fixedCoords[0]+offset[0]/2), // Keep centered
                    Math.floor(fixedCoords[1]+offset[1]/2)];
            }
            var x = lastZoomPosition[0], y = lastZoomPosition[1]; // Fix zoom area going off edge
            if(x < 0) { x = 0; } if(y < 0) { y = 0; }
            if(x > 300 - zoomSize[0]) { x = 300 - zoomSize[0]; }
            if(y > 300 - zoomSize[1]) { y = 300 - zoomSize[1]; }
            $scope.zoomPosition = lastZoomPosition = [x,y];
            localStorage.set('zoomPosition',$scope.zoomPosition);
            canvasUtility.fillCanvas(fullHighContext,'erase'); // Draw new zoom highlight area
            canvasUtility.fillMainArea(fullHighContext,'rgba(255, 255, 255, 0.06)',
                lastZoomPosition,zoomSize);
            drawZoomCanvas();
            dimPixel();
        };
        // Create player camp, newbie's first step
        $scope.createCamp = function() {
            tutorial('next');
            $scope.user.new = false;
            fireUser.child('new').set(false);
            fireServer.push({ user: userID, action: 'createCamp' });
        };
        // Adding an object to the canvas
        $scope.addObject = function(object) {
            object.adding = true;
            $scope.placingObject = object;
            jQuery(zoomHighCanvas).unbind('mousedown').mousedown(placeObject);
        };
        $scope.cancelAddObject = function() {
            $timeout(function() {
                dimPixel();
                $scope.placingObject.adding = false;
                $scope.placingObject = {};
                jQuery(zoomHighCanvas).unbind('mousedown').mousedown(zoomOnMouseDown);
            });
        };
        $scope.selectObject = function(objectIndex) {
            if(!$scope.selectedGrid[objectIndex]) { return; }
            $timeout(function() {
                $scope.selectedObject = $scope.selectedGrid[objectIndex];
            });
        };
        $scope.movePlayer = function(dir) {
            if(dir == 'startStop') { // If starting or stopping movement
                if($scope.moving) {
                    fireServer.push({ user: userID, action: 'stop' });
                    $scope.moving = false; dimPixel(); return;
                } 
                $scope.moving = true; dimPixel();
                fireServer.push({ user: userID, action: 'move', path: $scope.movePath }); return;
            }
            if(dir == 'clear') { $timeout(function(){ $scope.movePath = []; dimPixel(); }); return; }
            // If new path, use player location, otherwise use last path node
            var destination = $scope.movePath.length == 0 ? [parseInt($scope.user.location.split(':')[0]),
                parseInt($scope.user.location.split(':')[1])] : 
                [parseInt($scope.movePath[$scope.movePath.length-1].split(':')[0]),
                    parseInt($scope.movePath[$scope.movePath.length-1].split(':')[1])];
            switch(dir) { // Apply move direction
                case 0: destination[1] = (destination[1] - 1); break;
                case 1: destination[0] = (destination[0] - 1); break;
                case 2: destination[0] = (destination[0] + 1); break;
                case 3: destination[1] = (destination[1] + 1); break;
            }
            var destGrid = destination.join(':');
            // Don't allow pathing into known water
            if(visiblePixels.hasOwnProperty(destGrid) && !localTerrain.hasOwnProperty(destGrid)) { return; }
            $timeout(function(){ $scope.movePath.push(destGrid); dimPixel(); });
        };
        $scope.changeBrush = function(val) {
            $timeout(function(){ 
                $scope.brushSize = val;
                $scope.lockElevation = $scope.lockElevation || val > 0; // Lock elevation if brush size is bigger than 1px
            });
        };
        $scope.addLabel = function(val) {
            addingLabel = true;
        };
        $scope.saveTerrain = function() { // Save terrain to firebase, notify clients to update terrain
            $timeout(function() {
                $scope.eventLog.unshift({
                    time: new Date().getTime(), user: 'You',
                    type: 'updated the terrain'
                });
            });
            fireRef.child('terrain').update(updatedTerrain, function() {
                updatedTerrain = {}; // Clear updated terrain object
                $scope.lastTerrainUpdate = new Date().getTime();
                fireRef.child('lastTerrainUpdate').set({user: userID, time:$scope.lastTerrainUpdate});
            });
        };

        var updateInventory = function(snapshot) {
            var itemAdded = snapshot.val();
            itemAdded.fireID = snapshot.name();
            $timeout(function(){
                switch(itemAdded.type) {
                    default:
                        break;
                }
                if(!$scope.inventory) { $scope.inventory = {}; }
                $scope.inventory[snapshot.name()] = itemAdded;
            });
        };

        var removeInventory = function(snapshot) {
            $timeout(function(){
                switch(snapshot.val().type) {
                    case 'camp':
                        tutorial('next');
                        break;
                    default:
                        break;
                }
                delete $scope.inventory[snapshot.name()];
                var items = 0; // Check how many items are in the inventory
                for(var key in $scope.inventory) {
                    if($scope.inventory.hasOwnProperty(key)) { items++; break; }
                }
                if(items == 0) {
                    $scope.inventory = null;
                }
            });
        };
        // Selecting an object on the map
        var selectGrid = function(e) {
            if(e.which == 3) {  e.preventDefault(); return; } // If right click pressed
            if(e.which == 2) {  startDragPanning(e); return; } // If middle click pressed
            if($scope.authStatus != 'logged') { return; } // If not authed
            $timeout(function() {
                if(localObjects.hasOwnProperty($scope.overPixel.x + ':' + $scope.overPixel.y)) {
                    $scope.selectedGrid = localObjects[$scope.overPixel.x + ':' + $scope.overPixel.y];
                    $scope.overPixel.objects = $scope.selectedGrid;
                    if($scope.selectedGrid.length == 1) { $scope.selectedObject = $scope.selectedGrid[0]; }
                } else { $scope.selectedGrid = null; }
                dimPixel(); // Will draw select box
            });
        };
        // Placing an object on the map
        var placeObject = function(event) {
            if($scope.authStatus != 'logged') { return; } // If not authed
            if(event.which == 3) { $scope.cancelAddObject(); event.preventDefault(); return; } // If right click pressed
            if(event.which == 2) { startDragPanning(event); return; } // If middle click pressed
            var object = $scope.placingObject;
            dimPixel(); // Dim the pixel being drawn on
            // Add the object in firebase
            fireRef.child('objects/'+$scope.overPixel.x + ':' + $scope.overPixel.y).set(
                {
                    owner: userID, type: object.type, color: object.color, created: new Date().getTime(),
                    contents: object.contents ? object.contents : [], life: 100, 
                    grid: $scope.overPixel.x + ':' + $scope.overPixel.y
                }
            );
            fireInventory.child(object.fireID).remove();
            if(object.type == 'camp') {
                $scope.camp.grid = $scope.overPixel.x + ':' + $scope.overPixel.y;
                fireUser.child('camp').update($scope.camp);
            }
            $scope.placingObject = {};
            jQuery(zoomHighCanvas).unbind('mousedown').mousedown(zoomOnMouseDown);
        };

        var drawZoomCanvas = function() {
            if(!$scope.terrainReady) { return; }
            zoomTerrainContext.drawImage(fullTerrainCanvas, $scope.zoomPosition[0]*mainPixSize, 
                $scope.zoomPosition[1]*mainPixSize, 900/zoomPixSize, 600/zoomPixSize, 0, 0, 900, 600);
            
            var coords = [];
            
            canvasUtility.fillCanvas(zoomObjectContext,'erase');
            for(var labKey in localLabels) {
                if(localLabels.hasOwnProperty(labKey)) {
                    coords = labKey.split(":");
                    drawLabel(coords,localLabels[labKey]);
                }
            }
            canvasUtility.fillCanvas(fullObjectContext,'erase');
            for(var objKey in localObjects) {
                if(localObjects.hasOwnProperty(objKey) && visiblePixels.hasOwnProperty(objKey)) {
                    coords = objKey.split(":");
                    drawObject(coords,localObjects[objKey]);
                }
            }
            canvasUtility.drawPlayer(fullObjectContext,$scope.user.location.split(':'),0,0);
            //canvasUtility.drawCamps(zoomObjectContext,nativeCamps,$scope.zoomPosition,zoomPixSize);
            if(!$scope.user || userID == 2) { return; }
            canvasUtility.drawFog(zoomFogContext,fullTerrainContext,visiblePixels,$scope.zoomPosition,zoomPixSize);
            zoomFogContext.drawImage(fullFogCanvas, $scope.zoomPosition[0]*mainPixSize,
                $scope.zoomPosition[1]*mainPixSize, 900/zoomPixSize, 600/zoomPixSize, 0, 0, 900, 600);
            canvasUtility.drawPlayer(zoomObjectContext,$scope.user.location.split(':'),
                $scope.zoomPosition,zoomPixSize);
        };
        
        var changeZoomPosition = function(x,y) {
            canvasUtility.fillMainArea(fullHighContext,'erase',lastZoomPosition,zoomSize);
            $timeout(function(){});
            $scope.zoomPosition = [x,y];
            if(viewCenter){ localStorage.set('zoomPosition',$scope.zoomPosition); }
            lastZoomPosition = [x,y];
            drawZoomCanvas();
            if(viewCenter){ canvasUtility.fillMainArea(fullHighContext,'rgba(255, 255, 255, 0.06)',
                [x,y],zoomSize); } // Draw new zoom rect
        };
        // Middle mouse panning on zoomed view
        var startDragPanning = function(e) {
            dragPanning = true;
            panOrigin = [$scope.overPixel.x,$scope.overPixel.y];
            dimPixel();
            jQuery(zoomHighCanvas).unbind('mousemove').unbind('mousedown')
                .mousemove(dragPan).mouseup(stopDragPanning);
            controlsDIV.unbind('mousemove').unbind('mousedown')
                .mousemove(dragPan).mouseup(stopDragPanning);
        };
        var dragPan = function(e) {
            if(!dragPanning || e.which == 0) { stopDragPanning(); return; }
            var offset = jQuery(zoomHighCanvas).offset(); // Get pixel location
            var x = Math.floor($scope.zoomPosition[0] + (e.pageX - offset.left) / zoomPixSize),
                y = Math.floor($scope.zoomPosition[1] + (e.pageY - offset.top) / zoomPixSize);
            var panOffset = [x - panOrigin[0], y - panOrigin[1]];
            if(panOffset[0] == 0 && panOffset[1] == 0) { return; }
            var newPosition = [$scope.zoomPosition[0]-panOffset[0],$scope.zoomPosition[1]-panOffset[1]];
            if(newPosition[0] < 0) { newPosition[0] = 0; } if(newPosition[1] < 0) { newPosition[1] = 0; }
            if(newPosition[0] > 300 - zoomSize[0]) { newPosition[0] = 300 - zoomSize[0]; }
            if(newPosition[1] > 300 - zoomSize[1]) { newPosition[1] = 300 - zoomSize[1]; }
            viewCenter = [newPosition[0]+zoomSize[0]/2,newPosition[1]+zoomSize[1]/2];
            changeZoomPosition(newPosition[0],newPosition[1]);
            dimPixel();
        };
        var stopDragPanning = function() {
            dragPanning = false;
            jQuery(zoomHighCanvas).unbind('mousemove').unbind('mousedown').unbind('mouseup')
                .mousemove(zoomOnMouseMove);
            controlsDIV.unbind('mousemove').unbind('mousedown').unbind('mouseup').mousemove(zoomOnMouseMove);
            if($scope.placingObject.hasOwnProperty('type')) {
                jQuery(zoomHighCanvas).mousedown(placeObject);
            } else {
                jQuery(zoomHighCanvas).mousedown(zoomOnMouseDown);
            }
        };
        // When panning the full view
        var fullViewPan = function(e) {
            var offset = jQuery(fullHighCanvas).offset(); // Get pixel location
            var x = Math.floor((e.pageX - offset.left) / mainPixSize),
                y = Math.floor((e.pageY - offset.top) / mainPixSize);
            viewCenter = [x,y]; // Store view center
            x = Math.floor(x - zoomSize[0]/2); y = Math.floor(y - zoomSize[1]/2); // Apply offsets
            if(x < 0) { x = 0; } if(y < 0) { y = 0; } // Stay in bounds
            if(x > 300 - zoomSize[0]) { x = 300 - zoomSize[0]; }
            if(y > 300 - zoomSize[1]) { y = 300 - zoomSize[1]; }
            if(lastZoomPosition[0] == x && lastZoomPosition[1] == y) { return; }
            changeZoomPosition(x,y);
            dimPixel();
        };
        // Mouse down on full view
        var panOnMouseDown = function(e) {
            e.preventDefault(); if(dragPanning) { return; } panMouseDown = true; fullViewPan(e);
        };
        var panOnMouseMove = function(e) { if(!panMouseDown || e.which == 0) { return; } fullViewPan(e); };
        var onMouseUp = function(e) { panMouseDown = dragPanning = false; };
        
        // Clicking in zoomed view
        var zoomOnMouseDown = function(e) {
            e.preventDefault();
            if(panMouseDown || !(e.target.id == 'zoomHighCanvas' || e.target.id == 'controls')) { return; }
            if(e.which == 2) {  startDragPanning(e); return; } // If middle click pressed
            if(userID == 2 || !userID) { return; } // Ignore actions from server or non-user
            var x = $scope.overPixel.x, y = $scope.overPixel.y;
            // Make stuff happen when user clicks on map
            if(addingLabel) {
                fireRef.child('labels/' + x + ':' + y).set($scope.labelText);
                $scope.labelText = '';
                addingLabel = false;
                return;
            }
            if(localObjects.hasOwnProperty(x+':'+y)) { selectGrid(e); return; } // If selecting an object
            
            // If an object is selected, but is not clicked, clear the selected object
            if($scope.selectedGrid[0]) { if($scope.selectedGrid[0].grid != x + ':' + y) { 
                $timeout(function() { 
                    $scope.selectedGrid = null; dimPixel(); 
                    delete $scope.overPixel.objects; delete $scope.selectedGrid; delete $scope.selectedObject;
                }); return; }}
            if(!$scope.editTerrain) { return; } // If terrain hidden or edit mode is off, we're done here
            if(e.which == 3) { // If right clicking (erase)
                for(var i = -1; i < 2; i++) {
                    for(var ii = -1; ii < 2; ii++) {
                        if(localTerrain[(x + i) + ':' + (y + ii)]) { // If something is there to erase
                            updatedTerrain[(x+i) + ':' + (y+ii)] = null;
                            drawTerrain([(x+i),(y+ii)],null);
                        }
                    }
                }
            } else if (e.which == 1) {
                var avgElevation = [0,0];
                for(var j = $scope.brushSize*-1; j < $scope.brushSize+1; j++) {
                    for(var jj = $scope.brushSize*-1; jj < $scope.brushSize+1; jj++) {
                        var localPixel = localTerrain[(x + j) + ':' + (y + jj)];
                        avgElevation[0] += localPixel || 0; avgElevation[1]++;
                        if($scope.smoothTerrain) { continue; }
                        var newElevation = $scope.lockElevation || $scope.brushSize > 0 ? 
                            parseInt($scope.lockedElevation) : localPixel ? localPixel + 1 : 1;
                        var nearElevation = (localTerrain[((x + j) - 1) + ':' + (y + jj)] || newElevation) +
                            (localTerrain[((x + j) + 1) + ':' + (y + jj)] || newElevation) +
                            (localTerrain[(x + j) + ':' + ((y + jj) - 1)] || newElevation) +
                            (localTerrain[(x + j) + ':' + ((y + jj) + 1)] || newElevation);
                        newElevation = localPixel > nearElevation/4 + 4 ? parseInt(nearElevation/4) + 4 : newElevation;
                        newElevation = localPixel < nearElevation/4 - 4 ? parseInt(nearElevation/4) - 4 : newElevation;
                        // Update only if new elevation is different, and grid is in bounds
                        if(localPixel != newElevation && x+j >= 0 && x+j < 300 && y+jj >= 0 && y+jj < 300) {
                            newElevation = newElevation > 0 ? newElevation : null;
                            updatedTerrain[(x+j) + ':' + (y+jj)] = newElevation;
                            localTerrain[(x+j) + ':' + (y+jj)] = newElevation;
                            drawTerrain([(x+j),(y+jj)],newElevation);
                        }
                    }
                }
                if($scope.smoothTerrain) {
                    avgElevation = avgElevation[0] / avgElevation[1];
                    for(var k = $scope.brushSize*-1; k < $scope.brushSize+1; k++) {
                        for(var kk = $scope.brushSize*-1; kk < $scope.brushSize+1; kk++) {
                            localPixel = localTerrain[(x + k) + ':' + (y + kk)] || 0;
                            var weight = ($scope.brushSize+1 - (Math.abs(k)+Math.abs(kk)) / 1.5) / $scope.brushSize;
                            var weightedElevation = Math.round(localPixel + 
                                (avgElevation-localPixel)*(weight/8));
                            if(localPixel != weightedElevation && x+k >= 0 && x+k < 300 && y+kk >= 0 && y+kk < 300) {
                                weightedElevation = weightedElevation > 0 ? weightedElevation : null;
                                updatedTerrain[(x+k) + ':' + (y+kk)] = weightedElevation;
                                localTerrain[(x+k) + ':' + (y+kk)] = weightedElevation;
                                drawTerrain([(x+k),(y+kk)],weightedElevation);
                            }
                        }
                    }
                }
            }
            $timeout(function() {
                $scope.overPixel.type = localTerrain[x + ':' + y] ? 'land' : 'water';
                $scope.overPixel.elevation = localTerrain[x + ':' + y] ? localTerrain[x + ':' + y] : 0;
            });
        };
    
        // Check for mouse moving to new pixel
        var zoomOnMouseMove = function(e) {
            var offset = jQuery(zoomHighCanvas).offset(); // Get pixel location
            var x = e.pageX - offset.left < 0 ? 0 : Math.floor((e.pageX - offset.left) / zoomPixSize);
            var y = e.pageY - offset.top < 0 ? 0 : Math.floor((e.pageY - offset.top) / zoomPixSize);
            // If the pixel location has changed
            if($scope.overPixel.x != x + $scope.zoomPosition[0] || 
                $scope.overPixel.y != y + $scope.zoomPosition[1]) {
                zoomHighCanvas.style.cursor = 'default'; // Show cursor
                $timeout(function() {
                    dimPixel(); // Dim the previous pixel
                    $scope.overPixel.x = (x+$scope.zoomPosition[0]); 
                    $scope.overPixel.y = (y+$scope.zoomPosition[1]);
                    var grid = $scope.overPixel.x+':'+$scope.overPixel.y;
                    if(visiblePixels.hasOwnProperty(grid)) { // If grid is visible or explored
                        $scope.overPixel.objects = $scope.selectedGrid ? $scope.selectedGrid : localObjects[grid];
                        $scope.overPixel.type = localTerrain[grid] ? 'land' : 'water';
                        $scope.overPixel.elevation = localTerrain[grid] ? localTerrain[grid] : 0;
                    } else { $scope.overPixel.type = $scope.overPixel.elevation = '-' }
                    var coords = [$scope.overPixel.x-$scope.zoomPosition[0],
                        $scope.overPixel.y-$scope.zoomPosition[1]];
                    var cursorType = $scope.editTerrain ? 'terrain' + $scope.brushSize : 'cursor';
                    canvasUtility.drawSelect(zoomHighContext,coords,zoomPixSize,cursorType);
                    if(e.which == 1 || e.which == 3) {
                        zoomOnMouseDown(e);
                    }
                });
            }
        };
        // When scrolling on the zoom canvas
        var zoomScroll = function(event, delta, deltaX, deltaY){
            var doZoom = function() {
                if(deltaY < 0 && $scope.zoomLevel > 0) { $scope.changeZoom($scope.zoomLevel - 1); } 
                else if(deltaY > 0 && $scope.zoomLevel < zoomLevels.length-1) {
                    $scope.changeZoom($scope.zoomLevel + 1);
                }
                $('.zoom-slider').slider('setValue',$scope.zoomLevel);
            };
            clearTimeout(scrollTimer); scrollTimer = setTimeout(doZoom, 3);
            event.preventDefault(); return false;
        };
        var scrollTimer; // Timer to prevent scroll event firing twice in a row
        
        // Dim the pixel after leaving it
        var dimPixel = function() {
            canvasUtility.fillCanvas(zoomHighContext,'erase');
            if($scope.movePath.length > 0) { // Draw movement path
                canvasUtility.drawPath(zoomHighContext,$scope.user.location,
                    $scope.movePath,$scope.zoomPosition,zoomPixSize,$scope.moving);
            }
            if($scope.selectedGrid && $scope.selectedGrid[0].grid) { // Draw selection box around selected cell
                var coords = $scope.selectedGrid[0].grid.split(':');
                coords = [coords[0]-$scope.zoomPosition[0],coords[1]-$scope.zoomPosition[1]];
                canvasUtility.drawSelect(zoomHighContext,coords,zoomPixSize,'object');
            }
        };
        // When the mouse leaves the zoomed view
        var zoomOnMouseOut = function() {
            dimPixel();
            $timeout(function() { $scope.overPixel.x = $scope.overPixel.y = 
                $scope.overPixel.type = $scope.overPixel.elevation = '-' });
        };
        // Ping a pixel
        var ping = function() {
            if(pinging || $scope.overPixel.x == '-') { return; }
            pinging = [$scope.overPixel.x,$scope.overPixel.y];
            fireRef.child('meta/pings/'+pinging[0] + ":" + pinging[1]).set(true);
            $timeout(function(){unPing()},1600); // Keep ping for 5 seconds
        };
        // Un-ping a pixel
        var unPing = function() {
            fireRef.child('meta/pings/'+pinging[0] + ":" + pinging[1]).set(null); pinging = false;
        };
        var drawPing = function(snapshot) { canvasUtility.drawPing(fullPingContext,snapshot.name().split(":")); };
        var hidePing = function(snapshot) { canvasUtility.clearPing(fullPingContext,snapshot.name().split(":")); };

        jQuery(zoomHighCanvas).mousedown(zoomOnMouseDown).mousemove(zoomOnMouseMove)
            .mouseleave(zoomOnMouseOut).mousewheel(zoomScroll);
        controlsDIV.mousedown(zoomOnMouseDown).mousemove(zoomOnMouseMove)
            .mouseleave(zoomOnMouseOut).mousewheel(zoomScroll);
        jQuery(fullHighCanvas).mousewheel(zoomScroll).mousemove(panOnMouseMove).mousedown(panOnMouseDown);
        jQuery(window).mouseup(onMouseUp).resize(alignCanvases); // Re-align canvases on window resize
    
        // Draw terrain, whether adding, changing, or removing
        var drawTerrain = function(coords,value) {
            if(value) { localTerrain[coords.join(':')] = value; } else
                { delete localTerrain[coords.join(':')]; }
            canvasUtility.drawTerrain(zoomTerrainContext,localTerrain,coords,
                $scope.zoomPosition,zoomPixSize);
            canvasUtility.fillCanvas(fullTerrainContext,'2c3d4b');
            canvasUtility.drawTerrain(fullTerrainContext,localTerrain,coords,0,0);
        };
        $scope.drawIso = function() {
            canvasUtility.drawIso(fullTerrainContext,localTerrain);
        };
        // Draw an object, whether adding, changing, or removing
        var drawObject = function(coords,value) {
            if(!$scope.showObjects) { return; }
            if(!value) { 
                delete localObjects[coords.join(':')];
                if($scope.selectedGrid[0].grid == coords.join(':')) { 
                    delete $scope.selectedGrid; delete $scope.selectedObject; }
                canvasUtility.fillMainArea(fullObjectContext,'erase',coords,[1,1]);
            }
            canvasUtility.drawObject(zoomObjectContext,value,coords,
                $scope.zoomPosition,zoomPixSize);
            canvasUtility.drawObject(fullObjectContext,value,coords,0,0);
        };
        // Draw labels
        var drawLabel = function(coords,text) {
            if(!$scope.showLabels) { return; }
            localLabels[coords.join(':')] = text;
            canvasUtility.drawLabel(zoomObjectContext,
                [coords[0]-$scope.zoomPosition[0],coords[1]-$scope.zoomPosition[1]],text,zoomPixSize);
            
        };
        
        // Adding and removing labels
        var addLabel = function(snap) { 
            if(localLabels[snap.name()] != snap.val()) {
                $timeout(function() {
                    $scope.eventLog.unshift({
                        time: new Date().getTime(), user: 'Someone', type: 'added a label', 
                        coords: snap.name().split(':')
                    });
                });
                drawLabel(snap.name().split(':'),snap.val());
            } 
        };
        var removeLabel = function(snap) { delete localLabels[snap.name()]; drawZoomCanvas(); };
    
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
        // When player location changes, redraw fog, adjust view, redraw player
        var movePlayer = function(snap) {
            if(!snap.val()) { return; }
            $scope.user.location = snap.val();
            $scope.onPixel = { 
                terrain: localTerrain[snap.val()] ? 'Land' : 'Water', objects: localObjects[snap.val()], 
                elevation: (localTerrain[snap.val()] || 0)
            };
            console.log('moving player to',snap.val());
            visiblePixels = gameUtility.getVisibility(localTerrain,visiblePixels,snap.val());
            $scope.movePath.splice($scope.movePath.indexOf(snap.val()),1);
            var firstWater;
            for(var i = 0; i < $scope.movePath.length; i++) {
                if(visiblePixels.hasOwnProperty($scope.movePath[i]) &&
                    !localTerrain.hasOwnProperty($scope.movePath[i])) { // If water
                    firstWater = $scope.movePath[i]; break; // End path just before the water
                }
            } // Get rid of rest of path from water
            if(firstWater) { $scope.movePath.splice($scope.movePath.indexOf(firstWater),999); } 
            if($scope.movePath.length == 0) { $scope.moving = false; }
            fireUser.child('visiblePixels').set(visiblePixels);
            $timeout(function(){
                canvasUtility.drawFog(fullFogContext,fullTerrainContext,visiblePixels,0,0);
                var x = snap.val().split(':')[0], y = snap.val().split(':')[1];
                var offX = x > 277 ? 277 - x : x < 22 ? 22 - x : 0; // Keep zoom view in-bounds
                var offY = y > 284 ? 284 - y : y < 14 ? 14 - y : 0;
                $scope.zoomPosition = [x - 22 + offX, y - 14 + offY];
                zoomSize = [45,30]; lastZoomPosition = $scope.zoomPosition;
                viewCenter = [$scope.zoomPosition[0] + zoomSize[0]/2, $scope.zoomPosition[1] + zoomSize[1]/2];
                localStorage.set('zoomPosition',$scope.zoomPosition);
                canvasUtility.fillCanvas(fullHighContext,'erase'); // Draw new zoom highlight area
                canvasUtility.fillMainArea(fullHighContext,'rgba(255, 255, 255, 0.06)',
                    lastZoomPosition,zoomSize);
                $scope.changeZoom(4);
                jQuery('.zoom-slider').slider('setValue',$scope.zoomLevel);
            });
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
            console.log(snap.val().action,'from',$scope.localUsers[snap.val().user].nick);
            var action = snap.val().action.split(',');
            switch(action[0]) {
                case 'createCamp':
                    var startGrid = gameUtility.createUserCamp(localTerrain,localObjects);
                    fireRef.child('users/'+snap.val().user).update({
                        camp: startGrid, location: startGrid
                    }); break;
                case 'move':
                    var baseMoveSpeed = 5000; // 5 seconds
                    var moveCount = 0, totalMoves = snap.val().path.length;
                    for(var i = 0; i < totalMoves; i++) { // End path just before water
                        if(!localTerrain.hasOwnProperty(snap.val().path[i])) { totalMoves = i; break; }
                    }
                    if(totalMoves == 0) { break; }
                    var move = function() {
                        fireRef.child('users/'+snap.val().user).update({ location: snap.val().path[moveCount] });
                        moveCount++;
                        if(moveCount >= totalMoves) {
                            clearTimeout(moveTimers[snap.val().user]);
                        } else {
                            moveTimers[snap.val().user] = setTimeout(move, 
                                baseMoveSpeed * (1 + localTerrain[snap.val().path[moveCount]] / 60));
                        }
                    };
                    moveTimers[snap.val().user] = setTimeout(move, 
                        baseMoveSpeed * (1 + localTerrain[snap.val().path[moveCount]] / 60));
                    break;
                case 'stop':
                    clearTimeout(moveTimers[snap.val().user]);
                    break;
                default: break;
            }
            fireServer.child(snap.name()).set(null); // Delete the action
        };
        // Download the map terrain data from firebase
        var downloadTerrain = function() {
            console.log(document.domain);
            var url;
            switch(document.domain) {
                case 'localhost': url = 'http://localhost/geographr/data/terrain.json'; break;
                case 'pixelatomy.com': url = 'http://pixelatomy.com/geographr/data/terrain.json'; break;
                case 'www.pixelatomy.com': url = 'http://www.pixelatomy.com/geographr/data/terrain.json'; break;
            }
            jQuery.ajax({
                url: url, dataType: 'json'
            }).done(function(results) {
                console.log('new terrain downloaded');
                localTerrain = results; // Download the whole terrain object at once into localTerrain
                canvasUtility.drawAllTerrain(fullTerrainContext,localTerrain); // Draw all terrain at once
                $scope.lastTerrainUpdate = new Date().getTime();
                localStorage.set('lastTerrainUpdate',$scope.lastTerrainUpdate);
                localStorage.set('terrain',localTerrain);
                prepareTerrain();
            });
        };
        
        var initTerrain = function() {
            if($scope.lastTerrainUpdate) { // If terrain was updated before, check for new updates
                fireRef.child('lastTerrainUpdate').once('value',function(snap) {
                    var needUpdate = true;
                    if(snap.val().time <= $scope.lastTerrainUpdate) { needUpdate = false; }
                    if(needUpdate) { downloadTerrain(); } else {
                        localTerrain = localStorage.get('terrain');
                        // Turn terrain and labels 180 degrees
//                        var terrain180 = gameUtility.terrain180(localTerrain);
//                        fireRef.child('terrain').set(terrain180);
//                        fireRef.child('lastTerrainUpdate').set({time: new Date().getTime(), user: '1'});
//                        var labels180 = gameUtility.terrain180(localLabels);
//                        fireRef.child('labels').set(labels180);
                        // TODO: Don't draw all terrain, just visible. Draw new visible pixels as they come.
                        canvasUtility.drawAllTerrain(fullTerrainContext,localTerrain); // Draw all terrain at once
                        prepareTerrain();
                    }
                });
            } else { downloadTerrain(); }
        };
        
       var prepareTerrain = function() {
           $scope.terrainReady = true;
           fireRef.child('camps').once('value',function(snap) {
               if(!snap.val()) { // Generate camps if none on firebase
                   var nativeLocations = gameUtility.genNativeCamps(localTerrain);
                   fireRef.child('camps').set(nativeLocations); return;
               } 
               var camps = snap.val();
               for(var key in camps) { // Generate camp details from locations
                   if(camps.hasOwnProperty(key)) {
                       Math.seedrandom(key);
                       var x = key.split(':')[0], y = key.split(':')[1];
                       var camp = { type: 'camp', name: Chance(x*1000 + y).word(), grid: key };
                       if(localObjects.hasOwnProperty(key)) { localObjects[key].push(camp); } 
                       else { localObjects[key] = [camp]; }
                   }
               }
               fireUser.child('location').on('value', movePlayer);
           });
           if(userID == 2) { // If server
               console.log('server ready!');
               fireRef.child('clients/logged').on('child_added', addClient);
               fireRef.child('clients/logged').on('child_changed', changeClient);
               fireRef.child('clients/logged').on('child_removed', removeClient);
               fireServer.on('child_added', onClientAction);
               fireRef.child('status').set('online');
               var loginEmail = localStorage.get('serverLoginEmail');
               var loginPassword = localStorage.get('serverLoginPassword');
               var stayAwake = function() {
                   fireRef.child('status').set('online');
                   fireRef.child('serverTest').set('test');
                   fireRef.child('serverTest').set(null);
                   auth.login('password', {email: loginEmail, password: loginPassword, rememberMe: true});
                   awakeTimer = setTimeout(stayAwake, 3600000); // Re-authenticate every hour
               };
               var awakeTimer = setTimeout(stayAwake, 3600000);
               fireRef.child('status').onDisconnect().set('offline');
               canvasUtility.fillCanvas(fullFogContext,'erase');
               zoomFogCanvas.style.visibility="hidden";
           }
           
       };
        
        fireRef.child('labels').once('value',function(snap) {
            localLabels = snap.val();
            fireRef.child('labels').on('child_added', addLabel);
            fireRef.child('labels').on('child_removed', removeLabel);
        });
        fireRef.child('meta/pings').on('child_added', drawPing);
        fireRef.child('meta/pings').on('child_removed', hidePing);
        fireRef.child('status').on('value', function(snap) { // When the server status changes
            $timeout(function() { 
                $scope.serverStatus = snap.val();
                if(snap.val() == 'offline') {
                    if($scope.moving) {
                        $scope.eventLog.push({ time: new Date().getTime(),
                            user: 'Server offline, movement cancelled.' })
                    }
                    $timeout(function() { $scope.moving = false; });
                }
            });
        });
    
        var onKeyDown = function(e) {
            if(!keyUpped) { return; }
            keyUpped = false;
            switch (e.which) {
                case 65: ping(); break; // A
            }
        };
    
        jQuery(window).keydown(onKeyDown).keyup(function() { keyUpped = true; });
        //$scope.changeZoom($scope.zoomLevel); // Apply initial zoom on load
        //changeZoomPosition($scope.zoomPosition[0],$scope.zoomPosition[1]); // Apply zoom position to full view

        jQuery.ajax({ // Get last 8 commits from github
            url: 'https://api.github.com/repos/vegeta897/geographr/commits',
            dataType: 'jsonp',
            success: function(results) {
                for(var i = 0; i < results.data.length; i++) {
                    $scope.commits.push({
                        message:results.data[i].commit.message,date:Date.parse(results.data[i].commit.committer.date)
                    });
                    if($scope.commits.length > 7) { break; }
                }
            }
        });
}])
;