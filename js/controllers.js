/* Controllers */

angular.module('Geographr.controllers', [])
.controller('Main', ['$scope', '$timeout', '$filter', 'localStorageService', 'colorUtility', 'canvasUtility', 'actCanvasUtility', 'gameUtility', function($scope, $timeout, $filter, localStorage, colorUtility, canvasUtility, actCanvasUtility, gameUtility) {
        $scope.version = 0.221; $scope.versionName = 'Shared Sock'; $scope.needUpdate = false;
        $scope.commits = []; // Latest commits from github api
        $scope.zoomLevel = 4; $scope.zoomPosition = [120,120]; // Tracking zoom window position
        $scope.overPixel = {}; $scope.overPixel.x = '-'; $scope.overPixel.y = '-'; // Tracking your coordinates
        $scope.overPixel.type = $scope.overPixel.elevation = '-'; $scope.onPixel = {};
        $scope.authStatus = ''; $scope.helpText = ''; $scope.lastTerrainUpdate = 0; $scope.terrainReady = false;
        $scope.placingObject = {};
        $scope.showLabels = true; $scope.showObjects = true;
        $scope.editTerrain = false; $scope.smoothTerrain = false;
        $scope.brushSize = 0; $scope.lockElevation = false; $scope.lockedElevation = 1;
        $scope.eventLog = [];
        $scope.movePath = []; $scope.lookCount = 0;
        $scope.tutorialSkips = []; $scope.skipTutorial = false;
        var mainPixSize = 1, zoomPixSize = 20, zoomSize = [45,30], lastZoomPosition = [0,0], viewCenter, panOrigin,
            keyPressed = false, keyUpped = true, panMouseDown = false,  dragPanning = false,
            pinging = false, userID, fireUser, localTerrain = {}, updatedTerrain = {}, localObjects = {}, 
            localLabels = {}, addingLabel = false, zoomLevels = [4,6,10,12,20,30,60], fireInventory, 
            tutorialStep = 0, visiblePixels = {}, moveTimers = {}, waitTimer, campList = [], 
            availableActivities = [], localUsers = {};
    
        // Create a reference to the pixel data for our canvas
        var fireRef = new Firebase('https://geographr.firebaseio.com/map1');
        var fireServer = fireRef.child('clients/actions');
        var auth; // Create a reference to the auth service for our data
        fireRef.parent().child('version').once('value', function(snap) { // Check version number
            if($scope.version >= snap.val()) {
                fireRef.parent().child('version').on('value',function(snap) {
                    if($scope.version >= snap.val()) { return; }
                    $timeout(function() {
                        $scope.needUpdate = true; $scope.authStatus = ''; $scope.userInit = false;
                        $scope.user = $scope.onPixel = null;
                        jQuery(zoomHighCanvas)
                            .unbind('mousemove').unbind('mousedown').unbind('mouseup').unbind('mousewheel');
                        jQuery(fullHighCanvas).unbind('mousedown').unbind('mouseup').unbind('mousewheel');
                    });
                });
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
                                            $scope.user = {id: createdUser.id, email: createdUser.email,
                                                nick: gameUtility.capitalize(createdUser.email.substr(0,
                                                    createdUser.email.indexOf('@'))), new: true };
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
                    fireRef.child('scoreBoard').on('value', updateScoreBoard);
                    if($scope.user.new) { tutorialStep = -1; tutorial('next'); }
                    initTerrain();
                    fireUser.child('money').on('value',
                        function(snap) { $timeout(function() {$scope.user.money = snap.val();}); });
                    fireInventory = fireUser.child('inventory');
                    fireInventory.on('child_added', updateInventory);
                    fireInventory.on('child_changed', updateInventory);
                    fireInventory.on('child_removed', removeInventory);
                    fireUser.child('camp').on('value', function(snap) {
                        if(!snap.val()) { return; }
                        var userCamp = { type: 'userCamp', owner: userID, 
                            ownerNick: $scope.user.nick, grid: snap.val().grid, color: snap.val().color };
                        localObjects[snap.val().grid] ? localObjects[snap.val().grid].push(userCamp) :
                            localObjects[snap.val().grid] = [userCamp];
                        drawObject(snap.val().grid.split(':'),localObjects[snap.val().grid]);
                        $scope.user.camp = snap.val();
                    });
                });
            });
        };
    
        // Attempt to get these variables from localstorage
        var localStores = ['zoomPosition','zoomLevel','lastTerrainUpdate','tutorialSkips'];
        for(var i = 0; i < localStores.length; i++) {
            if(localStorage.get(localStores[i])) {
                $scope[localStores[i]] = localStorage.get(localStores[i]);
            }
        }
        if(localStorage.get('visiblePixels')) { localStorage.remove('visiblePixels'); } // Delete me
    
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
        canvasUtility.fillCanvas(fullFogContext,'2e3338');
        canvasUtility.fillCanvas(zoomFogContext,'2e3338');

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
        
        var controlsDIV = jQuery('#controls'); // Movement controls
        var progressBar = controlsDIV.children('.progress').children('.progress-bar');
    
        // Reset player
        $scope.reset = function() {
            fireUser.once('value',function(snap) {
                var cleaned = snap.val(); 
                cleaned.camp = cleaned.location = cleaned.visiblePixels = 
                    cleaned.visitedCamps = cleaned.inventory = null;
                cleaned.new = true; fireUser.set(cleaned);
            });
        };
        
        // Redraw zoom canvas
        $scope.refresh = function() { drawZoomCanvas(); };

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
        // Grab a specific item from user's inventory (find by property(s), like name or type)
        $scope.hasItem = function(checkObject) {
            for(var invKey in $scope.inventory) {
                if(!$scope.inventory.hasOwnProperty(invKey)) { continue; }
                var passed = true;
                for(var checkKey in checkObject) {
                    if(!checkObject.hasOwnProperty(checkKey)) { continue; }
                    if($scope.inventory[invKey][checkKey] != checkObject[checkKey]) { passed = false; }
                }
                if(passed) { return $scope.inventory[invKey]; }
            }
            return false;
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
        $scope.updateSkips = function() {
            $scope.tutorialSkips.push($scope.event.type);
            localStorage.set('tutorialSkips',$scope.tutorialSkips);
            $timeout(function() { $scope.inEventTutorial = false; });
            tutorialImage.unbind('mousedown');
        };
        $scope.activateObject = function(objectIndex) {
            if(!$scope.onPixel.objects || objectIndex > $scope.onPixel.objects.length - 1 
                || $scope.onPixel.objects[objectIndex].type == 'camp') { return; }
            $timeout(function() {
                $scope.event = { type: $scope.onPixel.objects[objectIndex].type }; // Get event type
                availableActivities.splice(jQuery.inArray($scope.event.type,availableActivities),1);
                $scope.onPixel.objects.splice(objectIndex,1); // Remove object
                $scope.inEvent = true;
                $scope.inEventTutorial = jQuery.inArray($scope.event.type,$scope.tutorialSkips) < 0; // Skip tut?
                var skills = $scope.user.skills ? $scope.user.skills : {};
                if($scope.inEventTutorial) {
                    tutorialImage.on('mousedown',function() {
                        $timeout(function() { $scope.inEventTutorial = false; });
                        tutorialImage.unbind('mousedown');
                        actCanvasUtility.eventHighCanvas.on('mousedown',eventOnClick);
                        gameUtility.setupActivity($scope.event.type,skills[$scope.event.type]);
                    });
                } else {
                    actCanvasUtility.eventHighCanvas.on('mousedown',eventOnClick);
                    gameUtility.setupActivity($scope.event.type,skills[$scope.event.type]);
                }
            });
        };
        $scope.takeFromEvent = function(product) {
            var taking;
            if(product == 'all') { taking = $scope.event.products; $scope.event.products = []; } 
                else { taking = [$scope.event.products[product]]; $scope.event.products.splice(product,1); }
            addToInventory(taking);
            if($scope.event.products.length == 0 && $scope.event.result.ended) {
                actCanvasUtility.eventHighCanvas.unbind('mousedown');
                $timeout(function() { $scope.inEvent = false; $scope.event = {}; });
            }
        };
        $scope.autoEat = function(food,eatThis) {
            if(eatThis) {
                if($scope.user.hasOwnProperty('autoEat')) {
                    $scope.user.autoEat.push(food);
                } else { $scope.user.autoEat = [food] }
                changeHunger(userID,0);
            } else { $scope.user.autoEat.splice(jQuery.inArray(food,$scope.user.autoEat),1); }
            if($scope.user.autoEat.length == 0) { // Send to firebase
                fireUser.child('autoEat').set(null); } else { fireUser.child('autoEat').set($scope.user.autoEat); }
        };
        $scope.movePlayer = function(dir) {
            if(dir == 'startStop') { // If starting or stopping movement
                if($scope.moving) { fireServer.push({ user: userID, action: 'stop' });
                    $scope.moving = false; dimPixel(); return; } 
                $scope.moving = true; dimPixel();
                var moveTime = 5 * (1 + localTerrain[$scope.movePath[0]] / 60);
                playWaitingBar(moveTime+0.5);
                fireServer.push({ user: userID, action: 'move', path: $scope.movePath }); return;
            }
            if(dir == 'clear') { $timeout(function(){ $scope.movePath = []; dimPixel(); }); return; }
            if(dir == 'undo') { $timeout(function(){ $scope.movePath.pop(); dimPixel(); }); return; }
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
            var lastGrid = $scope.movePath.length > 1 ? 
                $scope.movePath[$scope.movePath.length-2] : $scope.user.location; // Backtracking erases path
            if(destGrid == lastGrid) { $timeout(function(){ $scope.movePath.pop(); dimPixel(); }); return; } 
            // Don't allow pathing into known water
            if(visiblePixels.hasOwnProperty(destGrid) && !localTerrain.hasOwnProperty(destGrid)) { return; }
            $timeout(function(){ $scope.movePath.push(destGrid); dimPixel(); });
        };
        $scope.lookAround = function() { // Further examine current grid (as if re-moving to this grid)
            if($scope.cantLook) { return; } $scope.lookCount++;
            $timeout(function(){ $scope.looking = true; });
            var look = function() {
                if($scope.onPixel.camp) { // If there is a camp here
                } else { // If no camp, create some events/activities
                    var looks = $scope.lookCount;
                    createActivity(0.25*((looks=looks/6-1)*looks*looks + 1) + 0.75);
                }
                $timeout(function(){ 
                    $scope.looking = false;
                    if($scope.lookCount >= 6) { $scope.cantLook = true; }
                });
            };
            setTimeout(look,2000); // Look around for 2 seconds
            changeHunger(userID,1); // Use 1 hunger
            playWaitingBar(2);
        };
        $scope.changeBrush = function(val) {
            $timeout(function(){ 
                $scope.brushSize = val;
                $scope.lockElevation = $scope.lockElevation || val > 0; // Lock elevation if brush size bigger than 1
            });
        };
        $scope.addLabel = function() { addingLabel = true; };
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
        
        $scope.buyResource = function(resource,amount) {
            if(amount < 1 || amount > $scope.onPixel.camp.economy.resources[resource].supply) { return; }
            if(Math.round($scope.user.money - amount * $scope.onPixel.camp.economy.resources[resource].value) < 0) {
                return; }
            console.log('buying',amount,resource,'at',
                $scope.onPixel.camp.economy.resources[resource].value,'gold per unit');
            var invItem = { type: 'resource', name: resource, amount: parseInt(amount) }; addToInventory(invItem);
            var newDelta = $scope.onPixel.camp.deltas[resource] - amount;
            newDelta = newDelta == 0 ? null : newDelta; // Don't save 0 deltas on firebase
            fireRef.child('camps/'+$scope.onPixel.camp.grid+'/deltas/'+resource).set(newDelta); // Update delta
            $scope.user.money =
                Math.round($scope.user.money - amount * $scope.onPixel.camp.economy.resources[resource].value);
            fireUser.child('money').set($scope.user.money);
        };
        $scope.sellResource = function(resource,amount,haveAmount,value,fireID) {
            if(amount < 1 || amount > haveAmount) { return; }
            console.log('selling',amount,'at',value * 0.8,'gold per unit');
            if(haveAmount - amount > 0) { $scope.inventory[fireID].amount = haveAmount - amount;
                fireInventory.child(fireID+'/amount').set(haveAmount - amount);
            } else { fireInventory.child(fireID).set(null); delete $scope.inventory[fireID]; }
            var newDelta = $scope.onPixel.camp.deltas[resource] + amount;
            newDelta = newDelta == 0 ? null : newDelta; // Don't save 0 deltas on firebase
            fireRef.child('camps/'+$scope.onPixel.camp.grid+'/deltas/'+resource).set(newDelta); // Update delta
            $scope.user.money = Math.round($scope.user.money + amount * value * 0.8); 
            fireUser.child('money').set($scope.user.money);
        };
        $scope.refineItem = function(item,amount,haveAmount,cost,fireID) {
            if(amount < 1 || amount > haveAmount) { return; }
            if(Math.round($scope.user.money - amount * cost * 1.5) < 0) { return; }
            console.log('refining',amount,item,'at',cost * 1.5,'gold per unit');
            if(haveAmount - amount > 0) {
                fireInventory.child(fireID+'/amount').set(haveAmount - amount);
                $scope.inventory[fireID].amount = haveAmount - amount;
            } else { fireInventory.child(fireID).set(null); delete $scope.inventory[fireID]; }
            $scope.user.money = Math.round($scope.user.money - amount * cost * 1.5);
            fireUser.child('money').set($scope.user.money);
            Math.seedrandom();
            var getAmount = parseInt(amount) + Math.round(amount * (Math.random() / 1.5));
            if(getAmount > amount) { console.log('got',getAmount-amount,'bonus',item,'!!'); }
            var invItem = { type: 'resource', name: item, amount: getAmount }; addToInventory(invItem);
        };
        var createActivity = function(chance) {
            Math.seedrandom(); // True random
            var activities = gameUtility.getActivityChances(localTerrain,$scope.user.location,campList);
            for(var actKey in activities) {
                if(activities.hasOwnProperty(actKey)) {
                    if(Math.random() > 1-chance*activities[actKey] 
                        && jQuery.inArray(actKey,availableActivities) < 0) { // No duplicate activities
                        console.log('creating', actKey, 'activity');
                        var activity = { type: actKey, activity: true };
                        if($scope.onPixel.objects) { 
                            $scope.onPixel.objects.push(activity); availableActivities.push(actKey);
                        } else { $scope.onPixel.objects = [activity]; availableActivities = [actKey]; }
                    }
                }
            }
        };
        // Clicking in event canvas
        var eventOnClick = function(e) {
            if(e.which == 2 || e.which == 3) { e.preventDefault(); return; } // If right/middle click pressed
            var offset = actCanvasUtility.eventHighCanvas.offset(); // Get pixel location
            var click = { x: Math.floor(e.pageX - offset.left), y: Math.floor(e.pageY - offset.top) };
            var skills = $scope.user.skills ? $scope.user.skills : {};
            $scope.event.result = gameUtility.playActivity($scope.event.type,click,skills[$scope.event.type]);
            $timeout(function() {
                if($scope.event.result.success) {
                    $scope.user.skills = $scope.user.skills ? $scope.user.skills : {};
                    if($scope.user.skills.hasOwnProperty($scope.event.type)) {
                        $scope.user.skills[$scope.event.type] += 1;
                    } else { $scope.user.skills[$scope.event.type] = 1; }
                    fireUser.child('skills').set($scope.user.skills);
                } 
                if($scope.event.result.ended) { // Event finished
                    changeHunger(userID,2); // Use 2 hunger
                    setTimeout(function() {
                        $timeout(function() { $scope.inEvent = false; $scope.event.message = null; });
                    }, 2500);
                    actCanvasUtility.eventHighCanvas.unbind('mousedown');
                }
                $scope.event.message = $scope.event.result.message;
                $scope.event.products = $scope.event.products ? 
                    $scope.event.products.concat($scope.event.result.products) : $scope.event.result.products;
            });
        };
        // Animate progress bar above move controls for x seconds
        var playWaitingBar = function(seconds) {
            clearInterval(waitTimer);
            var increments = 1;
            progressBar.css({'-webkit-transition': 'width 0s', 'transition': 'width 0s' });
            $timeout(function() {
                $scope.waitProgress = 0;
                $timeout(function() {
                    progressBar.css({'-webkit-transition': 'width 0.5s linear', 'transition': 'width 0.5s linear' });
                    $scope.waitProgress = Math.floor((increments/2 / seconds) * 100);
                },100);
            });
            waitTimer = setInterval(function() {
                increments++;
                $timeout(function() { 
                    $scope.waitProgress = Math.floor((increments/2 / seconds) * 100);
                    $scope.waitProgress = Math.min($scope.waitProgress,100);
                    if(increments/2 > seconds) { clearInterval(waitTimer); }
                });
            },500)
        };

        var checkEdibles = function() { // Does the user have anything to auto-eat?
            $timeout(function(){
                if(!$scope.inventory) {  $scope.noEdibles = true; return; }
                $scope.noEdibles = true;
                for(var key in $scope.inventory) {
                    if(!$scope.inventory.hasOwnProperty(key)) { continue; }
                    if(gameUtility.edibles.hasOwnProperty($scope.inventory[key].name) &&
                        !gameUtility.edibles[$scope.inventory[key].name].hasOwnProperty('effects')) {
                        changeHunger(userID,0); $scope.noEdibles = false; return;
                    }
                }
            });
        };
        var cleanInventory = function(inventory) { // Clean un-needed properties before storing on firebase
            var inventoryCopy = angular.copy(inventory);
            for(var invKey in inventoryCopy) {
                if(!inventoryCopy.hasOwnProperty(invKey)) { continue; }
                var item = inventoryCopy[invKey];
                delete item.color; delete item.materials; delete item.rarity; delete item.weight; delete item.fireID;
                delete item.avgQty; delete item.value; delete item.effects; delete item.unit; delete item.abundance;
                delete item.profession; delete item.lastOfType; delete item.autoEat;
            }
            return inventoryCopy;
        };
        var dressItem = function(item) { // Dress item with properties not stored on firebase
            var parent;
            switch(item.type) {
                case 'resource': parent = gameUtility.resourceList[item.name]; break;
                case 'plant': parent = gameUtility.eventProducts.forage[item.name]; break;
                case 'animal': parent = gameUtility.eventProducts.hunt[item.name]; break;
                case 'mineral': parent = gameUtility.eventProducts.mine[item.name]; break;
                default: parent = item; break;
            }
            item.color = parent.color; item.value = parent.value; item.weight = parent.weight;
            item.unit = parent.unit; item.materials = parent.materials; item.profession = parent.profession;
            return item;
        };
        // Add item or array of items to inventory, stacking if possible, and send to firebase
        var addToInventory = function(invItems) {
            if(Object.prototype.toString.call(invItems) !== '[object Array]') { invItems = [invItems] }
            for(var i = 0; i < invItems.length; i++) {
                var invItem = invItems[i];
                var fireID = fireInventory.push().name();
                if($scope.hasOwnProperty('inventory')) {
                    for(var key in $scope.inventory) {
                        if($scope.inventory.hasOwnProperty(key) &&
                            $scope.inventory[key].name == invItem.name &&
                            $scope.inventory[key].type == invItem.type) {
                            $scope.inventory[key].amount += invItem.amount; invItem.amount = 0;
                        }
                    }
                    if(invItem.amount > 0) { $scope.inventory[fireID] = invItem; }
                } else { $scope.inventory = {}; $scope.inventory[fireID] = invItem; }
            }
            fireInventory.set(angular.copy(cleanInventory($scope.inventory)));
        };
        
        var updateInventory = function(snapshot) {
            var itemAdded = snapshot.val();
            itemAdded.fireID = snapshot.name();
            $timeout(function(){
                itemAdded = dressItem(itemAdded);
                if($scope.user.hasOwnProperty('autoEat') &&
                    jQuery.inArray(itemAdded.name,$scope.user.autoEat) >= 0) { itemAdded.autoEat = true; }
                if(!$scope.inventory) { $scope.inventory = {}; }
                $scope.inventory[snapshot.name()] = itemAdded;
                checkEdibles();
            });
        };

        var removeInventory = function(snapshot) {
            $timeout(function(){
                delete $scope.inventory[snapshot.name()];
                var items = 0; // Check how many items are in the inventory
                for(var key in $scope.inventory) { if($scope.inventory.hasOwnProperty(key)) { items++; break; } }
                if(items == 0) { $scope.inventory = null; }
                checkEdibles();
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
                    if($scope.selectedGrid.length == 1) {
                        $scope.selectedObject = $scope.selectedGrid[0];
                        var grid = $scope.selectedObject.grid;
                        if($scope.selectedObject.type == 'camp' && 
                            jQuery.inArray(grid,$scope.user.visitedCamps) >= 0 ) {
                            $scope.selectedObject = gameUtility.expandCamp(grid,localTerrain);
                            $scope.selectedObject.visited = true;
                        }
                    }
                } else { $scope.selectedGrid = null; }
                dimPixel(); // Will draw select box
            });
        };
        // Placing an object on the map
        var placeObject = function(event) {
            if($scope.authStatus != 'logged') { return; } // If not authed
            if(event.which == 3) { $scope.cancelAddObject(); event.preventDefault(); return; } // If right click
            if(event.which == 2) { startDragPanning(event); return; } // If middle click
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
                if(localLabels.hasOwnProperty(labKey) && visiblePixels.hasOwnProperty(labKey)) {
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
            if(!$scope.user || userID == 2) { return; }
            canvasUtility.drawPlayer(fullObjectContext,$scope.user.location.split(':'),0,0);
            //canvasUtility.drawCamps(zoomObjectContext,nativeCamps,$scope.zoomPosition,zoomPixSize);
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
            newPosition[0] = Math.min(Math.max(newPosition[0],0),300 - zoomSize[0]);
            newPosition[1] = Math.min(Math.max(newPosition[1],0),300 - zoomSize[1]);
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
            if($scope.selectedGrid && $scope.selectedGrid[0]) { if($scope.selectedGrid[0].grid != x + ':' + y) { 
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
                        $scope.overPixel.objects = localObjects[grid];
                        if(campList.indexOf(grid) >= 0 && $scope.showObjects) { // If there is a camp here
                            Math.seedrandom(grid);
                            var text = 'Camp ' + 
                                gameUtility.capitalize(Chance($scope.overPixel.x*1000 + $scope.overPixel.y).word());
                            canvasUtility.drawLabel(zoomHighContext,[$scope.overPixel.x-$scope.zoomPosition[0],
                                $scope.overPixel.y-$scope.zoomPosition[1]],text,zoomPixSize);
                        } else if($scope.user.location == grid) {
                            canvasUtility.drawLabel(zoomHighContext,[$scope.overPixel.x-$scope.zoomPosition[0],
                                $scope.overPixel.y-$scope.zoomPosition[1]],'You',zoomPixSize);
                        } else if($scope.user.camp.grid == grid && $scope.showObjects) {
                            canvasUtility.drawLabel(zoomHighContext,[$scope.overPixel.x-$scope.zoomPosition[0],
                                $scope.overPixel.y-$scope.zoomPosition[1]],'Your Camp',zoomPixSize);
                        }
                        $scope.overPixel.type = localTerrain[grid] ? 'land' : 'water';
                        $scope.overPixel.elevation = localTerrain[grid] ? localTerrain[grid] : 0;
                    } else { $scope.overPixel.type = $scope.overPixel.elevation = '-' }
                    var coords = [$scope.overPixel.x-$scope.zoomPosition[0],
                        $scope.overPixel.y-$scope.zoomPosition[1]];
                    var cursorType = $scope.editTerrain ? 'terrain' + $scope.brushSize : 'cursor';
                    canvasUtility.drawSelect(zoomHighContext,coords,zoomPixSize,cursorType);
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
        jQuery(fullHighCanvas).mousewheel(zoomScroll).mousemove(panOnMouseMove)
            .mousedown(panOnMouseDown).mouseup(onMouseUp);
    
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
        
        var updateScoreBoard = function(snap) {
            $scope.scoreBoard= [];
            for(var key in snap.val()) {
                if(!snap.val().hasOwnProperty(key)) { continue; }
                $scope.scoreBoard.push({ nick: snap.val()[key].nick, score: snap.val()[key].score, 
                    online: snap.val()[key].online });
            }
            $timeout(function() { $scope.scoreBoard = sortArrayByProperty($scope.scoreBoard,'score',true); });
        };
        
        // When player location changes, redraw fog, adjust view, redraw player
        var movePlayer = function(snap) {
            if(!snap.val()) { return; }
            // TODO: Check if player is being moved by server when first loading app!
            console.log('moving player to',snap.val());
            if($scope.user.location) { 
                fireRef.child('camps/' + $scope.user.location).off(); } // Stop listening to last grid
            $scope.user.location = snap.val();
            $scope.onPixel = { 
                terrain: localTerrain[snap.val()] ? 'Land' : 'Water', 
                objects: localObjects[snap.val()], elevation: (localTerrain[snap.val()] || 0)
            };
            availableActivities = [];
            $scope.cantLook = false; $scope.lookCount = 0;
            if(campList.indexOf(snap.val()) >= 0) { // If there is a camp here
                if(!$scope.user.hasOwnProperty('visitedCamps')) {
                    $scope.user.visitedCamps = [snap.val()];
                    fireUser.child('visitedCamps').set($scope.user.visitedCamps);
                } else if(jQuery.inArray(snap.val(),$scope.user.visitedCamps) < 0) {
                    $scope.user.visitedCamps.push(snap.val());
                    fireUser.child('visitedCamps').update($scope.user.visitedCamps);
                }
                fireRef.child('camps/' + snap.val()).on('value',function(campSnap) {
                    var resources = gameUtility.resourceList;
                    var campData = gameUtility.expandCamp(snap.val(),localTerrain);
                    campData.deltas = {};
                    for(var resKey in resources) {
                        if(resources.hasOwnProperty(resKey)) {
                            // TODO: Have deltas influence demands
                            campData.deltas[resKey] = 0; // Default 0 delta
                            campData.economy.resources[resKey].invItem =
                                $scope.hasItem({name: resKey, type:'resource'});
                            if(campSnap.val() && campSnap.val().hasOwnProperty('deltas')
                                && campSnap.val().deltas.hasOwnProperty(resKey)) {
                                // Apply delta against supply
                                campData.economy.resources[resKey].supply += campSnap.val().deltas[resKey];
                                campData.deltas[resKey] = campSnap.val().deltas[resKey];
                            }
                        }
                    }
                    $timeout(function(){ $scope.onPixel.camp = campData; });
                });
            } else { // If no camp, create some events/activities
                createActivity(0.7);
            }
            visiblePixels = gameUtility.getVisibility(localTerrain,visiblePixels,snap.val());
            canvasUtility.drawAllTerrain(fullTerrainContext,localTerrain,visiblePixels);
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
            else {
                var moveTime = 5 * (1 + localTerrain[$scope.movePath[0]] / 60);
                playWaitingBar(moveTime); 
            }
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
        
        var changeHunger = function(userID,amount) {
            var user = localUsers.hasOwnProperty(userID) ? localUsers[userID] : $scope.user;
            user.stats.hunger -= amount;
            var neededHunger = 100 - user.stats.hunger;
            if(user.hasOwnProperty('autoEat')) {
                var result = gameUtility.autoEat(user,neededHunger);
                for(var nKey in result.newInv) { // Set new item quantities, delete item if 0
                    if(result.newInv.hasOwnProperty(nKey)) {
                        if(result.newInv[nKey] > 0) {
                            fireRef.child('users/'+userID+'/inventory/'+nKey+'/amount').set(result.newInv[nKey]);
                        } else { fireRef.child('users/'+userID+'/inventory/'+nKey).set(null); }
                    }
                }
            }
            var newHunger = result ? 100 - result.newNeeded : 100 - neededHunger;
            fireRef.child('users/'+userID+'/stats/hunger').set(newHunger);
            
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
            if(snap.val().user != 1 || snap.val().action != 'logIn') {
                console.log(localUsers[snap.val().user].nick,'did',snap.val().action,'at',new Date()); }
            var action = snap.val().action.split(',');
            switch(action[0]) {
                case 'createCamp':
                    var startGrid = gameUtility.createUserCamp(localTerrain,localObjects);
                    fireRef.child('users/'+snap.val().user).update({
                        camp: { grid: startGrid, color: colorUtility.generate('camp').hex }, 
                        location: startGrid, money: 200, stats: { hunger: 100 }
                    }); 
                    fireRef.child('scoreBoard/'+snap.val().user+'/score').set(0);
                    fireRef.child('scoreBoard/'+snap.val().user+'/nick').set(localUsers[snap.val().user].nick);
                    break;
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
                        changeHunger(snap.val().user,3); // Use 3 hunger
                    };
                    moveTimers[snap.val().user] = setTimeout(move, 
                        baseMoveSpeed * (1 + localTerrain[snap.val().path[moveCount]] / 60));
                    break;
                case 'stop': clearTimeout(moveTimers[snap.val().user]); break;
                case 'logIn': fireRef.child('scoreBoard/'+snap.val().user+'/online').set(true); break;
                default: break;
            }
            fireServer.child(snap.name()).set(null); // Delete the action
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
                        // Turn terrain and labels 180 degrees
//                        var terrain180 = gameUtility.terrain180(localTerrain);
//                        fireRef.child('terrain').set(terrain180);
//                        fireRef.child('lastTerrainUpdate').set({time: new Date().getTime(), user: '1'});
//                        var labels180 = gameUtility.terrain180(localLabels);
//                        fireRef.child('labels').set(labels180);
                        prepareTerrain();
                    }
                });
            } else { downloadTerrain(); }
        };
        
       var prepareTerrain = function() {
           $scope.terrainReady = true;
           fireRef.child('campList').once('value',function(snap) {
               if(!snap.val() && userID < 3) { // Generate camps if none on firebase
                   var nativeLocations = gameUtility.genNativeCamps(localTerrain);
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
           });
           if(userID == 2) { // If server
               canvasUtility.drawAllTerrain(fullTerrainContext,localTerrain,false);
               console.log('server ready!');
               fireRef.child('clients/logged').on('child_added', addClient);
               fireRef.child('clients/logged').on('child_changed', changeClient);
               fireRef.child('clients/logged').on('child_removed', removeClient);
               var updateUsers = function(snap) {
                   for(var key in snap.val()) {
                       if(!snap.val().hasOwnProperty(key)) { continue; }
                       if(!localUsers.hasOwnProperty(key)) { continue; }
                       if(localUsers[key].hasOwnProperty('connections') &&
                           !snap.val()[key].hasOwnProperty('connections')) {
                           if(key != 1) { console.log(localUsers[key].nick,'disconnected at',
                               new Date(snap.val()[key].lastOnline)); }
                           fireRef.child('scoreBoard/'+key+'/online').set(null);
                       }
                   }
                   localUsers = snap.val();
               };
               fireRef.child('users').on('value', updateUsers);
               fireServer.on('child_added', onClientAction);
               fireRef.child('status').set('online');
               var loginEmail = localStorage.get('serverLoginEmail');
               var loginPassword = localStorage.get('serverLoginPassword');
               var stayAwake = function() {
                   fireRef.child('status').set('online');
                   fireRef.child('serverTest').set('test');
                   fireRef.child('serverTest').set(null);
                   auth.login('password', {email: loginEmail, password: loginPassword, rememberMe: true});
               };
               setInterval(stayAwake, 3600000); // Re-authenticate every hour
               fireRef.child('status').onDisconnect().set('offline');
               canvasUtility.fillCanvas(fullFogContext,'erase');
               zoomFogCanvas.style.visibility="hidden";
           } else { // If regular user
               fireUser.child('location').on('value', movePlayer);
               fireUser.child('stats/hunger').on('value', function(snap) {
                   $scope.user.stats = $scope.user.stats ? $scope.user.stats : { hunger: 100 };
                   $scope.user.stats.hunger = snap.val();
               });
               var myConnectionsRef = fireUser.child('connections');
               var lastOnlineRef = fireUser.child('lastOnline');
               var connectedRef = new Firebase('https://geographr.firebaseio.com/.info/connected');
               connectedRef.on('value', function(snap) {
                   if (snap.val() === true) {
                       var con = myConnectionsRef.push(true);
                       fireServer.push({ user: userID, action: 'logIn' });
                       con.onDisconnect().remove();
                       lastOnlineRef.onDisconnect().set(Firebase.ServerValue.TIMESTAMP);
                   }
               });
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