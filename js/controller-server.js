angular.module('Geographr.controllerServer', [])
.controller('Server', ['$scope', '$timeout', 'localStorageService', 'colorUtility', 'canvasUtility', 'gameUtility', function($scope,$timeout,localStorage,colorUtility,canvasUtility,gameUtility) {
        $scope.zoomLevel = 6; $scope.zoomPosition = [0,0]; // Tracking zoom window position
        $scope.overPixel = { x: '-', y: '-', slope: '-', elevation: '-', type: '-' }; // Mouse over info
        $scope.authStatus = ''; $scope.helpText = ''; $scope.login = { email: '', password: '' };
        $scope.lastTerrainUpdate = 0; $scope.terrainReady = false;
        $scope.mapElements = { labels: true, objects: true };
        gameUtility.attachScope($scope);
        var mainPixSize = 1, zoomPixSize = 20, zoomSize = [45,30], lastZoomPosition = [0,0], 
            viewCenter, panOrigin, panMouseDown = false,  dragPanning = false,
            userID, fireUser, localTerrain = {}, terrainFeatures = {}, localObjects = {}, localLabels = {},
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
                    console.log(error, $scope.login.email, $scope.login.password);
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
        var fullPingCanvas = document.getElementById('fullPingCanvas');
        var fullHighCanvas = document.getElementById('fullHighCanvas');
        var zoomTerrainCanvas = document.getElementById('zoomTerrainCanvas'); // Main view
        var zoomObjectCanvas = document.getElementById('zoomObjectCanvas');
        var zoomHighCanvas = document.getElementById('zoomHighCanvas');
        var fullTerrainContext = fullTerrainCanvas.getContext ? fullTerrainCanvas.getContext('2d') : null;
        var fullObjectContext = fullObjectCanvas.getContext ? fullObjectCanvas.getContext('2d') : null;
        var fullPingContext = fullPingCanvas.getContext ? fullPingCanvas.getContext('2d') : null;
        var fullHighContext = fullHighCanvas.getContext ? fullHighCanvas.getContext('2d') : null;
        var zoomTerrainContext = zoomTerrainCanvas.getContext ? zoomTerrainCanvas.getContext('2d') : null;
        var zoomObjectContext = zoomObjectCanvas.getContext ? zoomObjectCanvas.getContext('2d') : null;
        var zoomHighContext = zoomHighCanvas.getContext ? zoomHighCanvas.getContext('2d') : null;

        // Disable interpolation on zoom canvases
        zoomTerrainContext.mozImageSmoothingEnabled = false;
        zoomTerrainContext.webkitImageSmoothingEnabled = false;
        zoomTerrainContext.msImageSmoothingEnabled = false;
        zoomTerrainContext.imageSmoothingEnabled = false;

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
                    var grid = $scope.overPixel.x + ':' + $scope.overPixel.y;
                    $scope.selectedGrid = localObjects[$scope.overPixel.x + ':' + $scope.overPixel.y];
                    $scope.selectedGrid.grid = grid;
                    $scope.overPixel.objects = $scope.selectedGrid;
                    if($scope.selectedGrid.camp && jQuery.inArray(grid,$scope.user.visitedCamps) >= 0 ) {
                        $scope.selectedGrid.camp = gameUtility.expandCamp(grid);
                        $scope.selectedGrid.camp.type = 'camp';
                        $scope.selectedGrid.camp.visited = true;
                    }
                } else { $scope.selectedGrid = null; }
                objectInfoPanel.show(); objectInfoPanel.css('visibility', 'hidden'); drawZoomCanvas();
            });
        };
        var drawZoomCanvas = function() {
            if(!$scope.terrainReady) { return; }
            zoomTerrainContext.drawImage(fullTerrainCanvas, $scope.zoomPosition[0]*mainPixSize, 
                $scope.zoomPosition[1]*mainPixSize, 900/zoomPixSize, 600/zoomPixSize, 0, 0, 900, 600);

//            canvasUtility.drawDepthTerrain(zoomTerrainContext,localTerrain,zoomPixSize,$scope.zoomPosition);
            
            canvasUtility.fillCanvas(zoomObjectContext,'erase');
            for(var labKey in localLabels) {
                if(localLabels.hasOwnProperty(labKey)) { drawLabel(labKey.split(":"),localLabels[labKey]); }
            }
            canvasUtility.fillCanvas(fullObjectContext,'erase');
            for(var objKey in localObjects) {
                if(localObjects.hasOwnProperty(objKey)) { drawObject(objKey.split(":"),localObjects[objKey]); }
            }
            $timeout(function(){
                objectInfoPanel.css('visibility', 'visible');
                if($scope.selectedObject) { // Show/hide object info panel
                    var top = ($scope.selectedObject.grid.split(':')[1] - $scope.zoomPosition[1])
                        * zoomPixSize + zoomPixSize;
                    var left = ($scope.selectedObject.grid.split(':')[0] - $scope.zoomPosition[0])
                        * zoomPixSize + zoomPixSize;
                    if(top < 0 || left < 0 || left >= 900 || top >= 600) { objectInfoPanel.hide(); } else {
                        if(top + objectInfoPanel.children('div').outerHeight() >= 600) {
                            objectInfoPanel.offset({ top: jQuery(zoomHighCanvas).offset().top + top
                                - objectInfoPanel.children('div').outerHeight() - zoomPixSize });
                        } else {
                            objectInfoPanel.offset({ top: jQuery(zoomHighCanvas).offset().top + top });
                        }
                        if(left + objectInfoPanel.children('div').outerWidth() >= 900) {
                            objectInfoPanel.offset({ left: jQuery(zoomHighCanvas).offset().left + left
                                - objectInfoPanel.children('div').outerWidth() - zoomPixSize });
                        } else {
                            objectInfoPanel.offset({ left: jQuery(zoomHighCanvas).offset().left + left });
                        }
                    }
                }
            },1);
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
            if($scope.selectedGrid) { if($scope.selectedGrid.grid != x + ':' + y) {
                $timeout(function() {
                    $scope.selectedGrid = null; dimPixel();
                    delete $scope.overPixel.objects; delete $scope.selectedGrid;
                }); return false; }} else { selectGrid(e); }
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
                $scope.overPixel.slope = localTerrain[grid] ? Math.round(gameUtility.getSlope(grid)/2) : '-';
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
            if($scope.selectedGrid && $scope.selectedGrid.grid) { // Draw selection box around selected cell
                var coords = $scope.selectedGrid.grid.split(':');
                coords = [coords[0]-$scope.zoomPosition[0],coords[1]-$scope.zoomPosition[1]];
                canvasUtility.drawSelect(zoomHighContext,coords,zoomPixSize,'object');
            }
        };
        // When the mouse leaves the zoomed view
        var zoomOnMouseOut = function() {
            dimPixel();
            $timeout(function() { $scope.overPixel.x = $scope.overPixel.y = 
                $scope.overPixel.type = $scope.overPixel.elevation = $scope.overPixel.slope = '-' });
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
                if($scope.selectedGrid.grid == coords.join(':')) { 
                    delete $scope.selectedGrid; delete $scope.selectedObject; }
                canvasUtility.fillMainArea(fullObjectContext,'erase',coords,[1,1]);
            }
            canvasUtility.drawObject(zoomObjectContext,value,coords,
                $scope.zoomPosition,zoomPixSize);
            canvasUtility.drawObject(fullObjectContext,value,coords,0,0);
//            if(value[0].type == 'camp' && 
//                coords[0] > $scope.zoomPosition[0] && coords[0] < $scope.zoomPosition[0]+900/zoomPixSize 
//                && coords[1] > $scope.zoomPosition[1] && coords[1] < $scope.zoomPosition[1]+600/zoomPixSize) {
//                value = gameUtility.expandCamp(coords.join(':'));
//                for(var e = 0; e < value.economy.ecoZone.length; e++) {
//                    var x = parseInt(value.economy.ecoZone[e].grid.split(':')[0]),
//                        y = parseInt(value.economy.ecoZone[e].grid.split(':')[1]);
//                    var size = value.economy.ecoZone[e].dist2 > 7 ? 0.4 : 0.8;
//                    var color, slope = 0;
//                    if(localTerrain[x+':'+y]) {
//                        slope += Math.abs(localTerrain[(x-1)+':'+y]-localTerrain[x+':'+y]) || 0;
//                        slope += Math.abs(localTerrain[(x+1)+':'+y]-localTerrain[x+':'+y]) || 0;
//                        slope += Math.abs(localTerrain[x+':'+(y+1)]-localTerrain[x+':'+y]) || 0;
//                        slope += Math.abs(localTerrain[x+':'+(y-1)]-localTerrain[x+':'+y]) || 0;
//                        color = slope + localTerrain[x+':'+y]/8 > 6 && localTerrain[x+':'+y] > 6 ? 'b86700' : '09b800';
//                    } else { color = '0089b8'; }
//                    canvasUtility.drawDot(zoomObjectContext,[x - $scope.zoomPosition[0],
//                        y - $scope.zoomPosition[1]],size,color,0.5,zoomPixSize);
//                }
//            }
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
            result = { newNeeded: neededHunger };
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
            var forestTiles = gameUtility.generateForests();
            for(var ftKey in forestTiles) { if(!forestTiles.hasOwnProperty(ftKey)) { continue; }
                if(terrainFeatures.hasOwnProperty(ftKey)) { terrainFeatures[ftKey].forest = forestTiles[ftKey]; }
                else { terrainFeatures[ftKey] = {forest:forestTiles[ftKey]}; }
            }
            gameUtility.attachTerrainFeatures(terrainFeatures);
            var terrainImg = new Image;
            terrainImg.onload = function() { fullTerrainContext.drawImage(terrainImg,0,0);
                canvasUtility.drawTerrainFeatures(fullTerrainContext,terrainFeatures); };
            terrainImg.src = 'img/world-map.png';
            fireRef.child('campList').once('value',function(snap) {
//                if(!snap.val() && userID < 3) { // Generate camps if none on firebase
//                    var nativeLocations = gameUtility.genNativeCamps();
//                    fireRef.child('campList').set(nativeLocations); return;
//                } 
                campList = snap.val();
                for(var i = 0; i < campList.length; i++) { // Generate camp details from locations
                    Math.seedrandom(campList[i]);
                    var x = parseInt(campList[i].split(':')[0]), y = parseInt(campList[i].split(':')[1]);
                    var camp = { type: 'camp', name: Chance(x*1000 + y).word(), grid: campList[i] };
                    if(localObjects.hasOwnProperty(campList[i])) { localObjects[campList[i]].camp = camp; } 
                    else { localObjects[campList[i]] = {camp:camp}; }
                }
                changeZoomPosition($scope.zoomPosition[0],$scope.zoomPosition[1]);
            });
//            canvasUtility.drawAllTerrain(fullTerrainContext,localTerrain,false);
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
                        fireRef.child('scoreBoard/'+snap.val().user+'/color').set(
                            localUsers[snap.val().user].camp.color);
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
                    var theTime = new Date(), camps = snap.val(), campList = camps.list, restocking = false;
                    var message = '';
                    if(!camps.hasOwnProperty('lastMarketStock') || 
                        camps.lastMarketStock != theTime.getMonth()+'/'+theTime.getDate()) { 
                        restocking = true; message = 'markets restocked' }
                    if(!campList) { return; }
                    camps.lastMarketStock = 
                        restocking ? theTime.getMonth()+'/'+theTime.getDate() : camps.lastMarketStock;
                    for(var campKey in campList) { if(!campList.hasOwnProperty(campKey)) { continue; }
                        var camp = campList[campKey];
                        if(camp.hasOwnProperty('stock') && restocking) { delete camp.stock; }
                        if(camp.hasOwnProperty('refining')) {
                            for(var refineryKey in camp.refining) {
                                if(!camp.refining.hasOwnProperty(refineryKey)) { continue; }
                                for(var refiningKey in camp.refining[refineryKey]) {
                                    if(!camp.refining[refineryKey].hasOwnProperty(refiningKey)) { continue; }
                                    var refining = camp.refining[refineryKey][refiningKey];
                                    if(refining + 600000 < theTime.getTime()) {
                                        if(!camp.hasOwnProperty('refined')) { camp.refined = {}; }
                                        if(!camp.refined.hasOwnProperty(refineryKey)) { camp.refined[refineryKey] = {}; }
                                        var split = refiningKey.split(':-:');
                                        message += ', '+localUsers[refiningKey.split(':-:')[0]].nick +'\'s '+
                                            split[1] + ' has finished refining at camp ' + campKey +' '+ [refineryKey];
                                        var newAmount = 
                                            Math.round(parseInt(split[2]) + Math.random()/1.5 * parseInt(split[2]));
                                        var refinedKey = split[0] +':-:'+ split[1] +':-:'+ newAmount +':-:'+ split[3];
                                        camp.refined[refineryKey][refinedKey] = refining;
                                        delete camp.refining[refineryKey][refiningKey];
                                    }
                                }
                            }
                        }
                        if(camp.hasOwnProperty('userStalls')) {
                            var campInfo = gameUtility.expandCamp(campKey);
                            Math.seedrandom();
                            for(var uStall in camp.userStalls) { 
                                if(!camp.userStalls.hasOwnProperty(uStall)) { continue; }
                                for(var uGoodKey in camp.userStalls[uStall]) {
                                    if(!camp.userStalls[uStall].hasOwnProperty(uGoodKey)) { continue; }
                                    var uGood = gameUtility.dressItem({type: uGoodKey.split(':')[0],
                                        name: uGoodKey.split(':')[1], status: uGoodKey.split(':')[2]});
                                    uGood.amount = camp.userStalls[uStall][uGoodKey].amount;
                                    uGood.value = camp.userStalls[uStall][uGoodKey].value;
                                    var expectedPrice;
                                    if(campInfo.economy.market.allGoods[uGoodKey]) {
                                        var stallGood = campInfo.economy.market.allGoods[uGoodKey];
                                        expectedPrice = stallGood.averagePrice;
                                    } else {
                                        var distance = uGood.nativeY ? Math.max(0,
                                            (Math.abs(campKey.split(':')[1] - uGood.nativeY)) - uGood.range) : 0;
                                        var exotic = 1 + distance/(uGood.range/2) || 1;
                                        expectedPrice = uGood.value * exotic * 1.6;
                                    }
                                    if((expectedPrice / uGood.value)/2 > Math.random()*2+0.3) {
                                        var buyAmount = Math.min(uGood.amount,
                                            gameUtility.randomIntRange(1,Math.ceil(expectedPrice/uGood.value)));
                                        message += ', ' + 'buying'+' '+buyAmount+' '+uGood.name+' - max buy:'+
                                            ' '+expectedPrice/uGood.value;
                                        (function(ba,ug) { // Enclosure to avoid async reference problem
                                            fireRef.child('users/'+uStall.substring(2,uStall.length)+'/money')
                                                .transaction(function(money) {
                                                    return money + ba * ug.value || ba * ug.value; });
                                        })(buyAmount,uGood);
                                        camp.userStalls[uStall][uGoodKey].amount -= buyAmount;
                                        if(camp.userStalls[uStall][uGoodKey].amount < 1) {
                                            delete camp.userStalls[uStall][uGoodKey]; }
                                    }
                                }
                            }
                        }
                    }
                    if(message.length > 0) { console.log(theTime,message); }
                    fireRef.child('camps').set(camps);
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
            setInterval(passTime,300000); passTime(); // Every 5 min
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