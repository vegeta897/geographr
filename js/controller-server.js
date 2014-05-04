angular.module('Geographr.controllerServer', [])
.controller('Server', ['$scope', '$timeout', 'localStorageService', 'colorUtility', 'canvasUtility', 'gameUtility', function($scope,$timeout,localStorage,colorUtility,canvasUtility,gameUtility) {
        $scope.zoomLevel = 4; $scope.zoomPosition = [120,120]; // Tracking zoom window position
        $scope.overPixel = {}; $scope.overPixel.x = '-'; $scope.overPixel.y = '-'; // Tracking your coordinates
        $scope.overPixel.type = $scope.overPixel.elevation = '-'; $scope.onPixel = {};
        $scope.authStatus = ''; $scope.helpText = ''; $scope.lastTerrainUpdate = 0; $scope.terrainReady = false;
        $scope.mapElements = { labels: true, objects: true };
        gameUtility.attachScope($scope);
        var mainPixSize = 1, zoomPixSize = 20, zoomSize = [45,30], lastZoomPosition = [0,0], 
            viewCenter, panOrigin, panMouseDown = false,  dragPanning = false,
            userID, fireUser, localTerrain = {}, localObjects = {}, localLabels = {},
            zoomLevels = [4,6,10,12,20,30,60], moveTimers = {}, campList = [], localUsers = {}, objectInfoPanel;
        // Create a reference to the pixel data for our canvas
        var fireRef = new Firebase('https://geographr.firebaseio.com/map1'); gameUtility.attachFireRef(fireRef);
        var fireServer = fireRef.child('clients/actions');
        var auth; // Create a reference to the auth service for our data
        var initUser = function() {
            $scope.user = {email:'server@admin.com',id:'2',nick:'Server'}; 
            $scope.userInit = true; $scope.authStatus = 'logged';
            initTerrain();
        };
        auth = new FirebaseSimpleLogin(fireRef, function(error, user) {
            if(userID == 2) { console.log('server re-authed!'); return; }
            $timeout(function() {
                if(error) {
                    console.log(error, $scope.loginEmail, $scope.loginPassword);
                    if(error.code == 'INVALID_USER') {
                        console.log('Incorrect server credentials')
                    } else if(error.code == 'INVALID_PASSWORD') { $scope.authStatus = 'badPass'; } else
                    if(error.code == 'INVALID_EMAIL') { $scope.authStatus = 'badEmail'; }
                } else if(user) {
                    console.log('Server authorized'); userID = user.id;
                    fireUser = fireRef.child('users/'+userID);
                    initUser();
                } else { console.log('logged out'); $scope.authStatus = 'notLogged'; }
            });
        });

        // Authentication
        $scope.authenticate = function(loginEmail,loginPassword) {
            $scope.authStatus = 'logging';
            auth.login('password', {email: loginEmail,
                password: loginPassword, rememberMe: true});
        };
        $scope.logOut = function() { auth.logout(); };
    
        // Attempt to get these variables from localstorage
        var localStores = ['zoomPosition','zoomLevel','lastTerrainUpdate'];
        for(var i = 0; i < localStores.length; i++) { if(localStorage.get(localStores[i])) {
            $scope[localStores[i]] = localStorage.get(localStores[i]);
        }}
    
        // Set up our canvases
        var fullTerrainCanvas = document.getElementById('fullTerrainCanvas'); // Mini-map
        var fullObjectCanvas = document.getElementById('fullObjectCanvas');
        var fullFogCanvas = document.getElementById('fullFogCanvas');
        var fullPingCanvas = document.getElementById('fullPingCanvas');
        var fullHighCanvas = document.getElementById('fullHighCanvas');
        var zoomTerrainCanvas = document.getElementById('zoomTerrainCanvas'); // Main view
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

        // Disable interpolation on zoom canvases
        zoomTerrainContext.mozImageSmoothingEnabled = zoomFogContext.mozImageSmoothingEnabled = false;
        zoomTerrainContext.webkitImageSmoothingEnabled = zoomFogContext.webkitImageSmoothingEnabled = false;
        zoomTerrainContext.msImageSmoothingEnabled = zoomFogContext.msImageSmoothingEnabled = false;
        zoomTerrainContext.imageSmoothingEnabled = zoomFogContext.imageSmoothingEnabled = false;

        // Prevent right-click on high canvases
        jQuery('body').on('contextmenu', '#fullHighCanvas', function(e){ return false; })
            .on('contextmenu', '#zoomHighCanvas', function(e){ return false; });
        var tutorialImage = jQuery(document.getElementById('tutorialImage'));
    
        fullHighCanvas.onselectstart = function() { return false; }; // Disable text selection.
        zoomHighCanvas.onselectstart = function() { return false; };

        $scope.attachObjInfo = function() {
            objectInfoPanel = jQuery(document.getElementById('objectInfo'));
            objectInfoPanel.children('div').mousedown(zoomOnMouseDown).mousemove(zoomOnMouseMove)
                .mouseleave(zoomOnMouseOut).mousewheel(zoomScroll);
        };
        $scope.countTo = function(n) { 
            var counted = []; for(var i = 0; i < n; i++) { counted.push(i+1); } return counted; };
        $scope.refresh = function() { drawZoomCanvas(); }; // Redraw zoom canvas
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
            x = Math.min(300 - zoomSize[0],Math.max(x,0)); y = Math.min(300 - zoomSize[1],Math.max(y,0));
            $scope.zoomPosition = lastZoomPosition = [x,y];
            localStorage.set('zoomPosition',$scope.zoomPosition);
            canvasUtility.fillCanvas(fullHighContext,'erase'); // Draw new zoom highlight area
            canvasUtility.fillMainArea(fullHighContext,'rgba(255, 255, 255, 0.06)',
                lastZoomPosition,zoomSize);
            drawZoomCanvas();
            dimPixel();
        };
        // Selecting an object on the map
        var selectGrid = function(e) {
            if(e.which == 3) { e.preventDefault(); return; } // If right click pressed
            if(e.which == 2) { startDragPanning(e); return; } // If middle click pressed
            if($scope.authStatus != 'logged') { return; } // If not authed
            $timeout(function(){
                if(localObjects.hasOwnProperty($scope.overPixel.x + ':' + $scope.overPixel.y)) {
                    $scope.selectedGrid = localObjects[$scope.overPixel.x + ':' + $scope.overPixel.y];
                    $scope.overPixel.objects = $scope.selectedGrid;
                    if($scope.selectedGrid.length == 1) {
                        $scope.selectedObject = $scope.selectedGrid[0];
                        var grid = $scope.selectedObject.grid;
                        if($scope.selectedObject.type == 'camp') {
                            $scope.selectedObject = gameUtility.expandCamp(grid);
                            $scope.selectedObject.visited = true;
                        }
                    }
                } else { $scope.selectedGrid = null; }
                drawZoomCanvas();
            });
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
                if(localObjects.hasOwnProperty(objKey)) {
                    coords = objKey.split(":");
                    drawObject(coords,localObjects[objKey]);
                }
            }
            if($scope.selectedObject) { // Show/hide object info panel
                var top = ($scope.selectedObject.grid.split(':')[1] - $scope.zoomPosition[1]) 
                    * zoomPixSize + zoomPixSize/2;
                var left = ($scope.selectedObject.grid.split(':')[0] - $scope.zoomPosition[0]) 
                    * zoomPixSize + zoomPixSize*1.5;
                objectInfoPanel.show();
                if(top < 0 || left < 0 || left + objectInfoPanel.children('div').outerWidth() >= 900 || 
                    top + objectInfoPanel.children('div').outerHeight() >= 600) { 
                    objectInfoPanel.hide(); 
                } else {
                    objectInfoPanel.offset({top: top + jQuery(zoomHighCanvas).offset().top,
                        left: left + jQuery(zoomHighCanvas).offset().left });
                }
            }
            
            if(!$scope.user) { return; }
            zoomFogContext.drawImage(fullFogCanvas, $scope.zoomPosition[0]*mainPixSize,
                $scope.zoomPosition[1]*mainPixSize, 900/zoomPixSize, 600/zoomPixSize, 0, 0, 900, 600);
        };
        
        var changeZoomPosition = function(x,y) {
            canvasUtility.fillMainArea(fullHighContext,'erase',lastZoomPosition,zoomSize);
            $scope.zoomPosition = [x,y];
            if(viewCenter){ localStorage.set('zoomPosition',$scope.zoomPosition); }
            lastZoomPosition = [x,y];
            drawZoomCanvas();
            if(viewCenter){ canvasUtility.fillMainArea(fullHighContext,'rgba(255, 255, 255, 0.06)',
                [x,y],zoomSize); } // Draw new zoom rect
            $timeout(function(){});
        };
        // Middle mouse panning on zoomed view
        var startDragPanning = function(e) {
            dragPanning = true;
            panOrigin = [$scope.overPixel.x,$scope.overPixel.y];
            dimPixel();
            jQuery(zoomHighCanvas).unbind('mousemove').unbind('mousedown')
                .mousemove(dragPan).mouseup(stopDragPanning);
            objectInfoPanel.children('div').unbind('mousemove').unbind('mousedown')
                .mousemove(dragPan).mouseup(stopDragPanning);
        };
        var dragPan = function(e) {
            if(!dragPanning || e.which == 0) { stopDragPanning(); return false; }
            var offset = jQuery(zoomHighCanvas).offset(); // Get pixel location
            var x = Math.floor($scope.zoomPosition[0] + (e.pageX - offset.left) / zoomPixSize),
                y = Math.floor($scope.zoomPosition[1] + (e.pageY - offset.top) / zoomPixSize);
            var panOffset = [x - panOrigin[0], y - panOrigin[1]];
            if(panOffset[0] == 0 && panOffset[1] == 0) { return false; }
            var newPosition = [$scope.zoomPosition[0]-panOffset[0],$scope.zoomPosition[1]-panOffset[1]];
            newPosition[0] = Math.min(Math.max(newPosition[0],0),300 - zoomSize[0]);
            newPosition[1] = Math.min(Math.max(newPosition[1],0),300 - zoomSize[1]);
            viewCenter = [newPosition[0]+zoomSize[0]/2,newPosition[1]+zoomSize[1]/2];
            changeZoomPosition(newPosition[0],newPosition[1]);
            dimPixel();
            return false;
        };
        var stopDragPanning = function() {
            dragPanning = false;
            jQuery(zoomHighCanvas).unbind('mousemove').unbind('mousedown').unbind('mouseup')
                .mousemove(zoomOnMouseMove);
            objectInfoPanel.children('div').unbind('mousemove').unbind('mousedown').unbind('mouseup')
                .mousemove(zoomOnMouseMove);
            jQuery(zoomHighCanvas).mousedown(zoomOnMouseDown);
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
            if(panMouseDown || 
                !(e.target.id == 'zoomHighCanvas' || e.target.id == 'controls' || e.target.id == 'objectInfo')) {
                return false; }
            if(e.which == 2 || e.which == 3) { startDragPanning(e); return false; } // Pan
            var x = $scope.overPixel.x, y = $scope.overPixel.y;
            // Make stuff happen when user clicks on map
            if(localObjects.hasOwnProperty(x+':'+y)) { selectGrid(e); return false; } // If selecting an object
            // If an object is selected, but is not clicked, clear the selected object
            if($scope.selectedGrid && $scope.selectedGrid[0]) { if($scope.selectedGrid[0].grid != x + ':' + y) { 
                $timeout(function() { 
                    $scope.selectedGrid = null; dimPixel(); 
                    delete $scope.overPixel.objects; delete $scope.selectedGrid; delete $scope.selectedObject;
                }); return false; }}
            return false;
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
                dimPixel(); // Dim the previous pixel
                $scope.overPixel.x = (x+$scope.zoomPosition[0]); 
                $scope.overPixel.y = (y+$scope.zoomPosition[1]);
                var grid = $scope.overPixel.x+':'+$scope.overPixel.y;
                $scope.overPixel.objects = localObjects[grid];
                if(jQuery.inArray(grid,campList) >= 0 && $scope.mapElements.objects) { // If there is a camp here
                    Math.seedrandom(grid); var text = 'Camp ' + 
                        gameUtility.capitalize(Chance($scope.overPixel.x*1000 + $scope.overPixel.y).word());
                    canvasUtility.drawLabel(zoomHighContext,[$scope.overPixel.x-$scope.zoomPosition[0],
                        $scope.overPixel.y-$scope.zoomPosition[1]],text,zoomPixSize);
                }
                $scope.overPixel.type = localTerrain[grid] ? 'land' : 'water';
                $scope.overPixel.elevation = localTerrain[grid] ? localTerrain[grid] : 0;
                var coords = [$scope.overPixel.x-$scope.zoomPosition[0], $scope.overPixel.y-$scope.zoomPosition[1]];
                var cursorType = $scope.editTerrain ? 'terrain' + $scope.brushSize : 'cursor';
                canvasUtility.drawSelect(zoomHighContext,coords,zoomPixSize,cursorType);
                $timeout(function() {});
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

        jQuery(zoomHighCanvas).mousedown(zoomOnMouseDown).mousemove(zoomOnMouseMove)
            .mouseleave(zoomOnMouseOut).mousewheel(zoomScroll);
        jQuery(fullHighCanvas).mousewheel(zoomScroll).mousemove(panOnMouseMove)
            .mousedown(panOnMouseDown).mouseup(onMouseUp);
    
        // Draw an object, whether adding, changing, or removing
        var drawObject = function(coords,value) {
            if(!$scope.mapElements.objects) { return; }
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
            if(!$scope.mapElements.labels) { return; }
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
                if(descending) { arr.sort(function(obj1, obj2) { return obj2[sortby] - obj1[sortby]}); } else {
                    arr.sort(function(obj1, obj2) { return obj1[sortby] - obj2[sortby]}); }
            } return arr;
        };
        
        var changeHunger = function(hungryUserID,amount) {
            var user = localUsers[hungryUserID];
            user.stats.hunger -= amount;
            var neededHunger = 100 - user.stats.hunger;
            if(user.hasOwnProperty('autoEat')) {
                var result = gameUtility.autoEat(user,neededHunger);
                for(var nKey in result.newInv) { // Set new item quantities, delete item if 0
                    if(result.newInv.hasOwnProperty(nKey)) {
                        if(result.newInv[nKey] > 0) {
                            fireRef.child('users/'+hungryUserID+'/inventory/'+nKey).set(result.newInv[nKey]);
                        } else { fireRef.child('users/'+hungryUserID+'/inventory/'+nKey).remove(); }
                    }
                }
            }
            fireRef.child('users/'+hungryUserID+'/stats/hunger').set(100 - result.newNeeded);
        };
        // Download the map terrain data from firebase
        var downloadTerrain = function() {
            jQuery.ajax({
                url: 'data/terrain.json', dataType: 'json'
            }).done(function(results) {
                console.log('new terrain downloaded');
                localTerrain = results; // Download the whole terrain object at once into localTerrain
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
                        prepareTerrain();
                    }
                });
            } else { downloadTerrain(); }
       };
        var prepareTerrain = function() {
            $scope.terrainReady = true;
            gameUtility.attachTerrain(localTerrain);
            fireRef.child('campList').once('value',function(snap) {
                if(!snap.val() && userID < 3) { // Generate camps if none on firebase
                    var nativeLocations = gameUtility.genNativeCamps();
                    fireRef.child('camps').set(nativeLocations); return;
                } 
                campList = snap.val();
                for(var i = 0; i < campList.length; i++) { // Generate camp details from locations
                    Math.seedrandom(campList[i]);
                    var x = parseInt(campList[i].split(':')[0]), y = parseInt(campList[i].split(':')[1]);
                    var camp = { type: 'camp', name: Chance(x*1000 + y).word(), grid: campList[i] };
                    if(localObjects.hasOwnProperty(campList[i])) { localObjects[campList[i]].push(camp); } 
                    else { localObjects[campList[i]] = [camp]; }
                }
                changeZoomPosition($scope.zoomPosition[0],$scope.zoomPosition[1]);
            });
            canvasUtility.drawAllTerrain(fullTerrainContext,localTerrain,false);
            console.log('Server ready!');
            var updateUsers = function(snap) {
                for(var key in snap.val()) {
                    if(!snap.val().hasOwnProperty(key)) { continue; }
                    if(!localUsers.hasOwnProperty(key)) { continue; }
                    if(localUsers[key].hasOwnProperty('connections') &&
                        !snap.val()[key].hasOwnProperty('connections')) {
                        if(key != 1) { console.log(localUsers[key].nick,'disconnected at',
                            new Date(snap.val()[key].lastOnline)); }
                        fireRef.child('scoreBoard/'+key+'/online').remove();
                    }
                }
                localUsers = snap.val();
            };
            fireRef.child('users').on('value', updateUsers);
            fireServer.on('child_added', function(snap) { // When a client action is received
                if(snap.val().user != 1 || snap.val().action != 'logIn') {
                    console.log(localUsers[snap.val().user].nick,'did',snap.val().action,'at',new Date()); }
                var action = snap.val().action.split(',');
                switch(action[0]) {
                    case 'createCamp':
                        var startGrid = gameUtility.createUserCamp(localObjects);
                        fireRef.child('users/'+snap.val().user).update({
                            camp: { grid: startGrid, color: colorUtility.generate('camp').hex },
                            movement: {location: startGrid}, money: 200, stats: { hunger: 100 },
                            equipment: { 'small dagger': 100 }
                        });
                        fireRef.child('scoreBoard/'+snap.val().user+'/score').set(0);
                        fireRef.child('scoreBoard/'+snap.val().user+'/nick').set(
                            localUsers[snap.val().user].nick);
                        break;
                    case 'move':
                        var movePath = snap.val().path, baseMoveSpeed = 5000; // 5 seconds
                        fireRef.child('users/'+snap.val().user+'/movement/movePath').set(movePath);
                        var move = function() {
                            fireRef.child('users/'+snap.val().user+'/movement').update(
                                { location: movePath.splice(0,1)[0], movePath: movePath });
                            if(movePath.length < 1 || !localTerrain.hasOwnProperty(movePath[0])) {
                                clearTimeout(moveTimers[snap.val().user]);
                                fireRef.child('users/'+snap.val().user+'/movePath').remove();
                            } else {
                                moveTimers[snap.val().user] = setTimeout(move,
                                    baseMoveSpeed * (1 + localTerrain[movePath[0]] / 60));
                            }
                            changeHunger(snap.val().user,5); // Use 5 hunger
                        };
                        moveTimers[snap.val().user] = setTimeout(move,
                            baseMoveSpeed * (1 + localTerrain[movePath[0]] / 60));
                        break;
                    case 'stop': 
                        clearTimeout(moveTimers[snap.val().user]); 
                        fireRef.child('users/'+snap.val().user+'/movement/movePath').remove();
                        break;
                    case 'logIn': fireRef.child('scoreBoard/'+snap.val().user+'/online').set(true); break;
                    default: break;
                }
                fireServer.child(snap.name()).remove(); // Delete the action
            });
            fireRef.child('status').set('online');
            var loginEmail = localStorage.get('serverLoginEmail');
            var loginPassword = localStorage.get('serverLoginPassword');
            setInterval(function() {
                fireRef.child('status').set('online');
                fireRef.child('serverTest').set('test');
                fireRef.child('serverTest').remove();
                auth.login('password', {email: loginEmail, password: loginPassword, rememberMe: true});
            }, 3600000); // Re-authenticate every hour
            fireRef.child('status').onDisconnect().set('offline');
            
            var passTime = function() {
                fireRef.child('camps').once('value',function(snap) { if(!snap.val()) { return; }
                    var theTime = new Date().getTime(); var message = '';
                    var camps = snap.val(), newCamps = angular.copy(camps);
                    for(var camp in camps) { if(!camps.hasOwnProperty(camp)) { continue; }
                        var deltas = camps[camp].deltas; if(!deltas) { continue; }
                        var campInfo = gameUtility.expandCamp(camp);
                        for(var resource in deltas) { if(!deltas.hasOwnProperty(resource)) { continue; }
                            var demand = campInfo.economy.resources[resource].demand;
                            var abundance = gameUtility.resourceList[resource].abundance;
                            // Understocked: % demand of 4hr + ( 50-abundance ) * 2min
                            // Overstocked: 1hr - % demand of 30min - ( abundance * 1min )
                            var interval = camps[camp].deltas[resource].amount < 0 ? 
                                demand/100 * 14400000 + (50-abundance) * 80000
                                : 3600000 - demand/100 * 1800000 - abundance * 60000;
                            var multiplier = interval < 0 ? Math.ceil(interval / -120000) : 1;
                            interval = Math.max(1,interval);
                            if(theTime < camps[camp].deltas[resource].time + interval) { continue; }
                            var difference = theTime - (parseInt(camps[camp].deltas[resource].time) + interval);
                            multiplier += multiplier * Math.floor(difference / interval);
                            difference -= interval * Math.floor(difference / interval);
                            message += camps[camp].deltas[resource].amount < 0 ?
                                camp + '-' + resource + ' replenished by ' + multiplier + ' | ' :
                                camp + '-' + resource + ' depleted by ' + multiplier + ' | ' ;
                            newCamps[camp].deltas[resource].amount = camps[camp].deltas[resource].amount < 0 ? 
                                Math.min(camps[camp].deltas[resource].amount + multiplier,0) : 
                                Math.max(camps[camp].deltas[resource].amount - multiplier,0);
                            newCamps[camp].deltas[resource].time = theTime - difference;
                            newCamps[camp].deltas[resource] = newCamps[camp].deltas[resource].amount == 0 ?
                                null : newCamps[camp].deltas[resource];
                        }
                    }
                    if(message.length > 0) { console.log(new Date(),message); }
                    fireRef.child('camps').set(newCamps);
                });
                fireRef.child('abundances').once('value',function(snap) { if(!snap.val()) { return; }
                    var theTime = new Date().getTime(); var message = '';
                    var snapAbundances = snap.val(), newAbundances = angular.copy(snapAbundances);
                    for(var grid in snapAbundances) { if(!snapAbundances.hasOwnProperty(grid)) { continue; }
                        for(var actKey in snapAbundances[grid]) { 
                            if(!snapAbundances[grid].hasOwnProperty(actKey)) { continue; }
                            var interval = 3600000; // 1 hour
                            if(theTime < parseInt(snapAbundances[grid][actKey].time) + interval) { continue; }
                            var difference = theTime - (parseInt(snapAbundances[grid][actKey].time) + interval);
                            var multiplier = 1 + Math.floor(difference / interval);
                            difference -= interval * Math.floor(difference / interval);
                            message += grid + '-' + actKey + ' replenished by ' + multiplier + ' | ';
                            newAbundances[grid][actKey].time += interval + difference;
                            newAbundances[grid][actKey].amount += multiplier;
                            newAbundances[grid][actKey] = newAbundances[grid][actKey].amount >= 0 ?
                                null : newAbundances[grid][actKey];
                        }
                    }
                    if(message.length > 0) { console.log(new Date(),message); }
                    fireRef.child('abundances').set(newAbundances);
                });
            };
            setInterval(passTime,300000); passTime();
            canvasUtility.fillCanvas(fullFogContext,'erase');
            zoomFogCanvas.style.visibility="hidden";
        };
        
        fireRef.child('labels').once('value',function(snap) {
            localLabels = snap.val();
            fireRef.child('labels').on('child_added', addLabel);
            fireRef.child('labels').on('child_removed', removeLabel);
        });
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
}])
;