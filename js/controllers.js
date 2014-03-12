/* Controllers */

angular.module('Geographr.controllers', [])
.controller('Main', ['$scope', '$timeout', '$filter', 'localStorageService', 'colorUtility', 'canvasUtility', 'gameUtility', function($scope, $timeout, $filter, localStorageService, colorUtility, canvasUtility, gameUtility) {
    
        var getMap = true; // Disable getting terrain on each page load for debugging/bandwidth purposes
        $scope.version = 0.06; $scope.versionName = 'Rival Hypothesis'; $scope.needUpdate = false;
        $scope.zoomPosition = [120,120]; // Tracking zoom window position
        $scope.overPixel = {}; $scope.overPixel.x = '-'; $scope.overPixel.y = '-'; // Tracking your coordinates
        $scope.overPixel.type = $scope.overPixel.elevation = '-';
        $scope.authStatus = ''; $scope.helpText = '';
        $scope.localUsers = {};
        $scope.zoomLevel = 6;
        $scope.showLabels = true;
        $scope.showObjects = true;
        $scope.editTerrain = false;
        $scope.brushSize = 0;
        $scope.eventLog = [];
        $scope.placingObject = {};
        $scope.lockElevation = false; $scope.lockedElevation = 1;
        var mainPixSize = 2, zoomPixSize = 8, zoomSize = [50,50], lastZoomPosition = [0,0], viewCenter, panOrigin,
            keyPressed = false, keyUpped = true, panMouseDown = false,  dragPanning = false,
            pinging = false, userID, fireUser, localTerrain = {}, localObjects = {}, localLabels = {}, tutorialStep = 0,
            addingLabel = false, zoomLevels = [4,5,6,8,12,20,40,60], fireInventory;
    
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
                    $scope.camp = snapshot.val().camp;
                    $scope.newUser = snapshot.val()['new'];
                    fireRef.child('users').on('child_added', updateUsers);
                    fireRef.child('users').on('child_changed', updateUsers);
                    if(userID == 2) {
                        createServerListeners();
                    }
                    if(!$scope.newUser) { return; }
                    tutorialStep = -1;
                    tutorial('next');
                });
                fireInventory = fireUser.child('inventory');
                fireInventory.on('child_added', updateInventory);
                fireInventory.on('child_changed', updateInventory);
                fireInventory.on('child_removed', removeInventory);
            });
        };
    
        // Attempt to get these variables from localstorage
        var localStores = ['zoomPosition','zoomLevel'];
        for(var i = 0; i < localStores.length; i++) {
            if(localStorageService.get(localStores[i])) {
                $scope[localStores[i]] = localStorageService.get(localStores[i]);
            }
        }
    
        // Set up our canvases
        var fullTerrainCanvas = document.getElementById('fullTerrainCanvas');
        var fullObjectCanvas = document.getElementById('fullObjectCanvas');
        var fullPingCanvas = document.getElementById('fullPingCanvas');
        var fullHighCanvas = document.getElementById('fullHighCanvas');
        var zoomTerrainCanvas = document.getElementById('zoomTerrainCanvas');
        var zoomObjectCanvas = document.getElementById('zoomObjectCanvas');
        var zoomPingCanvas = document.getElementById('zoomPingCanvas');
        var zoomHighCanvas = document.getElementById('zoomHighCanvas');
        var fullTerrainContext = fullTerrainCanvas.getContext ? fullTerrainCanvas.getContext('2d') : null;
        var fullObjectContext = fullObjectCanvas.getContext ? fullObjectCanvas.getContext('2d') : null;
        var fullPingContext = fullPingCanvas.getContext ? fullPingCanvas.getContext('2d') : null;
        var fullHighContext = fullHighCanvas.getContext ? fullHighCanvas.getContext('2d') : null;
        var zoomTerrainContext = zoomTerrainCanvas.getContext ? zoomTerrainCanvas.getContext('2d') : null;
        var zoomObjectContext = zoomObjectCanvas.getContext ? zoomObjectCanvas.getContext('2d') : null;
        var zoomPingContext = zoomPingCanvas.getContext ? zoomPingCanvas.getContext('2d') : null;
        var zoomHighContext = zoomHighCanvas.getContext ? zoomHighCanvas.getContext('2d') : null;
        $timeout(function(){ alignCanvases(); }, 500); // Align canvases half a second after load
        canvasUtility.fillCanvas(fullTerrainContext,'2c3d4b');
        canvasUtility.fillCanvas(zoomTerrainContext,'2c3d4b');

        // Disable interpolation on zoom canvas
        zoomTerrainContext.mozImageSmoothingEnabled = false;
        zoomTerrainContext.webkitImageSmoothingEnabled = false;
        zoomTerrainContext.msImageSmoothingEnabled = false;
        zoomTerrainContext.imageSmoothingEnabled = false;
        
        // Align canvas positions
        var alignCanvases = function() {
            jQuery(fullPingCanvas).offset(jQuery(fullTerrainCanvas).offset());
            jQuery(fullObjectCanvas).offset(jQuery(fullTerrainCanvas).offset());
            jQuery(fullHighCanvas).offset(jQuery(fullTerrainCanvas).offset());
            jQuery(zoomPingCanvas).offset(jQuery(zoomTerrainCanvas).offset());
            jQuery(zoomObjectCanvas).offset(jQuery(zoomTerrainCanvas).offset());
            jQuery(zoomHighCanvas).offset(jQuery(zoomTerrainCanvas).offset());
        };

        // Prevent right-click on high canvases
        jQuery('body').on('contextmenu', '#fullHighCanvas', function(e){ return false; })
            .on('contextmenu', '#zoomHighCanvas', function(e){ return false; });
    
        // Disable text selection.
        fullHighCanvas.onselectstart = function() { return false; };
        zoomHighCanvas.onselectstart = function() { return false; };
    
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
                        cleanUser.new = true;
                    }
                }
                fireRef.set(cleaned);
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
            if($scope.zoomLevel == val && viewCenter) { return; }
            $timeout(function(){});
            var oldZoom = zoomSize;
            $scope.zoomLevel = parseInt(val);
            localStorageService.set('zoomLevel',$scope.zoomLevel);
            zoomPixSize = zoomLevels[$scope.zoomLevel];
            zoomSize = [600/zoomPixSize,600/zoomPixSize];
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
            localStorageService.set('zoomPosition',$scope.zoomPosition);
            canvasUtility.fillCanvas(fullHighContext,'erase'); // Draw new zoom highlight area
            canvasUtility.fillMainArea(fullHighContext,'rgba(255, 255, 255, 0.06)',
                lastZoomPosition,zoomSize);
            drawZoomCanvas();
            dimPixel();
        };
        // Add camp to inventory, newbie's first step
        $scope.createCamp = function() {
            tutorial('next');
            $scope.camp = {};
            $scope.camp.color = colorUtility.generate('camp',{hsv:true});
            fireUser.child('camp').set(angular.copy($scope.camp));
            fireInventory.push({
                type: 'camp', color: $scope.camp.color
            //    contents: [ 'somatic', 'somatic', 'somatic', 'somatic' ]
            });
        };
        // Adding an object to the canvas
        $scope.addObject = function(object) {
            object.adding = true;
            $scope.placingObject = object;
            jQuery(zoomHighCanvas).unbind('mousedown');
            jQuery(zoomHighCanvas).mousedown(placeObject);
        };
        $scope.cancelAddObject = function() {
            $timeout(function() {
                dimPixel();
                $scope.placingObject.adding = false;
                $scope.placingObject = {};
                jQuery(zoomHighCanvas).unbind('mousedown');
                jQuery(zoomHighCanvas).mousedown(zoomOnMouseDown);
            });
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

        var updateInventory = function(snapshot) {
            var itemAdded = snapshot.val();
            itemAdded.fireID = snapshot.name();
            $timeout(function(){
                switch(itemAdded.type) {
                    case 'camp':
                        fireUser.child('new').set(false);
                        $scope.newUser = false;
                        break;
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
        var selectObject = function(e) {
            $scope.theTime = new Date().getTime();
            if(e.which == 3) {  e.preventDefault(); return; } // If right click pressed
            if(e.which == 2) {  startDragPanning(e); return; } // If middle click pressed
            if($scope.authStatus != 'logged') { return; } // If not authed
            $timeout(function() {
                if(localObjects.hasOwnProperty($scope.overPixel.x + ':' + $scope.overPixel.y)) {
                    $scope.selectedObject = localObjects[$scope.overPixel.x + ':' + $scope.overPixel.y];
                    $scope.selectedObject.ownerNick = $scope.localUsers[$scope.selectedObject.owner].nick;
                    $scope.overPixel.object = $scope.selectedObject;
                } else { $scope.selectedObject = null; }
                dimPixel(); // Will draw select box
                if(!$scope.selectedObject) { return; }
                if($scope.selectedObject.type == 'camp' && $scope.selectedObject.owner == userID
                    && tutorialStep == 2) { tutorial('next'); }
            });
        };
        // Placing an object on the map
        var placeObject = function(event) {
            if($scope.authStatus != 'logged') { return; } // If not authed
            if(event.which == 3) { $scope.cancelAddObject(); event.preventDefault(); return; } // If right click pressed
            if(event.which == 2) { startDragPanning(event); return; } // If middle click pressed
            var object = $scope.placingObject;
            if(!gameUtility.validLocation(userID, localObjects, object.type, 
                [$scope.overPixel.x,$scope.overPixel.y])) { return; }
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
            if(object.type == 'energy' && tutorialStep == 6) { tutorial('next'); }
            $scope.placingObject = {};
            jQuery(zoomHighCanvas).unbind('mousedown');
            jQuery(zoomHighCanvas).mousedown(zoomOnMouseDown);
        };

        var drawZoomCanvas = function() {
            zoomTerrainContext.drawImage(fullTerrainCanvas, $scope.zoomPosition[0]*2, 
                $scope.zoomPosition[1]*2, 1200/zoomPixSize, 1200/zoomPixSize, 0, 0, 600, 600);
            
            var coords = [];
            
            canvasUtility.fillCanvas(zoomPingContext,'erase');
            for(var labKey in localLabels) {
                if(localLabels.hasOwnProperty(labKey)) {
                    coords = labKey.split(":");
                    drawLabel(coords,localLabels[labKey]);
                }
            }
            canvasUtility.fillCanvas(zoomObjectContext,'erase');
            for(var objKey in localObjects) {
                if(localObjects.hasOwnProperty(objKey)) {
                    coords = objKey.split(":");
                    drawObject(coords,localObjects[objKey]);
                }
            }
        };
        
        var changeZoomPosition = function(x,y) {
            canvasUtility.fillMainArea(fullHighContext,'erase',lastZoomPosition,zoomSize);
            $timeout(function(){});
            $scope.zoomPosition = [x,y];
            if(viewCenter){ localStorageService.set('zoomPosition',$scope.zoomPosition); }
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
            jQuery(zoomHighCanvas).unbind('mousemove');
            jQuery(zoomHighCanvas).unbind('mousedown');
            jQuery(zoomHighCanvas).mousemove(dragPan);
            jQuery(zoomHighCanvas).mouseup(stopDragPanning);
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
            jQuery(zoomHighCanvas).unbind('mousemove');
            jQuery(zoomHighCanvas).unbind('mousedown');
            jQuery(zoomHighCanvas).unbind('mouseup');
            jQuery(zoomHighCanvas).mousemove(zoomOnMouseMove);
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
            if(panMouseDown) { return; }
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
            if(localObjects.hasOwnProperty(x+':'+y)) { selectObject(e); return; } // If selecting an object
            
            // If an object is selected, but is not clicked, clear the selected object
            if($scope.selectedObject) { if($scope.selectedObject.grid != x + ':' + y) { 
                $timeout(function() { $scope.selectedObject = null; dimPixel(); delete $scope.overPixel.object; }); 
                return; }}
            if(!$scope.editTerrain || !getMap) { return; } // If terrain hidden or edit mode is off, we're done here
            if(e.which == 3) { // If right clicking (erase)
                for(var i = -1; i < 2; i++) {
                    for(var ii = -1; ii < 2; ii++) {
                        if(localTerrain[(x + i) + ':' + (y + ii)]) { // If something is there to erase
                            fireRef.child('terrain/' + (x + i) + ':' + (y + ii)).set(null);
                        }
                    }
                }
            } else if (e.which == 1) {
                for(var j = $scope.brushSize*-1; j < $scope.brushSize+1; j++) {
                    for(var jj = $scope.brushSize*-1; jj < $scope.brushSize+1; jj++) {
                        var localPixel = localTerrain[(x + j) + ':' + (y + jj)];
                        var newElevation = $scope.lockElevation || $scope.brushSize > 0 ? 
                            parseInt($scope.lockedElevation) : localPixel ? localPixel + 1 : 1;
                        // TODO: Check surrounding pixels to prevent too-steep cliffs
                        // Send update to firebase only if new elevation is different
                        if(localPixel != newElevation) {
                            newElevation = newElevation > 0 ? newElevation : null;
                            fireRef.child('terrain/' + (x+j) + ':' + (y+jj)).set(newElevation);
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
            var x = Math.floor((e.pageX - offset.left) / zoomPixSize),
                y = Math.floor((e.pageY - offset.top) / zoomPixSize);
            // If the pixel location has changed
            if($scope.overPixel.x != x + $scope.zoomPosition[0] || 
                $scope.overPixel.y != y + $scope.zoomPosition[1]) {
                zoomHighCanvas.style.cursor = 'default'; // Show cursor
                dimPixel(); // Dim the previous pixel
                var drawColor = 'rgba(255, 255, 255, 0.2)';
                $timeout(function() {
                    $scope.overPixel.x = (x+$scope.zoomPosition[0]); 
                    $scope.overPixel.y = (y+$scope.zoomPosition[1]);
                    var grid = $scope.overPixel.x+':'+$scope.overPixel.y;
                    $scope.overPixel.object = $scope.selectedObject ? $scope.selectedObject : localObjects[grid];
                    $scope.overPixel.type = localTerrain[grid] ? 'land' : 'water';
                    $scope.overPixel.elevation = localTerrain[grid] ? localTerrain[grid] : 0;
                    var coords = [$scope.overPixel.x-$scope.zoomPosition[0],
                        $scope.overPixel.y-$scope.zoomPosition[1]];
                    canvasUtility.drawSelect(zoomHighContext,coords,zoomPixSize,'cursor');
                    if(e.which == 1 || e.which == 3) {
                        zoomOnMouseDown(e);
                    }
                });
            }
        };
        // When scrolling on the zoom canvas
        var zoomScroll = function(event, delta, deltaX, deltaY){
            var doZoom = function() {
                if(deltaY < 0 && $scope.zoomLevel > 0) {
                    $scope.changeZoom($scope.zoomLevel - 1);
                } else if(deltaY > 0 && $scope.zoomLevel < zoomLevels.length-1) {
                    $scope.changeZoom($scope.zoomLevel + 1);
                }
                $('.zoom-slider').slider('setValue',$scope.zoomLevel);
            };
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(doZoom, 3);
            event.preventDefault();
            return false;
        };
        var scrollTimer; // Timer to prevent scroll event firing twice in a row

        // Draw selection box around selected cell
        var drawSelect = function() {
            if(!$scope.selectedObject) { return; }
            var coords = $scope.selectedObject.grid.split(':');
            coords = [coords[0]-$scope.zoomPosition[0],coords[1]-$scope.zoomPosition[1]];
            canvasUtility.drawSelect(zoomHighContext,coords,zoomPixSize,'object');
        };
        // Dim the pixel after leaving it
        var dimPixel = function() {
            canvasUtility.fillCanvas(zoomHighContext,'erase');
            drawSelect();
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
            fireRef.child('meta/pings/'+pinging[0] + ":" + pinging[1]).set(null);
            pinging = false;
        };
        var drawPing = function(snapshot) { canvasUtility.drawPing(fullPingContext,snapshot.name().split(":")); };
        var hidePing = function(snapshot) { canvasUtility.clearPing(fullPingContext,snapshot.name().split(":")); };
        // TODO: Draw pings on zoom ping canvas

        jQuery(zoomHighCanvas).mousedown(zoomOnMouseDown);
        jQuery(zoomHighCanvas).mousemove(zoomOnMouseMove);
        jQuery(zoomHighCanvas).mouseleave(zoomOnMouseOut);
        jQuery(zoomHighCanvas).mousewheel(zoomScroll);
        jQuery(fullHighCanvas).mousewheel(zoomScroll);
        jQuery(fullHighCanvas).mousemove(panOnMouseMove);
        jQuery(fullHighCanvas).mousedown(panOnMouseDown);
        jQuery(window).mouseup(onMouseUp);
        jQuery(window).resize(alignCanvases); // Re-align canvases on window resize
    
        // Draw terrain, whether adding, changing, or removing
        var drawTerrain = function(coords,value) {
            if(value) { localTerrain[coords.join(':')] = value; } else
                { delete localTerrain[coords.join(':')]; }
            canvasUtility.drawThing(zoomTerrainContext,localTerrain,coords,
                $scope.zoomPosition,zoomPixSize);
             canvasUtility.drawThing(fullTerrainContext,localTerrain,coords,0,0);
        };
        $scope.drawIso = function() {
            canvasUtility.drawIso(fullTerrainContext,localTerrain);
        };
        // Draw an object, whether adding, changing, or removing
        var drawObject = function(coords,value) {
            if(!$scope.showObjects) { return; }
            if(value) { localObjects[coords.join(':')] = value; } else { 
                delete localObjects[coords.join(':')]; 
                canvasUtility.fillMainArea(fullObjectContext,'erase',coords,[1,1]);
            }
            canvasUtility.drawThing(zoomObjectContext,localObjects,coords,
                $scope.zoomPosition,zoomPixSize);
            canvasUtility.drawThing(fullObjectContext,localObjects,coords,0,0);
        };
        // Draw labels
        var drawLabel = function(coords,text) {
            if(!$scope.showLabels) { return; }
            localLabels[coords.join(':')] = text;
            canvasUtility.drawLabel(zoomPingContext,
                [coords[0]-$scope.zoomPosition[0],coords[1]-$scope.zoomPosition[1]],text,zoomPixSize);
        };
        
        // When terrain is added/changed
        var addTerrain = function(snap) { drawTerrain(snap.name().split(':'),snap.val()); };
        // When terrain is removed
        var removeTerrain = function(snap) { drawTerrain(snap.name().split(':'),null); };
        // When an object is added/changed
        var addObject = function(snap) { drawObject(snap.name().split(':'),snap.val()); };
        // When an object is removed
        var removeObject = function(snap) { drawObject(snap.name().split(':'),null); };
        
        // Adding and removing labels
        var addLabel = function(snap) {
            var coords = snap.name().split(':');
            drawLabel(coords,snap.val());
            canvasUtility.drawLabel(zoomPingContext,
                [coords[0]-$scope.zoomPosition[0],coords[1]-$scope.zoomPosition[1]],snap.val());
        };
        var removeLabel = function(snap) {
            delete localLabels[snap.name().split(':')];
            drawZoomCanvas();
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
        if(getMap) {
            fireRef.child('terrain').on('child_added', addTerrain);
            fireRef.child('terrain').on('child_changed', addTerrain);
            fireRef.child('terrain').on('child_removed', removeTerrain);
        }
        fireRef.child('labels').on('child_added', addLabel);
        fireRef.child('labels').on('child_removed', removeLabel);
        fireRef.child('objects').on('child_added', addObject);
        fireRef.child('objects').on('child_changed', addObject);
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
            fireRef.child('status').set('online');
            fireRef.child('status').onDisconnect().set('offline');
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
        $scope.changeZoom($scope.zoomLevel); // Apply initial zoom on load
        changeZoomPosition($scope.zoomPosition[0],$scope.zoomPosition[1]); // Apply zoom position to full view
}])
;